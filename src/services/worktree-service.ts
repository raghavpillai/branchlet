import { rmdir } from "node:fs/promises"
import type { TemplateVariables, WorktreeCreateOptions } from "../types/index.js"
import { GitWorktreeError, ValidationError } from "../utils/error-handlers.js"
import { executeGitCommand } from "../utils/git-commands.js"
import { getRepositoryBaseName, getRepositoryRoot, getWorktreePath } from "../utils/path-utils.js"
import { ConfigService } from "./config-service.js"
import { copyFiles, executePostCreateCommands, openTerminal } from "./file-service.js"
import { GitService } from "./git-service.js"

export class WorktreeService {
  private gitService: GitService
  private configService: ConfigService
  private gitRoot?: string | undefined

  constructor(gitRoot?: string | undefined) {
    this.gitRoot = gitRoot
    this.gitService = new GitService(gitRoot)
    this.configService = new ConfigService()
  }

  async initialize(): Promise<void> {
    const isValid = await this.gitService.validateRepository()
    if (!isValid) {
      throw new ValidationError("Current directory is not a git repository")
    }

    await this.configService.loadConfig(this.gitRoot)
  }

  async createWorktree(options: WorktreeCreateOptions): Promise<void> {
    const config = this.configService.getConfig()
    // Use the initialized git root so file copying preserves repo-relative paths
    const gitRoot = this.gitRoot || getRepositoryRoot()

    // Only check if branch exists when creating a new branch
    // If newBranch === sourceBranch, we're using an existing branch
    if (options.newBranch !== options.sourceBranch && await this.gitService.branchExists(options.newBranch)) {
      throw new ValidationError(`Branch '${options.newBranch}' already exists`)
    }

    const worktreePath = getWorktreePath(
      gitRoot,
      options.name,
      config.worktreePathTemplate,
      options.newBranch,
      options.sourceBranch
    )

    if (await this.gitService.worktreeExists(worktreePath)) {
      throw new ValidationError(`Worktree already exists at '${worktreePath}'`)
    }

    await this.gitService.createWorktree({
      ...options,
      basePath: options.basePath,
    })

    if (config.worktreeCopyPatterns.length > 0) {
      await copyFiles(gitRoot, worktreePath, config)
    }

    if (config.postCreateCmd.length > 0) {
      const variables: TemplateVariables = {
        BASE_PATH: getRepositoryBaseName(gitRoot),
        WORKTREE_PATH: worktreePath,
        BRANCH_NAME: options.newBranch,
        SOURCE_BRANCH: options.sourceBranch,
      }

      await executePostCreateCommands(config.postCreateCmd, variables)
    }

    if (config.terminalCommand) {
      await openTerminal(config.terminalCommand, worktreePath)
    }
  }

  async deleteWorktree(
    worktreePath: string,
    force = false
  ): Promise<{ worktreeDeleted: boolean; branchDeleted: boolean; branchName?: string }> {
    const config = this.configService.getConfig()

    let branchName: string | undefined
    let branchDeleted = false

    if (config.deleteBranchWithWorktree) {
      const worktrees = await this.gitService.listWorktrees()
      const targetWorktree = worktrees.find((wt) => wt.path === worktreePath)
      branchName = targetWorktree?.branch
    }

    if (!force) {
      const isClean = await this.gitService.isWorktreeClean(worktreePath)
      if (!isClean) {
        throw new ValidationError("Worktree has uncommitted changes. Use force to delete anyway.")
      }
    }

    try {
      await this.gitService.deleteWorktree({ path: worktreePath, force })
    } catch (error) {
      if (error instanceof GitWorktreeError && error.code === "CORRUPTED_WORKTREE") {
        console.warn(`Attempting manual cleanup for corrupted worktree: ${worktreePath}`)
        await this.manualWorktreeCleanup(worktreePath)
      } else {
        throw error
      }
    }

    if (config.deleteBranchWithWorktree && branchName && branchName !== "detached") {
      try {
        await this.gitService.deleteBranch(branchName, force)
        branchDeleted = true
      } catch (error) {
        console.warn(`Failed to delete branch '${branchName}':`, error)
      }
    }

    return {
      worktreeDeleted: true,
      branchDeleted,
      ...(branchName && { branchName }),
    }
  }

  getGitService(): GitService {
    return this.gitService
  }

  getConfigService(): ConfigService {
    return this.configService
  }

  private async manualWorktreeCleanup(worktreePath: string): Promise<void> {
    try {
      await rmdir(worktreePath, { recursive: true })

      await executeGitCommand(["worktree", "prune"], this.gitRoot)

      console.log(`Successfully cleaned up corrupted worktree: ${worktreePath}`)
    } catch (error) {
      throw new Error(`Manual worktree cleanup failed: ${error}`)
    }
  }
}

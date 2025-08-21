import type { TemplateVariables, WorktreeCreateOptions } from "../types/index.js"
import { ValidationError } from "../utils/error-handlers.js"
import { getRepositoryBaseName, getRepositoryRoot, getWorktreePath } from "../utils/path-utils.js"
import { ConfigService } from "./config-service.js"
import { FileService } from "./file-service.js"
import { GitService } from "./git-service.js"

export class WorktreeService {
  private gitService: GitService
  private configService: ConfigService
  private fileService: FileService

  constructor(gitRoot?: string) {
    this.gitService = new GitService(gitRoot)
    this.configService = new ConfigService()
    this.fileService = new FileService()
  }

  async initialize(): Promise<void> {
    const isValid = await this.gitService.validateRepository()
    if (!isValid) {
      throw new ValidationError("Current directory is not a git repository")
    }

    await this.configService.loadConfig()
  }

  async createWorktree(options: WorktreeCreateOptions): Promise<void> {
    const config = this.configService.getConfig()
    const gitRoot = getRepositoryRoot()

    if (await this.gitService.branchExists(options.newBranch)) {
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
      await this.fileService.copyFiles(gitRoot, worktreePath, config)
    }

    if (config.postCreateCmd) {
      const variables: TemplateVariables = {
        BASE_PATH: getRepositoryBaseName(gitRoot),
        WORKTREE_PATH: worktreePath,
        BRANCH_NAME: options.newBranch,
        SOURCE_BRANCH: options.sourceBranch,
      }

      await this.fileService.executePostCreateCommand(config.postCreateCmd, variables)
    }

    if (config.terminalCommand) {
      await this.fileService.openTerminal(config.terminalCommand, worktreePath)
    }
  }

  async deleteWorktree(worktreePath: string, force = false): Promise<void> {
    if (!force) {
      const isClean = await this.gitService.isWorktreeClean(worktreePath)
      if (!isClean) {
        throw new ValidationError("Worktree has uncommitted changes. Use force to delete anyway.")
      }
    }

    await this.gitService.deleteWorktree({ path: worktreePath, force })
  }

  getGitService(): GitService {
    return this.gitService
  }

  getConfigService(): ConfigService {
    return this.configService
  }

  getFileService(): FileService {
    return this.fileService
  }
}

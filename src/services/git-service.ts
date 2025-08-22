import type {
  GitBranch,
  GitRepository,
  GitWorktree,
  WorktreeCreateOptions,
  WorktreeDeleteOptions,
} from "../types/index.js"
import {
  executeGitCommand,
  getCurrentBranch,
  getDefaultBranch,
  handleGitError,
  isGitRepository,
} from "../utils/index.js"

export class GitService {
  private gitRoot: string

  constructor(gitRoot?: string) {
    this.gitRoot = gitRoot || process.cwd()
  }

  async validateRepository(): Promise<boolean> {
    return await isGitRepository(this.gitRoot)
  }

  async getRepositoryInfo(): Promise<GitRepository> {
    const [currentBranch, defaultBranch, worktrees, branches] = await Promise.all([
      this.getCurrentBranch(),
      this.getDefaultBranch(),
      this.listWorktrees(),
      this.listBranches(),
    ])

    return {
      path: this.gitRoot,
      isGitRepo: true,
      currentBranch: currentBranch || "",
      defaultBranch,
      worktrees,
      branches,
    }
  }

  async getCurrentBranch(): Promise<string | null> {
    return await getCurrentBranch(this.gitRoot)
  }

  async getDefaultBranch(): Promise<string> {
    return await getDefaultBranch(this.gitRoot)
  }

  async listWorktrees(): Promise<GitWorktree[]> {
    const result = await executeGitCommand(["worktree", "list", "--porcelain"], this.gitRoot)

    if (!result.success) {
      throw handleGitError(result.stderr, "list worktrees")
    }

    const worktrees: GitWorktree[] = []
    const lines = result.stdout.split("\n")

    let currentWorktree: Partial<GitWorktree> = {}

    for (const line of lines) {
      if (line.startsWith("worktree ")) {
        if (currentWorktree.path) {
          worktrees.push(currentWorktree as GitWorktree)
        }
        currentWorktree = { path: line.substring(9) }
      } else if (line.startsWith("HEAD ")) {
        currentWorktree.commit = line.substring(5)
      } else if (line.startsWith("branch ")) {
        currentWorktree.branch = line.substring(23)
      } else if (line === "bare") {
        currentWorktree.isMain = true
      } else if (line === "") {
        if (currentWorktree.path) {
          worktrees.push(currentWorktree as GitWorktree)
          currentWorktree = {}
        }
      }
    }

    if (currentWorktree.path) {
      worktrees.push(currentWorktree as GitWorktree)
    }

    if (worktrees.length > 0) {
      const firstWorktree = worktrees[0]
      if (firstWorktree) {
        const gitRoot = this.gitRoot
        if (firstWorktree.path === gitRoot || firstWorktree.path === gitRoot.replace(/\/$/, "")) {
          firstWorktree.isMain = true
        }
      }
    }

    for (const worktree of worktrees) {
      worktree.isClean = await this.isWorktreeClean(worktree.path)
      if (!worktree.branch) {
        worktree.branch = "detached"
      }
    }

    return worktrees
  }

  async listBranches(): Promise<GitBranch[]> {
    const currentBranch = await this.getCurrentBranch()
    const defaultBranch = await this.getDefaultBranch()

    const result = await executeGitCommand(
      [
        "for-each-ref",
        "--sort=-committerdate",
        "--format=%(refname:short)|%(objectname:short)|%(committerdate:iso8601)",
        "refs/heads/",
      ],
      this.gitRoot
    )

    if (!result.success) {
      throw handleGitError(result.stderr, "list branches")
    }

    const branches: GitBranch[] = []
    const lines = result.stdout.split("\n").filter((line) => line.trim())

    for (const line of lines) {
      const [name, commit, dateStr] = line.split("|")
      if (name && commit && dateStr) {
        branches.push({
          name,
          commit,
          lastUsed: new Date(dateStr),
          isCurrent: name === currentBranch,
          isDefault: name === defaultBranch,
          isRemote: false,
        })
      }
    }

    const recentBranches = await this.getRecentBranches()
    const branchOrder = new Map(recentBranches.map((name, index) => [name, index]))

    branches.sort((a, b) => {
      const aOrder = branchOrder.get(a.name) ?? 999
      const bOrder = branchOrder.get(b.name) ?? 999
      return aOrder - bOrder
    })

    return branches
  }

  async getRecentBranches(): Promise<string[]> {
    const result = await executeGitCommand(
      ["reflog", "--pretty=format:%gs", "--grep-reflog=checkout: moving from", "-n", "20"],
      this.gitRoot
    )

    if (!result.success) {
      return []
    }

    const branches: string[] = []
    const seen = new Set<string>()

    for (const line of result.stdout.split("\n")) {
      const match = line.match(/checkout: moving from .+ to (.+)$/)
      if (match?.[1] && !seen.has(match[1])) {
        const branchName = match[1]
        if (!branchName.match(/^[a-f0-9]{40}$/)) {
          branches.push(branchName)
          seen.add(branchName)
        }
      }
    }

    return branches
  }

  async createWorktree(options: WorktreeCreateOptions): Promise<void> {
    const { name, sourceBranch, newBranch, basePath } = options
    const worktreePath = `${basePath}/${name}`

    const args = ["worktree", "add"]

    if (newBranch !== sourceBranch) {
      args.push("-b", newBranch)
    }

    args.push(worktreePath, sourceBranch)

    const result = await executeGitCommand(args, this.gitRoot)

    if (!result.success) {
      throw handleGitError(result.stderr, "create worktree")
    }
  }

  async deleteWorktree(options: WorktreeDeleteOptions): Promise<void> {
    const { path, force } = options

    const args = ["worktree", "remove"]

    if (force) {
      args.push("--force")
    }

    args.push(path)

    const result = await executeGitCommand(args, this.gitRoot)

    if (!result.success) {
      throw handleGitError(result.stderr, "delete worktree")
    }
  }

  async isWorktreeClean(worktreePath: string): Promise<boolean> {
    const statusResult = await executeGitCommand(["status", "--porcelain"], worktreePath)
    return statusResult.success && statusResult.stdout.trim() === ""
  }

  async branchExists(branchName: string): Promise<boolean> {
    const result = await executeGitCommand(
      ["show-ref", "--verify", `refs/heads/${branchName}`],
      this.gitRoot
    )
    return result.success
  }

  async worktreeExists(worktreePath: string): Promise<boolean> {
    const worktrees = await this.listWorktrees()
    return worktrees.some((wt) => wt.path === worktreePath)
  }
}

export interface GitWorktree {
  path: string
  branch: string
  commit: string
  isMain: boolean
  isClean: boolean
  branchStatus?: BranchStatus
}

export interface BranchStatus {
  ahead: number
  behind: number
  upstreamBranch: string | null
}

export interface GitBranch {
  name: string
  commit: string
  lastUsed?: Date
  isCurrent: boolean
  isDefault: boolean
  isRemote: boolean
}

export interface GitRepository {
  path: string
  isGitRepo: boolean
  currentBranch: string
  defaultBranch: string
  worktrees: GitWorktree[]
  branches: GitBranch[]
}

export interface GitCommandResult {
  success: boolean
  stdout: string
  stderr: string
  exitCode: number
}

export interface WorktreeCreateOptions {
  name: string
  sourceBranch: string
  newBranch: string
  basePath: string
}

export interface WorktreeDeleteOptions {
  path: string
  force: boolean
}

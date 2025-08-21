export class GitWorktreeError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly gitOutput?: string
  ) {
    super(message)
    this.name = "GitWorktreeError"
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message)
    this.name = "ValidationError"
  }
}

export class ConfigError extends Error {
  constructor(
    message: string,
    public readonly configPath?: string
  ) {
    super(message)
    this.name = "ConfigError"
  }
}

export function handleGitError(stderr: string, operation: string): GitWorktreeError {
  if (stderr.includes("already exists")) {
    return new GitWorktreeError("Worktree or branch already exists", "ALREADY_EXISTS", stderr)
  }

  if (stderr.includes("not a valid object name")) {
    return new GitWorktreeError("Invalid branch or commit reference", "INVALID_REF", stderr)
  }

  if (stderr.includes("is already checked out")) {
    return new GitWorktreeError(
      "Branch is already checked out in another worktree",
      "BRANCH_CHECKED_OUT",
      stderr
    )
  }

  if (stderr.includes("No such file or directory")) {
    return new GitWorktreeError("Path does not exist", "PATH_NOT_FOUND", stderr)
  }

  if (stderr.includes("not a git repository")) {
    return new GitWorktreeError("Not a git repository", "NOT_GIT_REPO", stderr)
  }

  return new GitWorktreeError(
    `Git ${operation} operation failed: ${stderr}`,
    "GIT_OPERATION_FAILED",
    stderr
  )
}

export function getUserFriendlyErrorMessage(error: Error): string {
  if (error instanceof GitWorktreeError) {
    switch (error.code) {
      case "ALREADY_EXISTS":
        return "A worktree or branch with this name already exists."
      case "INVALID_REF":
        return "Invalid branch name or commit reference."
      case "BRANCH_CHECKED_OUT":
        return "This branch is already checked out in another worktree."
      case "PATH_NOT_FOUND":
        return "The specified path does not exist."
      case "NOT_GIT_REPO":
        return "Current directory is not a git repository."
      default:
        return `Git operation failed: ${error.message}`
    }
  }

  if (error instanceof ValidationError) {
    return `Validation error: ${error.message}`
  }

  if (error instanceof ConfigError) {
    return `Configuration error: ${error.message}`
  }

  return `Unexpected error: ${error.message}`
}

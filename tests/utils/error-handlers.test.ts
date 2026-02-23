import { describe, expect, test } from "bun:test"
import {
  ConfigError,
  GitWorktreeError,
  getUserFriendlyErrorMessage,
  handleGitError,
  ValidationError,
} from "../../src/utils/error-handlers.js"

describe("error-handlers", () => {
  describe("ConfigError", () => {
    test("should create ConfigError with message", () => {
      const error = new ConfigError("Invalid configuration")

      expect(error.name).toBe("ConfigError")
      expect(error.message).toBe("Invalid configuration")
      expect(error.configPath).toBeUndefined()
      expect(error instanceof Error).toBe(true)
      expect(error instanceof ConfigError).toBe(true)
    })

    test("should create ConfigError with message and config path", () => {
      const configPath = "/path/to/config.json"
      const error = new ConfigError("Invalid configuration", configPath)

      expect(error.name).toBe("ConfigError")
      expect(error.message).toBe("Invalid configuration")
      expect(error.configPath).toBe(configPath)
    })
  })

  describe("ValidationError", () => {
    test("should create ValidationError with message", () => {
      const error = new ValidationError("Validation failed")

      expect(error.name).toBe("ValidationError")
      expect(error.message).toBe("Validation failed")
      expect(error instanceof Error).toBe(true)
      expect(error instanceof ValidationError).toBe(true)
    })
  })

  describe("GitWorktreeError", () => {
    test("should create GitWorktreeError with message and code", () => {
      const error = new GitWorktreeError("Git operation failed", "WORKTREE_EXISTS")

      expect(error.name).toBe("GitWorktreeError")
      expect(error.message).toBe("Git operation failed")
      expect(error.code).toBe("WORKTREE_EXISTS")
      expect(error.stderr).toBeUndefined()
      expect(error instanceof Error).toBe(true)
      expect(error instanceof GitWorktreeError).toBe(true)
    })

    test("should create GitWorktreeError with message, code, and stderr", () => {
      const stderr = "fatal: worktree already exists"
      const error = new GitWorktreeError("Git operation failed", "WORKTREE_EXISTS", stderr)

      expect(error.name).toBe("GitWorktreeError")
      expect(error.message).toBe("Git operation failed")
      expect(error.code).toBe("WORKTREE_EXISTS")
      expect(error.gitOutput).toBe(stderr)
    })
  })

  describe("handleGitError", () => {
    test("should detect worktree already exists error", () => {
      const stderr = "fatal: 'test-branch' is already checked out at '/path/to/worktree'"

      const error = handleGitError(stderr, "create worktree")

      expect(error).toBeInstanceOf(GitWorktreeError)
      expect((error as GitWorktreeError).code).toBe("BRANCH_CHECKED_OUT")
      expect(error.message).toContain("already checked out")
    })

    test("should detect branch already exists error", () => {
      const stderr = "fatal: A branch named 'feature-branch' already exists."

      const error = handleGitError(stderr, "create worktree")

      expect(error).toBeInstanceOf(GitWorktreeError)
      expect((error as GitWorktreeError).code).toBe("ALREADY_EXISTS")
      expect(error.message).toContain("already exists")
    })

    test("should detect uncommitted changes error with 'modified or untracked files'", () => {
      const stderr =
        "fatal: worktree contains modified or untracked files, use --force to delete anyway"

      const error = handleGitError(stderr, "delete worktree")

      expect(error).toBeInstanceOf(GitWorktreeError)
      expect((error as GitWorktreeError).code).toBe("UNCOMMITTED_CHANGES")
      expect(error.message).toContain("uncommitted changes")
    })

    test("should detect uncommitted changes error with 'is dirty'", () => {
      const stderr = "fatal: worktree is dirty"

      const error = handleGitError(stderr, "delete worktree")

      expect(error).toBeInstanceOf(GitWorktreeError)
      expect((error as GitWorktreeError).code).toBe("UNCOMMITTED_CHANGES")
      expect(error.message).toContain("uncommitted changes")
    })

    test("should detect uncommitted changes error with 'cannot be removed' and 'is dirty'", () => {
      const stderr = "fatal: '/path/to/worktree' cannot be removed because it is dirty"

      const error = handleGitError(stderr, "delete worktree")

      expect(error).toBeInstanceOf(GitWorktreeError)
      expect((error as GitWorktreeError).code).toBe("UNCOMMITTED_CHANGES")
      expect(error.message).toContain("uncommitted changes")
    })

    test("should detect branch not found error", () => {
      const stderr = "fatal: not a valid object name: nonexistent-branch"

      const error = handleGitError(stderr, "create worktree")

      expect(error).toBeInstanceOf(GitWorktreeError)
      expect((error as GitWorktreeError).code).toBe("INVALID_REF")
      expect(error.message).toContain("Invalid branch")
    })

    test("should detect path already exists error", () => {
      const stderr = "fatal: '/path/to/existing' already exists and is not an empty directory"

      const error = handleGitError(stderr, "create worktree")

      expect(error).toBeInstanceOf(GitWorktreeError)
      expect((error as GitWorktreeError).code).toBe("ALREADY_EXISTS")
      expect(error.message).toContain("already exists")
    })

    test("should detect worktree not found error", () => {
      const stderr = "fatal: No such file or directory: '/path/to/nonexistent'"

      const error = handleGitError(stderr, "delete worktree")

      expect(error).toBeInstanceOf(GitWorktreeError)
      expect((error as GitWorktreeError).code).toBe("PATH_NOT_FOUND")
      expect(error.message).toContain("does not exist")
    })

    test("should detect corrupted worktree error", () => {
      const stderr =
        "fatal: validation failed, cannot remove working tree: '/private/tmp/test/.git' is not a .git file, error code 7"

      const error = handleGitError(stderr, "delete worktree")

      expect(error).toBeInstanceOf(GitWorktreeError)
      expect((error as GitWorktreeError).code).toBe("CORRUPTED_WORKTREE")
      expect(error.message).toContain("corrupted")
    })

    test("should detect not in git repository error", () => {
      const stderr = "fatal: not a git repository (or any of the parent directories): .git"

      const error = handleGitError(stderr, "list worktrees")

      expect(error).toBeInstanceOf(GitWorktreeError)
      expect((error as GitWorktreeError).code).toBe("NOT_GIT_REPO")
      expect(error.message).toContain("Not a git repository")
    })

    test("should return generic error for unrecognized stderr", () => {
      const stderr = "some unknown git error"
      const operation = "unknown operation"

      const error = handleGitError(stderr, operation)

      expect(error).toBeInstanceOf(GitWorktreeError)
      expect((error as GitWorktreeError).code).toBe("GIT_OPERATION_FAILED")
      expect(error.message).toBe(`Git ${operation} operation failed: ${stderr}`)
    })

    test("should handle empty stderr", () => {
      const error = handleGitError("", "test operation")

      expect(error).toBeInstanceOf(GitWorktreeError)
      expect((error as GitWorktreeError).code).toBe("GIT_OPERATION_FAILED")
      expect(error.message).toBe("Git test operation operation failed: ")
    })

    test("should preserve original stderr in error object", () => {
      const stderr = "original error message"
      const error = handleGitError(stderr, "test")

      expect((error as GitWorktreeError).gitOutput).toBe(stderr)
    })

    test("should handle case-insensitive matching", () => {
      const stderr = "Fatal: something already exists"

      const error = handleGitError(stderr, "create")

      expect(error).toBeInstanceOf(GitWorktreeError)
      expect((error as GitWorktreeError).code).toBe("ALREADY_EXISTS")
    })
  })

  describe("getUserFriendlyErrorMessage", () => {
    test("should return friendly message for GitWorktreeError with ALREADY_EXISTS code", () => {
      const error = new GitWorktreeError("Some error", "ALREADY_EXISTS")
      const result = getUserFriendlyErrorMessage(error)
      expect(result).toBe("A worktree or branch with this name already exists.")
    })

    test("should return friendly message for GitWorktreeError with INVALID_REF code", () => {
      const error = new GitWorktreeError("Some error", "INVALID_REF")
      const result = getUserFriendlyErrorMessage(error)
      expect(result).toBe("Invalid branch name or commit reference.")
    })

    test("should return friendly message for GitWorktreeError with BRANCH_CHECKED_OUT code", () => {
      const error = new GitWorktreeError("Some error", "BRANCH_CHECKED_OUT")
      const result = getUserFriendlyErrorMessage(error)
      expect(result).toBe("This branch is already checked out in another worktree.")
    })

    test("should return friendly message for GitWorktreeError with PATH_NOT_FOUND code", () => {
      const error = new GitWorktreeError("Some error", "PATH_NOT_FOUND")
      const result = getUserFriendlyErrorMessage(error)
      expect(result).toBe("The specified path does not exist.")
    })

    test("should return friendly message for GitWorktreeError with NOT_GIT_REPO code", () => {
      const error = new GitWorktreeError("Some error", "NOT_GIT_REPO")
      const result = getUserFriendlyErrorMessage(error)
      expect(result).toBe("Current directory is not a git repository.")
    })

    test("should return friendly message for GitWorktreeError with UNCOMMITTED_CHANGES code", () => {
      const error = new GitWorktreeError("Some error", "UNCOMMITTED_CHANGES")
      const result = getUserFriendlyErrorMessage(error)
      expect(result).toBe("Worktree has uncommitted changes. Use force to delete anyway.")
    })

    test("should return friendly message for GitWorktreeError with CORRUPTED_WORKTREE code", () => {
      const error = new GitWorktreeError("Some error", "CORRUPTED_WORKTREE")
      const result = getUserFriendlyErrorMessage(error)
      expect(result).toBe(
        "Worktree is corrupted. This can be fixed by manually deleting the worktree directory and running 'git worktree prune'."
      )
    })

    test("should return default message for GitWorktreeError with unknown code", () => {
      const error = new GitWorktreeError("Custom error message", "UNKNOWN_CODE")
      const result = getUserFriendlyErrorMessage(error)
      expect(result).toBe("Git operation failed: Custom error message")
    })

    test("should return friendly message for ValidationError", () => {
      const error = new ValidationError("Invalid input provided")
      const result = getUserFriendlyErrorMessage(error)
      expect(result).toBe("Validation error: Invalid input provided")
    })

    test("should return friendly message for ConfigError", () => {
      const error = new ConfigError("Config file not found")
      const result = getUserFriendlyErrorMessage(error)
      expect(result).toBe("Configuration error: Config file not found")
    })

    test("should return generic message for unknown error types", () => {
      const error = new Error("Some unexpected error")
      const result = getUserFriendlyErrorMessage(error)
      expect(result).toBe("Unexpected error: Some unexpected error")
    })

    test("should handle error without message", () => {
      const error = new Error()
      const result = getUserFriendlyErrorMessage(error)
      expect(result).toBe("Unexpected error: ")
    })
  })
})

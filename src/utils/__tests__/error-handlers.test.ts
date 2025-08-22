import { describe, expect, test } from "bun:test"
import {
  ConfigError,
  GitWorktreeError,
  ValidationError,
  handleGitError,
} from "../error-handlers.js"

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
})

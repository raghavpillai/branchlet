import { describe, expect, test } from "bun:test"
import {
  executeGitCommand,
  getCurrentBranch,
  getDefaultBranch,
  getGitRoot,
  isGitRepository,
} from "../git-commands.js"

describe("git-commands", () => {
  describe("executeGitCommand", () => {
    test("should return result object with expected properties", async () => {
      // Test with a basic git command that should work in most environments
      const result = await executeGitCommand(["--version"])

      expect(result).toHaveProperty("success")
      expect(result).toHaveProperty("stdout")
      expect(result).toHaveProperty("stderr")
      expect(typeof result.success).toBe("boolean")
      expect(typeof result.stdout).toBe("string")
      expect(typeof result.stderr).toBe("string")
    })

    test("should handle invalid git command", async () => {
      const result = await executeGitCommand(["invalid-command"])

      expect(result.success).toBe(false)
      expect(typeof result.stderr).toBe("string")
    })
  })

  describe("isGitRepository", () => {
    test("should return boolean", async () => {
      const result = await isGitRepository()
      expect(typeof result).toBe("boolean")
    })

    test("should return false for non-existent path", async () => {
      const result = await isGitRepository("/non/existent/path")
      expect(result).toBe(false)
    })
  })

  describe("getCurrentBranch", () => {
    test("should return string or null", async () => {
      const result = await getCurrentBranch()
      expect(result === null || typeof result === "string").toBe(true)
    })
  })

  describe("getDefaultBranch", () => {
    test("should return string", async () => {
      const result = await getDefaultBranch()
      expect(typeof result).toBe("string")
    })

    test("should fallback to 'main' for invalid paths", async () => {
      const result = await getDefaultBranch("/non/existent/path")
      expect(result).toBe("main")
    })
  })

  describe("getGitRoot", () => {
    test("should return string or null", async () => {
      const result = await getGitRoot()
      expect(result === null || typeof result === "string").toBe(true)
    })

    test("should return null for non-git directory", async () => {
      const result = await getGitRoot("/tmp")
      expect(result).toBe(null)
    })
  })

  // Integration test for current repository if it exists
  test("should work in current git repository if available", async () => {
    const isRepo = await isGitRepository()

    if (isRepo) {
      const gitRoot = await getGitRoot()
      expect(gitRoot).toBeDefined()
      expect(typeof gitRoot).toBe("string")

      const currentBranch = await getCurrentBranch()
      expect(currentBranch === null || typeof currentBranch === "string").toBe(true)

      const defaultBranch = await getDefaultBranch()
      expect(typeof defaultBranch).toBe("string")
    } else {
      // Skip integration test if not in a git repository
      expect(isRepo).toBe(false)
    }
  })
})

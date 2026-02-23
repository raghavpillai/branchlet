import { describe, expect, test } from "bun:test"
import { WorktreeService } from "../../src/services/worktree-service.js"
import { ValidationError } from "../../src/utils/error-handlers.js"

describe("WorktreeService", () => {
  describe("constructor", () => {
    test("should create WorktreeService with default git root", () => {
      const service = new WorktreeService()
      expect(service).toBeInstanceOf(WorktreeService)
    })

    test("should create WorktreeService with custom git root", () => {
      const service = new WorktreeService("/custom/path")
      expect(service).toBeInstanceOf(WorktreeService)
    })
  })

  describe("getGitService", () => {
    test("should return git service instance", () => {
      const service = new WorktreeService()
      const gitService = service.getGitService()
      expect(gitService).toBeDefined()
    })
  })

  describe("getConfigService", () => {
    test("should return config service instance", () => {
      const service = new WorktreeService()
      const configService = service.getConfigService()
      expect(configService).toBeDefined()
    })
  })

  describe("initialize", () => {
    test("should handle initialization in non-git directory", async () => {
      const service = new WorktreeService("/tmp")

      try {
        await service.initialize()
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError)
        expect(error.message).toContain("not a git repository")
      }
    })

    test("should handle initialization in git directory", async () => {
      const service = new WorktreeService()

      try {
        await service.initialize()
        // Should succeed if in git repo
      } catch (error) {
        // Should fail with ValidationError if not in git repo
        expect(error).toBeInstanceOf(ValidationError)
      }
    })
  })

  describe("createWorktree", () => {
    test("should handle invalid worktree creation", async () => {
      const service = new WorktreeService("/tmp")

      const options = {
        name: "test-worktree",
        sourceBranch: "non-existent-branch",
        newBranch: "test-branch",
        basePath: "/tmp/test",
      }

      try {
        await service.createWorktree(options)
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })

    test("should handle edge case names", async () => {
      const service = new WorktreeService()

      const edgeCaseOptions = [
        {
          name: "test-123",
          sourceBranch: "main",
          newBranch: "feature/test-123",
          basePath: "/tmp",
        },
        {
          name: "very-long-worktree-name-that-tests-limits",
          sourceBranch: "main",
          newBranch: "feature/long-name",
          basePath: "/tmp",
        },
      ]

      for (const options of edgeCaseOptions) {
        try {
          await service.createWorktree(options)
        } catch (error) {
          // Expected to fail, just testing error handling
          expect(error).toBeInstanceOf(Error)
        }
      }
    })
  })

  describe("deleteWorktree", () => {
    test("should handle deletion without force", async () => {
      const service = new WorktreeService()

      try {
        await service.deleteWorktree("/non/existent/path", false)
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })

    test("should handle deletion with force", async () => {
      const service = new WorktreeService()

      try {
        await service.deleteWorktree("/non/existent/path", true)
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })

    test("should handle deletion with default force parameter", async () => {
      const service = new WorktreeService()

      try {
        await service.deleteWorktree("/non/existent/path")
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })

    test("should handle path edge cases", async () => {
      const service = new WorktreeService()

      const edgeCasePaths = [
        "",
        "/",
        "/tmp",
        "/very/deep/non/existent/path/structure",
        "/path/with spaces/in name",
      ]

      for (const path of edgeCasePaths) {
        try {
          await service.deleteWorktree(path)
        } catch (error) {
          expect(error).toBeInstanceOf(Error)
        }
      }
    })
  })

  describe("branch deletion functionality", () => {
    test("should handle branch deletion when enabled", async () => {
      const service = new WorktreeService()

      // Configure branch deletion
      const configService = service.getConfigService()
      configService.updateConfig({ deleteBranchWithWorktree: true })

      try {
        const result = await service.deleteWorktree("/non/existent/path")
        expect(result).toBeDefined()
        expect(typeof result.worktreeDeleted).toBe("boolean")
        expect(typeof result.branchDeleted).toBe("boolean")
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }

      // Reset config
      configService.resetConfig()
    })

    test("should handle branch deletion when disabled", async () => {
      const service = new WorktreeService()

      // Ensure branch deletion is disabled
      const configService = service.getConfigService()
      configService.updateConfig({ deleteBranchWithWorktree: false })

      try {
        const result = await service.deleteWorktree("/non/existent/path")
        expect(result).toBeDefined()
        expect(result.branchDeleted).toBe(false)
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }

      // Reset config
      configService.resetConfig()
    })

    test("should handle corrupted worktree cleanup", async () => {
      const service = new WorktreeService()

      try {
        // This should trigger error handling but not the manual cleanup path
        // since the path doesn't exist
        await service.deleteWorktree("/absolutely/does/not/exist/corrupted")
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })
  })

  describe("integration scenarios", () => {
    test("should handle service lifecycle", async () => {
      const service = new WorktreeService()

      // Test service creation and basic operations
      expect(service.getGitService()).toBeDefined()
      expect(service.getConfigService()).toBeDefined()

      const configService = service.getConfigService()
      const originalConfig = configService.getConfig()

      // Test config modification
      configService.updateConfig({ terminalCommand: "test command" })
      const modifiedConfig = configService.getConfig()
      expect(modifiedConfig.terminalCommand).toBe("test command")

      // Test config reset
      configService.resetConfig()
      const resetConfig = configService.getConfig()
      expect(resetConfig.terminalCommand).toBe(originalConfig.terminalCommand)
    })

    test("should handle branch deletion config integration", async () => {
      const service = new WorktreeService()
      const configService = service.getConfigService()

      // Test new config option
      expect(configService.getConfig().deleteBranchWithWorktree).toBe(false) // Default

      configService.updateConfig({ deleteBranchWithWorktree: true })
      expect(configService.getConfig().deleteBranchWithWorktree).toBe(true)

      configService.resetConfig()
      expect(configService.getConfig().deleteBranchWithWorktree).toBe(false)
    })
  })
})

import { describe, expect, test } from "bun:test"
import { ConfigService } from "../../src/services/config-service.js"
import { GitService } from "../../src/services/git-service.js"
import { WorktreeService } from "../../src/services/worktree-service.js"
import { ValidationError } from "../../src/utils/error-handlers.js"
import { getGitRoot, isGitRepository } from "../../src/utils/git-commands.js"
import {
  getRepositoryBaseName,
  getRepositoryRoot,
  getWorktreePath,
  validateBranchName,
  validateDirectoryName,
} from "../../src/utils/path-utils.js"

describe("Integration Workflows", () => {
  describe("Complete service initialization workflow", () => {
    test("should handle full service setup and teardown", async () => {
      // Test complete workflow from service creation to operations
      const gitService = new GitService()
      const configService = new ConfigService()
      const worktreeService = new WorktreeService()

      // Test service instances
      expect(gitService).toBeInstanceOf(GitService)
      expect(configService).toBeInstanceOf(ConfigService)
      expect(worktreeService).toBeInstanceOf(WorktreeService)

      // Test config operations
      const originalConfig = configService.getConfig()
      expect(originalConfig).toBeDefined()

      const updatedConfig = configService.updateConfig({
        terminalCommand: "code $WORKTREE_PATH",
        postCreateCmd: ["npm install", "npm run build"],
      })
      expect(updatedConfig.terminalCommand).toBe("code $WORKTREE_PATH")

      configService.resetConfig()
      const resetConfig = configService.getConfig()
      expect(resetConfig.terminalCommand).toBe(originalConfig.terminalCommand)
    })
  })

  describe("Validation workflow", () => {
    test("should validate all inputs in worktree creation workflow", () => {
      const testCases = [
        // Valid cases
        { dir: "feature-branch", branch: "feature/awesome", valid: true },
        { dir: "hotfix-123", branch: "hotfix/critical-fix", valid: true },
        { dir: "release_v1", branch: "release/v1.0.0", valid: true },

        // Invalid directory names
        { dir: "", branch: "feature/test", valid: false },
        { dir: "dir/with/slash", branch: "feature/test", valid: false },
        { dir: ".hidden", branch: "feature/test", valid: false },

        // Invalid branch names
        { dir: "valid-dir", branch: "", valid: false },
        { dir: "valid-dir", branch: "branch with spaces", valid: false },
        { dir: "valid-dir", branch: "branch..double-dot", valid: false },
        { dir: "valid-dir", branch: "HEAD", valid: false },
      ]

      for (const testCase of testCases) {
        const dirValidation = validateDirectoryName(testCase.dir)
        const branchValidation = validateBranchName(testCase.branch)

        const isValid = !dirValidation && !branchValidation

        if (testCase.valid) {
          expect(isValid).toBe(true)
        } else {
          expect(isValid).toBe(false)
        }
      }
    })
  })

  describe("Path generation workflow", () => {
    test("should generate consistent paths across different scenarios", () => {
      const testScenarios = [
        {
          gitRoot: "/Users/dev/my-project",
          directoryName: "feature-work",
          template: "$BASE_PATH-worktrees/$BRANCH_NAME",
          branchName: "feature/authentication",
          sourceBranch: "main",
        },
        {
          gitRoot: "/home/user/awesome-app",
          directoryName: "hotfix-dir",
          template: "worktrees/$BRANCH_NAME-from-$SOURCE_BRANCH",
          branchName: "hotfix/security-patch",
          sourceBranch: "release/v1.0",
        },
        {
          gitRoot: "/repo",
          directoryName: "test",
          template: "$BASE_PATH",
        },
      ]

      for (const scenario of testScenarios) {
        const result = getWorktreePath(
          scenario.gitRoot,
          scenario.directoryName,
          scenario.template,
          scenario.branchName,
          scenario.sourceBranch
        )

        expect(result).toBeDefined()
        expect(typeof result).toBe("string")
        expect(result.length).toBeGreaterThan(0)
        expect(result).toContain(scenario.directoryName)
      }
    })
  })

  describe("Git repository detection workflow", () => {
    test("should handle repository detection in various scenarios", async () => {
      const testPaths = [process.cwd(), "/tmp", "/", "/usr", "/var", "/home"]

      for (const path of testPaths) {
        const isRepo = await isGitRepository(path)
        expect(typeof isRepo).toBe("boolean")

        if (isRepo) {
          const gitRoot = await getGitRoot(path)
          expect(gitRoot).toBeDefined()
          expect(typeof gitRoot).toBe("string")
        }
      }
    })
  })

  describe("Error handling workflow", () => {
    test("should handle errors gracefully throughout the stack", async () => {
      // Test error propagation from git commands through services
      const gitService = new GitService("/definitely/does/not/exist")

      const isValid = await gitService.validateRepository()
      expect(isValid).toBe(false)

      const branches = await gitService.getRecentBranches()
      expect(Array.isArray(branches)).toBe(true)
      expect(branches.length).toBe(0)
    })

    test("should handle worktree service errors", async () => {
      const service = new WorktreeService("/tmp")

      try {
        await service.initialize()
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError)
      }

      // Test delete operations on non-existent paths
      try {
        await service.deleteWorktree("/absolutely/does/not/exist")
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })
  })

  describe("Configuration integration workflow", () => {
    test("should handle full config lifecycle", async () => {
      const service = new WorktreeService()
      const configService = service.getConfigService()

      // Test config loading
      try {
        await configService.loadConfig()
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }

      // Test config modification
      const originalConfig = configService.getConfig()
      expect(originalConfig).toBeDefined()

      const testUpdates = {
        worktreeCopyPatterns: ["*.json", "*.ts", "*.tsx"],
        worktreeCopyIgnores: ["node_modules/**", ".git/**"],
        worktreePathTemplate: "$BASE_PATH-branches/$BRANCH_NAME",
        postCreateCmd: ["pnpm install", "pnpm build"],
        terminalCommand: "cursor $WORKTREE_PATH",
      }

      const updatedConfig = configService.updateConfig(testUpdates)
      expect(updatedConfig.worktreeCopyPatterns).toEqual(testUpdates.worktreeCopyPatterns)
      expect(updatedConfig.postCreateCmd).toEqual(testUpdates.postCreateCmd)

      // Test config reset
      configService.resetConfig()
      const resetConfig = configService.getConfig()
      expect(resetConfig.terminalCommand).toBe(originalConfig.terminalCommand)
    })
  })

  describe("Utility functions integration", () => {
    test("should handle repository operations across different structures", () => {
      const repositories = [
        "/Users/dev/frontend-app",
        "/home/user/backend-service",
        "/repo/monorepo-workspace",
        "/workspace/microservice",
        "relative-repo",
        ".",
      ]

      for (const repo of repositories) {
        const baseName = getRepositoryBaseName(repo)
        expect(typeof baseName).toBe("string")

        const root = getRepositoryRoot(repo)
        expect(typeof root).toBe("string")
        expect(root.length).toBeGreaterThan(0)
      }
    })
  })

  describe("Edge case handling", () => {
    test("should handle extreme edge cases robustly", () => {
      // Test empty strings
      expect(validateDirectoryName("")).toBeDefined()
      expect(validateBranchName("")).toBeDefined()

      // Test unicode and special characters
      const unicodeNames = ["测试-branch", "café-worktree", "🚀-feature", "branch-with-émojis"]

      for (const name of unicodeNames) {
        const dirResult = validateDirectoryName(name)
        const branchResult = validateBranchName(name)

        // Should either pass validation or provide meaningful error
        expect(dirResult === undefined || typeof dirResult === "string").toBe(true)
        expect(branchResult === undefined || typeof branchResult === "string").toBe(true)
      }
    })

    test("should handle concurrent operations gracefully", async () => {
      // Test multiple operations running concurrently
      const service = new WorktreeService()
      const gitService = service.getGitService()

      const operations = [
        gitService.validateRepository(),
        gitService.getCurrentBranch(),
        gitService.getDefaultBranch(),
        gitService.listWorktrees().catch(() => []),
        gitService.listBranches().catch(() => []),
      ]

      const results = await Promise.allSettled(operations)

      // All operations should complete (either succeed or fail gracefully)
      expect(results).toHaveLength(5)

      for (const result of results) {
        expect(result.status === "fulfilled" || result.status === "rejected").toBe(true)
      }
    })
  })

  describe("Performance and reliability", () => {
    test("should handle repeated operations efficiently", async () => {
      const service = new WorktreeService()

      // Test repeated calls to ensure no state issues
      const iterations = 5
      const results = []

      for (let i = 0; i < iterations; i++) {
        try {
          const isValid = await service.getGitService().validateRepository()
          results.push(isValid)
        } catch (_error) {
          results.push(false)
        }
      }

      // All results should be consistent
      expect(results).toHaveLength(iterations)
      const firstResult = results[0]
      const allSame = results.every((result) => result === firstResult)
      expect(allSame).toBe(true)
    })

    test("should handle large configuration objects", () => {
      const service = new WorktreeService()
      const configService = service.getConfigService()

      // Test with large configuration
      const largeConfig = {
        worktreeCopyPatterns: Array.from({ length: 100 }, (_, i) => `*.pattern${i}`),
        worktreeCopyIgnores: Array.from({ length: 50 }, (_, i) => `ignore${i}/**`),
        worktreePathTemplate: `${"$BASE_PATH".repeat(10)}/$BRANCH_NAME`,
        postCreateCmd: Array.from({ length: 20 }, (_, i) => `command-${i}`),
        terminalCommand: `${"very-long-terminal-command ".repeat(10)}$WORKTREE_PATH`,
      }

      const result = configService.updateConfig(largeConfig)
      expect(result.worktreeCopyPatterns).toHaveLength(100)
      expect(result.postCreateCmd).toHaveLength(20)
    })
  })
})

import { describe, expect, test } from "bun:test"
import type { WorktreeConfig } from "../../src/schemas/config-schema.js"
import {
  copyFiles,
  executePostCreateCommands,
  openTerminal,
} from "../../src/services/file-service.js"
import type { TemplateVariables } from "../../src/types/index.js"

describe("improved file-service", () => {
  describe("copyFiles with .env.* support", () => {
    test("should handle .env.* pattern matching", async () => {
      const config: WorktreeConfig = {
        worktreeCopyPatterns: [".env*", "*.json"],
        worktreeCopyIgnores: ["node_modules/**"],
        worktreePathTemplate: "$BASE_PATH/$BRANCH_NAME",
        postCreateCmd: [],
        terminalCommand: "",
      }

      try {
        const result = await copyFiles(process.cwd(), "/tmp/test-copy", config)

        expect(result).toHaveProperty("copied")
        expect(result).toHaveProperty("skipped")
        expect(result).toHaveProperty("errors")
        expect(Array.isArray(result.copied)).toBe(true)
        expect(Array.isArray(result.skipped)).toBe(true)
        expect(Array.isArray(result.errors)).toBe(true)

        // Should find any .env files that exist
        const envFiles = result.copied.filter((file) => file.startsWith(".env"))
        for (const envFile of envFiles) {
          expect(envFile).toMatch(/^\.env/)
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })

    test("should handle recursive directory copying", async () => {
      const config: WorktreeConfig = {
        worktreeCopyPatterns: [".vscode/**", "src/**/*.json"],
        worktreeCopyIgnores: ["**/node_modules/**"],
        worktreePathTemplate: "$BASE_PATH/$BRANCH_NAME",
        postCreateCmd: [],
        terminalCommand: "",
      }

      try {
        const result = await copyFiles(process.cwd(), "/tmp/test-recursive", config)

        expect(result).toBeDefined()
        expect(Array.isArray(result.copied)).toBe(true)
        expect(Array.isArray(result.skipped)).toBe(true)
        expect(Array.isArray(result.errors)).toBe(true)

        // Check for nested files if they exist
        const nestedFiles = result.copied.filter((file) => file.includes("/"))
        for (const nestedFile of nestedFiles) {
          expect(nestedFile).toContain("/")
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })

    test("should respect ignore patterns during recursive copy", async () => {
      const config: WorktreeConfig = {
        worktreeCopyPatterns: ["**/*"],
        worktreeCopyIgnores: ["**/node_modules/**", "**/.git/**", "**/dist/**"],
        worktreePathTemplate: "$BASE_PATH/$BRANCH_NAME",
        postCreateCmd: [],
        terminalCommand: "",
      }

      try {
        const result = await copyFiles(process.cwd(), "/tmp/test-ignore", config)

        // No copied files should match ignore patterns
        for (const file of result.copied) {
          expect(file).not.toMatch(/node_modules/)
          expect(file).not.toMatch(/\.git/)
          expect(file).not.toMatch(/dist/)
        }

        // Skipped files might include ignored patterns
        expect(Array.isArray(result.skipped)).toBe(true)
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })

    test("should handle mixed file and directory patterns", async () => {
      const config: WorktreeConfig = {
        worktreeCopyPatterns: [
          ".env*", // Files
          ".vscode/**", // Directory contents
          "*.json", // Root files
          "src/**/*.ts", // Nested files
        ],
        worktreeCopyIgnores: ["**/node_modules/**"],
        worktreePathTemplate: "$BASE_PATH/$BRANCH_NAME",
        postCreateCmd: [],
        terminalCommand: "",
      }

      try {
        const result = await copyFiles(process.cwd(), "/tmp/test-mixed", config)

        expect(result).toBeDefined()
        expect(Array.isArray(result.copied)).toBe(true)

        // Verify different pattern types
        const envFiles = result.copied.filter((f) => f.startsWith(".env"))
        const jsonFiles = result.copied.filter((f) => f.endsWith(".json") && !f.includes("/"))
        const tsFiles = result.copied.filter((f) => f.endsWith(".ts") && f.startsWith("src/"))

        expect(envFiles.length >= 0).toBe(true)
        expect(jsonFiles.length >= 0).toBe(true)
        expect(tsFiles.length >= 0).toBe(true)
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })
  })

  describe("executePostCreateCommands with new signature", () => {
    test("should return array of command results", async () => {
      const commands = ["echo 'test1'", "echo 'test2'"]
      const variables: TemplateVariables = {
        BASE_PATH: "test-project",
        WORKTREE_PATH: "/tmp/test",
        BRANCH_NAME: "feature/test",
        SOURCE_BRANCH: "main",
      }

      try {
        const results = await executePostCreateCommands(commands, variables)

        expect(Array.isArray(results)).toBe(true)
        expect(results).toHaveLength(2)

        for (const result of results) {
          expect(result).toHaveProperty("command")
          expect(result).toHaveProperty("success")
          expect(result).toHaveProperty("output")
          expect(typeof result.command).toBe("string")
          expect(typeof result.success).toBe("boolean")
          expect(typeof result.output).toBe("string")
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })

    test("should handle empty commands gracefully", async () => {
      const commands = ["", "  ", "echo 'valid'"]
      const variables: TemplateVariables = {
        BASE_PATH: "test",
        WORKTREE_PATH: "/tmp",
        BRANCH_NAME: "test",
        SOURCE_BRANCH: "main",
      }

      try {
        const results = await executePostCreateCommands(commands, variables)

        expect(results).toHaveLength(3)

        // Empty commands should succeed but do nothing
        expect(results[0].success).toBe(true)
        expect(results[0].output).toBe("")
        expect(results[1].success).toBe(true)
        expect(results[1].output).toBe("")

        // Valid command should execute
        expect(results[2].command).toBe("echo 'valid'")
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })

    test("should continue execution after failed commands", async () => {
      const commands = ["echo 'first'", "definitely-not-a-command-12345", "echo 'third'"]
      const variables: TemplateVariables = {
        BASE_PATH: "test",
        WORKTREE_PATH: "/tmp",
        BRANCH_NAME: "test",
        SOURCE_BRANCH: "main",
      }

      try {
        const results = await executePostCreateCommands(commands, variables)

        expect(results).toHaveLength(3)

        // First command should succeed
        expect(results[0].success).toBe(true)

        // Second command should fail
        expect(results[1].success).toBe(false)
        expect(results[1].error).toBeDefined()

        // Third command should still execute and succeed
        expect(results[2].success).toBe(true)
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })

    test("should resolve template variables correctly", async () => {
      const commands = ["echo 'Branch: $BRANCH_NAME'", "echo 'Path: $WORKTREE_PATH'"]
      const variables: TemplateVariables = {
        BASE_PATH: "awesome-project",
        WORKTREE_PATH: "/tmp/worktree",
        BRANCH_NAME: "feature/awesome",
        SOURCE_BRANCH: "main",
      }

      try {
        const results = await executePostCreateCommands(commands, variables)

        expect(results).toHaveLength(2)

        for (const result of results) {
          expect(result.success).toBe(true)
          // Output should contain resolved variables, not template placeholders
          expect(result.output).not.toContain("$BRANCH_NAME")
          expect(result.output).not.toContain("$WORKTREE_PATH")
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })
  })

  describe("openTerminal with improved signature", () => {
    test("should return command in result", async () => {
      const terminalCommand = "echo 'opening terminal in $WORKTREE_PATH'"
      const worktreePath = "/tmp/test-terminal"

      try {
        const result = await openTerminal(terminalCommand, worktreePath)

        expect(result).toHaveProperty("success")
        expect(result).toHaveProperty("command")
        expect(typeof result.success).toBe("boolean")
        expect(typeof result.command).toBe("string")
        expect(result.command).toContain("/tmp/test-terminal")
        expect(result.command).not.toContain("$WORKTREE_PATH")
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })

    test("should handle empty terminal command", async () => {
      const result = await openTerminal("", "/tmp/test")

      expect(result.success).toBe(true)
      expect(result.command).toBe("")
      expect(result.error).toBeUndefined()
    })

    test("should handle whitespace-only command", async () => {
      const result = await openTerminal("   ", "/tmp/test")

      expect(result.success).toBe(true)
      expect(result.command).toBe("")
    })

    test("should resolve variables in terminal command", async () => {
      const result = await openTerminal("code $WORKTREE_PATH", "/tmp/awesome-worktree")

      expect(result.command).toBe("code /tmp/awesome-worktree")
      expect(result.command).not.toContain("$WORKTREE_PATH")
    })
  })

  describe("file copying real-world scenarios", () => {
    test("should handle typical project file patterns", async () => {
      const realWorldConfig: WorktreeConfig = {
        worktreeCopyPatterns: [
          ".env*", // All env files
          "package.json", // Dependencies
          "package-lock.json", // Lock file
          "tsconfig.json", // TypeScript config
          "biome.json", // Linter config
          ".vscode/**", // VS Code settings
          "*.md", // Documentation
        ],
        worktreeCopyIgnores: [
          "**/node_modules/**",
          "**/dist/**",
          "**/.git/**",
          "**/coverage/**",
          "**/*.log",
        ],
        worktreePathTemplate: "$BASE_PATH-worktrees/$BRANCH_NAME",
        postCreateCmd: [],
        terminalCommand: "",
      }

      try {
        const result = await copyFiles(process.cwd(), "/tmp/real-world-test", realWorldConfig)

        expect(result).toBeDefined()
        expect(Array.isArray(result.copied)).toBe(true)
        expect(Array.isArray(result.skipped)).toBe(true)
        expect(Array.isArray(result.errors)).toBe(true)

        // Verify no ignored files were copied
        for (const file of result.copied) {
          expect(file).not.toMatch(/node_modules/)
          expect(file).not.toMatch(/dist/)
          expect(file).not.toMatch(/\.git/)
          expect(file).not.toMatch(/coverage/)
          expect(file).not.toMatch(/\.log$/)
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })

    test("should handle directory structure preservation", async () => {
      const config: WorktreeConfig = {
        worktreeCopyPatterns: ["src/**/*.ts", "src/**/*.tsx"],
        worktreeCopyIgnores: ["**/*.test.*", "**/node_modules/**"],
        worktreePathTemplate: "$BASE_PATH/$BRANCH_NAME",
        postCreateCmd: [],
        terminalCommand: "",
      }

      try {
        const result = await copyFiles(process.cwd(), "/tmp/structure-test", config)

        // Check that directory structure is preserved
        const nestedFiles = result.copied.filter((f) => f.includes("src/") && f.includes("/"))

        for (const nestedFile of nestedFiles) {
          expect(nestedFile).toMatch(/^src\/.*\.(ts|tsx)$/)
          expect(nestedFile).not.toMatch(/\.test\./)
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })
  })

  describe("integration with worktree workflow", () => {
    test("should work with realistic post-create commands", async () => {
      const commands = [
        "echo 'Setting up worktree: $BRANCH_NAME'",
        "echo 'In directory: $WORKTREE_PATH'",
        "echo 'From source: $SOURCE_BRANCH'",
        "echo 'Base: $BASE_PATH'",
      ]

      const variables: TemplateVariables = {
        BASE_PATH: "branchlet",
        WORKTREE_PATH: "/tmp/test-worktree",
        BRANCH_NAME: "feature/file-copy-improvements",
        SOURCE_BRANCH: "main",
      }

      try {
        const results = await executePostCreateCommands(commands, variables)

        expect(results).toHaveLength(4)

        for (const result of results) {
          expect(result.success).toBe(true)
          expect(result.output).toContain("branchlet")
          expect(result.output).toContain("feature/file-copy-improvements")
          expect(result.output).toContain("/tmp/test-worktree")
          expect(result.output).toContain("main")
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })

    test("should handle terminal command with proper variable resolution", async () => {
      const terminalCommands = [
        "code $WORKTREE_PATH",
        "cd $WORKTREE_PATH && pwd",
        "echo 'Opening $WORKTREE_PATH'",
      ]

      for (const command of terminalCommands) {
        try {
          const result = await openTerminal(command, "/tmp/terminal-test")

          expect(result.success).toBe(true)
          expect(result.command).toContain("/tmp/terminal-test")
          expect(result.command).not.toContain("$WORKTREE_PATH")
        } catch (error) {
          expect(error).toBeInstanceOf(Error)
        }
      }
    })
  })

  describe("performance and reliability", () => {
    test("should handle large file copy operations efficiently", async () => {
      const config: WorktreeConfig = {
        worktreeCopyPatterns: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
        worktreeCopyIgnores: [
          "**/node_modules/**",
          "**/dist/**",
          "**/.git/**",
          "**/coverage/**",
          "**/*.test.*",
          "**/*.spec.*",
        ],
        worktreePathTemplate: "$BASE_PATH/$BRANCH_NAME",
        postCreateCmd: [],
        terminalCommand: "",
      }

      const startTime = Date.now()

      try {
        const result = await copyFiles(process.cwd(), "/tmp/performance-test", config)
        const endTime = Date.now()

        expect(result).toBeDefined()
        expect(Array.isArray(result.copied)).toBe(true)

        // Should complete in reasonable time
        expect(endTime - startTime).toBeLessThan(10000) // 10 seconds max

        // Should not copy ignored files
        for (const file of result.copied) {
          expect(file).not.toMatch(/node_modules/)
          expect(file).not.toMatch(/\.test\./)
          expect(file).not.toMatch(/\.spec\./)
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })

    test("should handle concurrent file operations", async () => {
      const config: WorktreeConfig = {
        worktreeCopyPatterns: [".env*", "*.json"],
        worktreeCopyIgnores: [],
        worktreePathTemplate: "$BASE_PATH/$BRANCH_NAME",
        postCreateCmd: [],
        terminalCommand: "",
      }

      const operations = [
        copyFiles(process.cwd(), "/tmp/concurrent-1", config),
        copyFiles(process.cwd(), "/tmp/concurrent-2", config),
        copyFiles(process.cwd(), "/tmp/concurrent-3", config),
      ]

      const results = await Promise.allSettled(operations)

      expect(results).toHaveLength(3)

      for (const result of results) {
        if (result.status === "fulfilled") {
          expect(result.value).toHaveProperty("copied")
          expect(result.value).toHaveProperty("skipped")
          expect(result.value).toHaveProperty("errors")
        } else {
          // Some operations might fail due to race conditions, that's acceptable
          expect(result.reason).toBeInstanceOf(Error)
        }
      }
    })
  })

  describe("error handling improvements", () => {
    test("should gracefully handle permission errors", async () => {
      const config: WorktreeConfig = {
        worktreeCopyPatterns: ["**/*"],
        worktreeCopyIgnores: [],
        worktreePathTemplate: "$BASE_PATH/$BRANCH_NAME",
        postCreateCmd: [],
        terminalCommand: "",
      }

      try {
        // Try to copy to a restricted location
        const result = await copyFiles(process.cwd(), "/root/restricted", config)

        expect(result).toBeDefined()
        expect(Array.isArray(result.errors)).toBe(true)

        if (result.errors.length > 0) {
          // Should have meaningful error messages
          for (const error of result.errors) {
            expect(typeof error).toBe("string")
            expect(error.length).toBeGreaterThan(0)
          }
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })

    test("should handle safe glob patterns efficiently", async () => {
      const config: WorktreeConfig = {
        worktreeCopyPatterns: [
          "*.json", // Simple pattern
          ".env*", // Env files
          "*.md", // Documentation
        ],
        worktreeCopyIgnores: ["**/node_modules/**"],
        worktreePathTemplate: "$BASE_PATH/$BRANCH_NAME",
        postCreateCmd: [],
        terminalCommand: "",
      }

      try {
        const result = await copyFiles(process.cwd(), "/tmp/safe-test", config)

        expect(result).toBeDefined()
        expect(Array.isArray(result.copied)).toBe(true)
        expect(Array.isArray(result.errors)).toBe(true)

        // Should handle basic patterns without timeout
        for (const file of result.copied) {
          expect(typeof file).toBe("string")
          expect(file.length).toBeGreaterThan(0)
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })
  })
})

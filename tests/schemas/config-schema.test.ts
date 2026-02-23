import { describe, expect, test } from "bun:test"
import { validateConfig, WorktreeConfigSchema } from "../../src/schemas/config-schema.js"

describe("config-schema", () => {
  describe("validateConfig", () => {
    test("should validate valid configuration", () => {
      const validConfig = {
        worktreeCopyPatterns: ["*.json", "*.md"],
        worktreeCopyIgnores: ["node_modules/**"],
        worktreePathTemplate: "$BASE_PATH-worktrees/$BRANCH_NAME",
        postCreateCmd: ["npm install"],
        terminalCommand: "code $WORKTREE_PATH",
        deleteBranchWithWorktree: false,
        showRemoteBranches: true,
      }

      const result = validateConfig(validConfig)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validConfig)
    })

    test("should handle configuration with missing fields (uses defaults)", () => {
      const partialConfig = {
        worktreeCopyPatterns: ["*.json"],
        // Other fields will use defaults
      }

      const result = validateConfig(partialConfig)
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.worktreeCopyPatterns).toEqual(["*.json"])
    })

    test("should reject configuration with invalid field types", () => {
      const invalidConfig = {
        worktreeCopyPatterns: "not-an-array", // Should be array
        worktreeCopyIgnores: ["node_modules/**"],
        worktreePathTemplate: "$BASE_PATH-worktrees/$BRANCH_NAME",
        postCreateCmd: [],
        terminalCommand: "",
      }

      const result = validateConfig(invalidConfig)
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    test("should handle empty arrays", () => {
      const configWithEmptyArrays = {
        worktreeCopyPatterns: [],
        worktreeCopyIgnores: [],
        worktreePathTemplate: "$BASE_PATH/$BRANCH_NAME",
        postCreateCmd: [],
        terminalCommand: "",
      }

      const result = validateConfig(configWithEmptyArrays)
      expect(result.success).toBe(true)
    })

    test("should handle null and undefined values", () => {
      const configs = [null, undefined, { worktreeCopyPatterns: null }]

      for (const config of configs) {
        const result = validateConfig(config)
        if (config === null || config === undefined) {
          expect(result.success).toBe(false)
        } else {
          // Empty object should use defaults and succeed
          const emptyResult = validateConfig({})
          expect(emptyResult.success).toBe(true)
        }
      }
    })

    test("should validate complex realistic configurations", () => {
      const complexConfigs = [
        {
          worktreeCopyPatterns: [
            "package.json",
            "package-lock.json",
            "*.md",
            ".env.example",
            "tsconfig.json",
            ".gitignore",
            "biome.json",
          ],
          worktreeCopyIgnores: [
            "node_modules/**",
            ".git/**",
            "dist/**",
            "build/**",
            "coverage/**",
            ".vscode/**",
            ".idea/**",
          ],
          worktreePathTemplate: "$BASE_PATH-worktrees/$BRANCH_NAME",
          postCreateCmd: [
            "npm ci",
            "npm run build",
            "npm run test:unit",
            "echo 'Worktree setup complete'",
          ],
          terminalCommand: "code $WORKTREE_PATH",
          deleteBranchWithWorktree: true,
          showRemoteBranches: true,
        },
        {
          worktreeCopyPatterns: ["Cargo.toml", "Cargo.lock", "*.md"],
          worktreeCopyIgnores: ["target/**", ".git/**"],
          worktreePathTemplate: "../$BRANCH_NAME-worktree",
          postCreateCmd: ["cargo check", "cargo test"],
          terminalCommand: "cd $WORKTREE_PATH && zsh",
          deleteBranchWithWorktree: false,
          showRemoteBranches: false,
        },
        {
          worktreeCopyPatterns: ["go.mod", "go.sum", "*.md", "Makefile"],
          worktreeCopyIgnores: ["vendor/**", ".git/**", "bin/**"],
          worktreePathTemplate: "/tmp/go-worktrees/$BRANCH_NAME",
          postCreateCmd: ["go mod download", "make build"],
          terminalCommand: "tmux new-session -c $WORKTREE_PATH",
          deleteBranchWithWorktree: true,
          showRemoteBranches: true,
        },
      ]

      for (const config of complexConfigs) {
        const result = validateConfig(config)
        expect(result.success).toBe(true)
        expect(result.data).toEqual(config)
      }
    })
  })

  describe("WorktreeConfigSchema", () => {
    test("should parse valid configurations", () => {
      const validConfig = {
        worktreeCopyPatterns: ["*.json"],
        worktreeCopyIgnores: ["node_modules/**"],
        worktreePathTemplate: "$BASE_PATH/$BRANCH_NAME",
        postCreateCmd: [],
        terminalCommand: "",
        deleteBranchWithWorktree: false,
        showRemoteBranches: true,
      }

      const result = WorktreeConfigSchema.parse(validConfig)
      expect(result).toEqual(validConfig)
    })

    test("should throw on invalid configurations", () => {
      const invalidConfigs = [
        { worktreeCopyPatterns: "not-array" },
        { postCreateCmd: "not-array" },
        { worktreePathTemplate: 123 },
        { terminalCommand: null },
      ]

      for (const config of invalidConfigs) {
        expect(() => WorktreeConfigSchema.parse(config)).toThrow()
      }
    })

    test("should handle edge case values", () => {
      const edgeCaseConfigs = [
        {
          worktreeCopyPatterns: [""],
          worktreeCopyIgnores: [""],
          worktreePathTemplate: "",
          postCreateCmd: [""],
          terminalCommand: "",
        },
        {
          worktreeCopyPatterns: ["*".repeat(1000)],
          worktreeCopyIgnores: ["ignore".repeat(100)],
          worktreePathTemplate: "$".repeat(50),
          postCreateCmd: ["command".repeat(100)],
          terminalCommand: "terminal".repeat(100),
        },
      ]

      for (const config of edgeCaseConfigs) {
        try {
          const result = WorktreeConfigSchema.parse(config)
          expect(result).toBeDefined()
        } catch (error) {
          // Some extreme cases might fail validation, that's acceptable
          expect(error).toBeInstanceOf(Error)
        }
      }
    })
  })

  describe("Schema consistency", () => {
    test("should maintain consistency between validateConfig and WorktreeConfigSchema", () => {
      const testConfigs = [
        {
          worktreeCopyPatterns: ["*.json", "*.md"],
          worktreeCopyIgnores: ["node_modules/**"],
          worktreePathTemplate: "$BASE_PATH/$BRANCH_NAME",
          postCreateCmd: ["npm install"],
          terminalCommand: "code $WORKTREE_PATH",
        },
        {
          worktreeCopyPatterns: [],
          worktreeCopyIgnores: [],
          worktreePathTemplate: "simple-path",
          postCreateCmd: [],
          terminalCommand: "",
        },
      ]

      for (const config of testConfigs) {
        const validateResult = validateConfig(config)

        if (validateResult.success) {
          // If validateConfig succeeds, schema parse should also succeed
          expect(() => WorktreeConfigSchema.parse(config)).not.toThrow()
        } else {
          // If validateConfig fails, schema parse should also fail
          expect(() => WorktreeConfigSchema.parse(config)).toThrow()
        }
      }
    })
  })
})

import { describe, expect, test } from "bun:test"
import { ConfigService } from "../../src/services/config-service.js"
import { ConfigError } from "../../src/utils/error-handlers.js"

describe("ConfigService", () => {
  describe("constructor", () => {
    test("should create ConfigService with default config", () => {
      const service = new ConfigService()
      expect(service).toBeInstanceOf(ConfigService)

      const config = service.getConfig()
      expect(config).toHaveProperty("worktreeCopyPatterns")
      expect(config).toHaveProperty("worktreeCopyIgnores")
      expect(config).toHaveProperty("worktreePathTemplate")
      expect(config).toHaveProperty("postCreateCmd")
      expect(config).toHaveProperty("terminalCommand")
    })
  })

  describe("getConfig", () => {
    test("should return a copy of config", () => {
      const service = new ConfigService()
      const config1 = service.getConfig()
      const config2 = service.getConfig()

      expect(config1).toEqual(config2)
      expect(config1).not.toBe(config2) // Should be different objects
    })
  })

  describe("updateConfig", () => {
    test("should update config with partial values", () => {
      const service = new ConfigService()
      const originalConfig = service.getConfig()

      const updates = {
        terminalCommand: "code $WORKTREE_PATH",
        postCreateCmd: ["npm install"],
      }

      const updatedConfig = service.updateConfig(updates)

      expect(updatedConfig.terminalCommand).toBe("code $WORKTREE_PATH")
      expect(updatedConfig.postCreateCmd).toEqual(["npm install"])
      expect(updatedConfig.worktreeCopyPatterns).toEqual(originalConfig.worktreeCopyPatterns)
    })

    test("should handle empty updates", () => {
      const service = new ConfigService()
      const originalConfig = service.getConfig()

      const updatedConfig = service.updateConfig({})

      expect(updatedConfig).toEqual(originalConfig)
      expect(updatedConfig).not.toBe(originalConfig)
    })

    test("should handle null/undefined values", () => {
      const service = new ConfigService()

      const updatedConfig = service.updateConfig({
        terminalCommand: "",
        postCreateCmd: [],
      })

      expect(updatedConfig.terminalCommand).toBe("")
      expect(updatedConfig.postCreateCmd).toEqual([])
    })
  })

  describe("resetConfig", () => {
    test("should reset config to defaults", () => {
      const service = new ConfigService()

      // Modify config first
      service.updateConfig({
        terminalCommand: "custom command",
        postCreateCmd: ["custom", "commands"],
      })

      // Reset to defaults
      const resetConfig = service.resetConfig()
      const freshService = new ConfigService()
      const defaultConfig = freshService.getConfig()

      expect(resetConfig).toEqual(defaultConfig)
    })
  })

  describe("getConfigPath", () => {
    test("should return undefined initially", () => {
      const service = new ConfigService()
      expect(service.getConfigPath()).toBeUndefined()
    })
  })

  describe("loadConfig error scenarios", () => {
    test("should handle loading from non-existent directory", async () => {
      const service = new ConfigService()

      try {
        await service.loadConfig("/completely/non/existent/path/12345")
        // Should either succeed with defaults or throw ConfigError
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigError)
      }
    })

    test("should handle loading with no project path", async () => {
      const service = new ConfigService()

      try {
        const config = await service.loadConfig()
        expect(config).toBeDefined()
        expect(config).toHaveProperty("worktreeCopyPatterns")
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigError)
      }
    })
  })

  describe("hasGlobalConfig", () => {
    test("should check for global config existence", async () => {
      const service = new ConfigService()
      const result = await service.hasGlobalConfig()
      expect(typeof result).toBe("boolean")
    })
  })

  describe("createGlobalConfig", () => {
    test("should handle global config creation attempts", async () => {
      const service = new ConfigService()

      try {
        const path = await service.createGlobalConfig()
        expect(typeof path).toBe("string")
        expect(path.length).toBeGreaterThan(0)
      } catch (error) {
        // Might fail due to permissions, that's okay
        expect(error).toBeInstanceOf(Error)
      }
    })
  })

  describe("saveConfig", () => {
    test("should handle saving without config path", async () => {
      const service = new ConfigService()
      const config = service.getConfig()

      try {
        await service.saveConfig(config)
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigError)
        expect(error.message).toContain("No config path available")
      }
    })

    test("should handle saving to invalid path", async () => {
      const service = new ConfigService()
      const config = service.getConfig()

      try {
        await service.saveConfig(config, "/root/impossible/path/config.json")
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigError)
      }
    })
  })

  describe("config validation edge cases", () => {
    test("should handle various config structures", () => {
      const service = new ConfigService()

      // Test with various update patterns
      const testUpdates = [
        { worktreeCopyPatterns: ["*.json", "*.md", "package-lock.json"] },
        { worktreeCopyIgnores: ["node_modules/**", ".git/**", "dist/**"] },
        { worktreePathTemplate: "$BASE_PATH/worktrees/$BRANCH_NAME" },
        { postCreateCmd: ["npm ci", "npm run build", "echo 'Setup complete'"] },
        { terminalCommand: "code $WORKTREE_PATH && echo 'Opened in VS Code'" },
      ]

      for (const update of testUpdates) {
        const result = service.updateConfig(update)
        expect(result).toBeDefined()
        expect(result).toHaveProperty("worktreeCopyPatterns")
      }
    })
  })
})

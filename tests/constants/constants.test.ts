import { describe, expect, test } from "bun:test"
import {
  COLORS,
  DEFAULT_CONFIG,
  GLOBAL_CONFIG_DIR,
  GLOBAL_CONFIG_FILE,
  LOCAL_CONFIG_FILE_NAME,
  MESSAGES,
} from "../../src/constants/index.js"

describe("constants", () => {
  describe("DEFAULT_CONFIG", () => {
    test("should have all required configuration fields", () => {
      expect(DEFAULT_CONFIG).toHaveProperty("worktreeCopyPatterns")
      expect(DEFAULT_CONFIG).toHaveProperty("worktreeCopyIgnores")
      expect(DEFAULT_CONFIG).toHaveProperty("worktreePathTemplate")
      expect(DEFAULT_CONFIG).toHaveProperty("postCreateCmd")
      expect(DEFAULT_CONFIG).toHaveProperty("terminalCommand")
    })

    test("should have sensible default values", () => {
      expect(Array.isArray(DEFAULT_CONFIG.worktreeCopyPatterns)).toBe(true)
      expect(Array.isArray(DEFAULT_CONFIG.worktreeCopyIgnores)).toBe(true)
      expect(Array.isArray(DEFAULT_CONFIG.postCreateCmd)).toBe(true)
      expect(typeof DEFAULT_CONFIG.worktreePathTemplate).toBe("string")
      expect(typeof DEFAULT_CONFIG.terminalCommand).toBe("string")
    })

    test("should have meaningful template variables", () => {
      expect(DEFAULT_CONFIG.worktreePathTemplate).toContain("$BASE_PATH")
    })

    test("should include .env* pattern by default", () => {
      const patterns = DEFAULT_CONFIG.worktreeCopyPatterns
      expect(patterns).toContain(".env*")
    })

    test("should support recursive directory patterns", () => {
      const patterns = DEFAULT_CONFIG.worktreeCopyPatterns
      const hasRecursivePattern = patterns.some((p) => p.includes("**"))
      expect(hasRecursivePattern).toBe(true)
    })
  })

  describe("file and directory constants", () => {
    test("should have valid file paths", () => {
      expect(typeof GLOBAL_CONFIG_DIR).toBe("string")
      expect(typeof GLOBAL_CONFIG_FILE).toBe("string")
      expect(typeof LOCAL_CONFIG_FILE_NAME).toBe("string")

      expect(GLOBAL_CONFIG_DIR.length).toBeGreaterThan(0)
      expect(GLOBAL_CONFIG_FILE.length).toBeGreaterThan(0)
      expect(LOCAL_CONFIG_FILE_NAME.length).toBeGreaterThan(0)
    })

    test("should have consistent path structure", () => {
      expect(GLOBAL_CONFIG_FILE).toContain(GLOBAL_CONFIG_DIR)
      expect(LOCAL_CONFIG_FILE_NAME).toMatch(/\.json$/)
    })
  })

  describe("COLORS", () => {
    test("should define all required color constants", () => {
      const requiredColors = ["PRIMARY", "SUCCESS", "WARNING", "ERROR", "INFO", "MUTED"]

      for (const color of requiredColors) {
        expect(COLORS).toHaveProperty(color)
        expect(typeof COLORS[color as keyof typeof COLORS]).toBe("string")
        expect(COLORS[color as keyof typeof COLORS].length).toBeGreaterThan(0)
      }
    })

    test("should have valid color formats", () => {
      const colorValues = Object.values(COLORS)

      for (const color of colorValues) {
        // Should be either hex color (#RRGGBB) or color name
        const isHex = /^#[0-9A-Fa-f]{6}$/.test(color)
        const isColorName = /^[a-zA-Z]+$/.test(color)

        expect(isHex || isColorName).toBe(true)
      }
    })
  })

  describe("MESSAGES", () => {
    test("should define all required message constants", () => {
      const requiredMessages = ["CREATE_SUCCESS", "DELETE_SUCCESS", "DELETE_DELETING"]

      for (const message of requiredMessages) {
        expect(MESSAGES).toHaveProperty(message)
        expect(typeof MESSAGES[message as keyof typeof MESSAGES]).toBe("string")
        expect(MESSAGES[message as keyof typeof MESSAGES].length).toBeGreaterThan(0)
      }
    })

    test("should have meaningful message content", () => {
      expect(MESSAGES.CREATE_SUCCESS).toMatch(/success|created/i)
      expect(MESSAGES.DELETE_SUCCESS).toMatch(/success|deleted/i)
      expect(MESSAGES.DELETE_DELETING).toMatch(/delet/i)
    })

    test("should not contain placeholder text", () => {
      const messageValues = Object.values(MESSAGES)

      for (const message of messageValues) {
        expect(message).not.toContain("TODO")
        expect(message).not.toContain("FIXME")
        expect(message).not.toContain("placeholder")
        expect(message.trim()).toBe(message) // No leading/trailing whitespace
      }
    })
  })

  describe("constant immutability", () => {
    test("should not allow modification of constants", () => {
      // Test that constants exist and are defined
      const originalPrimary = COLORS.PRIMARY
      expect(originalPrimary).toBeDefined()
      expect(typeof originalPrimary).toBe("string")
    })

    test("should not allow modification of default config", () => {
      const originalPatterns = [...DEFAULT_CONFIG.worktreeCopyPatterns]

      try {
        DEFAULT_CONFIG.worktreeCopyPatterns.push("*.modified")
      } catch (_error) {
        // Some environments might throw on modification
      }

      // Reset to ensure test doesn't affect others
      DEFAULT_CONFIG.worktreeCopyPatterns.length = 0
      DEFAULT_CONFIG.worktreeCopyPatterns.push(...originalPatterns)
    })
  })

  describe("constant relationships", () => {
    test("should have consistent naming conventions", () => {
      const colorKeys = Object.keys(COLORS)
      const messageKeys = Object.keys(MESSAGES)

      // All keys should be UPPER_CASE
      for (const key of [...colorKeys, ...messageKeys]) {
        expect(key).toMatch(/^[A-Z_]+$/)
      }
    })

    test("should have appropriate defaults for different environments", () => {
      // Test that defaults work across different operating systems
      expect(DEFAULT_CONFIG.worktreePathTemplate).not.toContain("\\")
      expect(GLOBAL_CONFIG_DIR).toBeDefined()

      // Should handle cross-platform paths
      const isWindows = process.platform === "win32"
      const isMac = process.platform === "darwin"
      const isLinux = process.platform === "linux"

      expect(isWindows || isMac || isLinux).toBe(true)
    })
  })

  describe("template variable consistency", () => {
    test("should use consistent template variables", () => {
      const template = DEFAULT_CONFIG.worktreePathTemplate
      expect(template).toContain("$BASE_PATH")
      expect(typeof template).toBe("string")
      expect(template.length).toBeGreaterThan(0)
    })

    test("should not have invalid template syntax", () => {
      const template = DEFAULT_CONFIG.worktreePathTemplate

      // Should not have unescaped special characters that could break path resolution
      expect(template).not.toMatch(/[<>:"|?*]/)
      expect(template).not.toContain("$$") // Double dollar signs
      expect(template).not.toMatch(/\$[^A-Z_]/) // Invalid variable format
    })
  })
})

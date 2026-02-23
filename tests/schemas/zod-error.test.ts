import { describe, expect, test } from "bun:test"
import { validateConfig } from "../../src/schemas/config-schema.js"

describe("schema validation edge cases", () => {
  test("should handle ZodError path correctly", () => {
    const invalidConfig = {
      worktreeCopyPatterns: "not-an-array",
      worktreeCopyIgnores: ["valid"],
      worktreePathTemplate: 123, // Invalid type
      postCreateCmd: "not-an-array",
      terminalCommand: null,
    }

    const result = validateConfig(invalidConfig)

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(typeof result.error).toBe("string")
    expect(result.error.length).toBeGreaterThan(0)
  })

  test("should handle non-ZodError exceptions", () => {
    // Create an object that will cause a non-Zod error
    const problematicConfig = {
      get worktreeCopyPatterns() {
        throw new Error("Custom error during property access")
      },
    }

    const result = validateConfig(problematicConfig)

    expect(result.success).toBe(false)
    expect(result.error).toBe("Error: Custom error during property access")
  })

  test("should handle various invalid type combinations", () => {
    const invalidConfigs = [
      { worktreeCopyPatterns: null },
      { worktreeCopyIgnores: "string-instead-of-array" },
      { worktreePathTemplate: [] },
      { postCreateCmd: 42 },
      { terminalCommand: { object: "instead-of-string" } },
    ]

    for (const config of invalidConfigs) {
      const result = validateConfig(config)
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    }
  })
})

import { describe, expect, test } from "bun:test"
import * as fs from "node:fs"
import * as path from "node:path"
import { WorktreeConfigSchema, z } from "../../src/schemas/config-schema.js"

const SCHEMA_PATH = path.join(import.meta.dirname, "..", "..", "schema.json")

describe("JSON Schema", () => {
  describe("schema.json file", () => {
    test("should exist at repository root", () => {
      expect(fs.existsSync(SCHEMA_PATH)).toBe(true)
    })

    test("should be valid JSON", () => {
      const content = fs.readFileSync(SCHEMA_PATH, "utf-8")
      expect(() => JSON.parse(content)).not.toThrow()
    })

    test("should have required metadata fields", () => {
      const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf-8"))

      expect(schema.$schema).toBe("http://json-schema.org/draft-7/schema#")
      expect(schema.$id).toBe(
        "https://raw.githubusercontent.com/raghavpillai/branchlet/main/schema.json"
      )
      expect(schema.title).toBe("Branchlet Configuration")
      expect(schema.description).toBeDefined()
    })

    test("should be of type object", () => {
      const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf-8"))
      expect(schema.type).toBe("object")
    })
  })

  describe("schema drift detection", () => {
    test("should match current Zod schema", () => {
      const currentSchema = JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf-8"))
      const generatedSchema = z.toJSONSchema(WorktreeConfigSchema, { target: "draft-7" })

      const expectedSchema = {
        ...generatedSchema,
        $schema: "http://json-schema.org/draft-7/schema#",
        $id: "https://raw.githubusercontent.com/raghavpillai/branchlet/main/schema.json",
        title: "Branchlet Configuration",
        description: "Configuration schema for Branchlet - Git worktree management CLI",
      }

      expect(currentSchema).toEqual(expectedSchema)
    })
  })

  describe("schema properties", () => {
    test("should contain all expected configuration fields", () => {
      const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf-8"))
      const expectedFields = [
        "worktreeCopyPatterns",
        "worktreeCopyIgnores",
        "worktreePathTemplate",
        "postCreateCmd",
        "terminalCommand",
        "deleteBranchWithWorktree",
      ]

      for (const field of expectedFields) {
        expect(schema.properties).toHaveProperty(field)
      }
    })

    test("should have correct types for each field", () => {
      const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf-8"))
      const { properties } = schema

      // Array fields
      expect(properties.worktreeCopyPatterns.type).toBe("array")
      expect(properties.worktreeCopyIgnores.type).toBe("array")
      expect(properties.postCreateCmd.type).toBe("array")

      // String fields
      expect(properties.worktreePathTemplate.type).toBe("string")
      expect(properties.terminalCommand.type).toBe("string")

      // Boolean fields
      expect(properties.deleteBranchWithWorktree.type).toBe("boolean")
    })

    test("should have descriptions for all fields", () => {
      const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf-8"))
      const { properties } = schema

      for (const [key, value] of Object.entries(properties)) {
        expect((value as { description?: string }).description).toBeDefined()
      }
    })

    test("should have default values for all fields", () => {
      const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf-8"))
      const { properties } = schema

      for (const [key, value] of Object.entries(properties)) {
        expect((value as { default?: unknown }).default).toBeDefined()
      }
    })
  })
})

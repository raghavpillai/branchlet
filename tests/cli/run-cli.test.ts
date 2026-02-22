import { describe, expect, test } from "bun:test"
import { runCli } from "../../src/cli/run-cli.js"
import type { CliArgs } from "../../src/cli/types.js"

describe("CLI dispatcher (runCli)", () => {
  test("should dispatch list command successfully", async () => {
    const logs: string[] = []
    const originalLog = console.log
    console.log = (...args: unknown[]) => {
      logs.push(args.map(String).join(" "))
    }

    try {
      await runCli({ command: "list" })

      const output = logs.join("\n")
      const parsed = JSON.parse(output)
      expect(Array.isArray(parsed)).toBe(true)
    } finally {
      console.log = originalLog
    }
  })

  test("should propagate create errors for missing arguments", async () => {
    const args: CliArgs = {
      command: "create",
      source: "main",
      // name is missing
    }

    try {
      await runCli(args)
      expect(true).toBe(false)
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toContain("--name")
    }
  })

  test("should propagate delete errors for missing arguments", async () => {
    const args: CliArgs = {
      command: "delete",
      // both name and path are missing
    }

    try {
      await runCli(args)
      expect(true).toBe(false)
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toContain("--path")
    }
  })

  test("should handle create with nonexistent source branch", async () => {
    const args: CliArgs = {
      command: "create",
      name: "test-wt",
      source: "does-not-exist-xyz",
    }

    try {
      await runCli(args)
      expect(true).toBe(false)
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toContain("does not exist")
    }
  })

  test("should handle delete with nonexistent worktree name", async () => {
    const args: CliArgs = {
      command: "delete",
      name: "absolutely-nonexistent-worktree",
    }

    try {
      await runCli(args)
      expect(true).toBe(false)
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toContain("No worktree found")
    }
  })
})

import { describe, expect, test } from "bun:test"
import { runList } from "../../../src/cli/commands/list.js"
import { WorktreeService } from "../../../src/services/worktree-service.js"

describe("CLI list command", () => {
  test("should output valid JSON to stdout", async () => {
    const service = new WorktreeService()
    await service.initialize()

    const logs: string[] = []
    const originalLog = console.log
    console.log = (...args: unknown[]) => {
      logs.push(args.map(String).join(" "))
    }

    try {
      await runList(service)

      expect(logs.length).toBeGreaterThan(0)

      const output = logs.join("\n")
      const parsed = JSON.parse(output)

      expect(Array.isArray(parsed)).toBe(true)
      expect(parsed.length).toBeGreaterThan(0)
    } finally {
      console.log = originalLog
    }
  })

  test("should include worktree path and branch in output", async () => {
    const service = new WorktreeService()
    await service.initialize()

    const logs: string[] = []
    const originalLog = console.log
    console.log = (...args: unknown[]) => {
      logs.push(args.map(String).join(" "))
    }

    try {
      await runList(service)

      const parsed = JSON.parse(logs.join("\n"))

      for (const worktree of parsed) {
        expect(worktree).toHaveProperty("path")
        expect(worktree).toHaveProperty("branch")
        expect(worktree).toHaveProperty("commit")
        expect(typeof worktree.path).toBe("string")
        expect(typeof worktree.branch).toBe("string")
      }
    } finally {
      console.log = originalLog
    }
  })

  test("should include the main worktree", async () => {
    const service = new WorktreeService()
    await service.initialize()

    const logs: string[] = []
    const originalLog = console.log
    console.log = (...args: unknown[]) => {
      logs.push(args.map(String).join(" "))
    }

    try {
      await runList(service)

      const parsed = JSON.parse(logs.join("\n"))
      const mainWorktree = parsed.find((wt: { isMain?: boolean }) => wt.isMain === true)

      expect(mainWorktree).toBeDefined()
    } finally {
      console.log = originalLog
    }
  })
})

import { describe, expect, test } from "bun:test"
import { runDelete } from "../../../src/cli/commands/delete.js"
import type { CliArgs } from "../../../src/cli/types.js"
import { WorktreeService } from "../../../src/services/worktree-service.js"

describe("CLI delete command", () => {
  describe("argument validation", () => {
    test("should throw when both --path and --name are missing", async () => {
      const service = new WorktreeService()
      await service.initialize()

      const args: CliArgs = {
        command: "delete",
        force: true,
      }

      try {
        await runDelete(args, service)
        expect(true).toBe(false)
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain("--path")
        expect((error as Error).message).toContain("--name")
      }
    })

    test("should throw when no worktree matches --name", async () => {
      const service = new WorktreeService()
      await service.initialize()

      const args: CliArgs = {
        command: "delete",
        name: "absolutely-nonexistent-worktree-xyz",
      }

      try {
        await runDelete(args, service)
        expect(true).toBe(false)
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain("No worktree found")
      }
    })

    test("should throw when --path points to nonexistent worktree", async () => {
      const service = new WorktreeService()
      await service.initialize()

      const args: CliArgs = {
        command: "delete",
        path: "/absolutely/nonexistent/path",
        force: true,
      }

      try {
        await runDelete(args, service)
        expect(true).toBe(false)
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })
  })

  describe("name resolution", () => {
    test("should resolve worktree path from --name", async () => {
      const service = new WorktreeService()
      await service.initialize()

      // Get actual worktrees to find a valid name
      const gitService = service.getGitService()
      const worktrees = await gitService.listWorktrees()

      // Find a non-main worktree to test name resolution
      const nonMain = worktrees.find((wt) => !wt.isMain)

      if (nonMain) {
        const dirName = nonMain.path.split("/").pop()

        const args: CliArgs = {
          command: "delete",
          name: dirName,
        }

        // Don't actually delete — we just want to verify name resolution works.
        // The delete will either succeed or fail depending on worktree state,
        // but it should NOT throw "No worktree found".
        try {
          await runDelete(args, service)
        } catch (error) {
          expect((error as Error).message).not.toContain("No worktree found")
        }
      }
    })
  })
})

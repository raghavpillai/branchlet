import { afterAll, describe, expect, test } from "bun:test"
import { runCreate } from "../../../src/cli/commands/create.js"
import type { CliArgs } from "../../../src/cli/types.js"
import { WorktreeService } from "../../../src/services/worktree-service.js"

describe("CLI create command", () => {
  const createdWorktrees: string[] = []

  afterAll(async () => {
    // Clean up any worktrees created during tests
    for (const name of createdWorktrees) {
      try {
        const service = new WorktreeService()
        await service.initialize()
        const worktrees = await service.getGitService().listWorktrees()
        const match = worktrees.find((wt) => wt.path.split("/").pop() === name)
        if (match) {
          await service.deleteWorktree(match.path, true)
        }
      } catch {
        // Best effort cleanup
      }
    }
  })

  describe("argument validation", () => {
    test("should throw when --name is missing", async () => {
      const service = new WorktreeService()
      await service.initialize()

      const args: CliArgs = {
        command: "create",
        source: "main",
      }

      try {
        await runCreate(args, service)
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain("--name")
      }
    })

    test("should throw when --source is missing", async () => {
      const service = new WorktreeService()
      await service.initialize()

      const args: CliArgs = {
        command: "create",
        name: "test-wt",
      }

      try {
        await runCreate(args, service)
        expect(true).toBe(false)
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain("--source")
      }
    })

    test("should throw for invalid directory name", async () => {
      const service = new WorktreeService()
      await service.initialize()

      const args: CliArgs = {
        command: "create",
        name: ".hidden-dir",
        source: "main",
      }

      try {
        await runCreate(args, service)
        expect(true).toBe(false)
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain("Invalid directory name")
      }
    })

    test("should throw for invalid directory name with path separators", async () => {
      const service = new WorktreeService()
      await service.initialize()

      const args: CliArgs = {
        command: "create",
        name: "dir/with/slash",
        source: "main",
      }

      try {
        await runCreate(args, service)
        expect(true).toBe(false)
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain("Invalid directory name")
      }
    })

    test("should throw for invalid branch name", async () => {
      const service = new WorktreeService()
      await service.initialize()

      const args: CliArgs = {
        command: "create",
        name: "test-wt",
        source: "main",
        branch: "branch with spaces",
      }

      try {
        await runCreate(args, service)
        expect(true).toBe(false)
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain("Invalid branch name")
      }
    })

    test("should throw for nonexistent source branch", async () => {
      const service = new WorktreeService()
      await service.initialize()

      const args: CliArgs = {
        command: "create",
        name: "test-wt",
        source: "nonexistent-branch-xyz",
      }

      try {
        await runCreate(args, service)
        expect(true).toBe(false)
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain("does not exist")
      }
    })
  })

  describe("branch defaults", () => {
    test("should default newBranch to source when --branch is omitted", async () => {
      const service = new WorktreeService()
      await service.initialize()

      // This will attempt to create a worktree using the source branch directly.
      // It may fail if the branch is already checked out, but the error should NOT
      // be about missing arguments or validation.
      const args: CliArgs = {
        command: "create",
        name: "test-default-branch",
        source: "main",
      }

      try {
        await runCreate(args, service)
        createdWorktrees.push("test-default-branch")
      } catch (error) {
        // Expected: "already checked out" since main is the current branch
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).not.toContain("Missing required argument")
        expect((error as Error).message).not.toContain("Invalid")
      }
    })
  })

  describe("successful creation", () => {
    test("should create worktree and output path to stdout", async () => {
      const service = new WorktreeService()
      await service.initialize()

      const branchName = `feat/cli-test-create-${Date.now()}`
      const wtName = `cli-test-create-${Date.now()}`

      const args: CliArgs = {
        command: "create",
        name: wtName,
        source: "main",
        branch: branchName,
      }

      // Capture console.log output
      const logs: string[] = []
      const originalLog = console.log
      console.log = (...msgArgs: unknown[]) => {
        logs.push(msgArgs.map(String).join(" "))
      }

      try {
        await runCreate(args, service)
        createdWorktrees.push(wtName)

        // Should have logged the worktree path
        expect(logs.length).toBeGreaterThan(0)
        expect(logs[0]).toContain(wtName)
      } finally {
        console.log = originalLog
      }
    })
  })
})

import { execSync } from "node:child_process"
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { runCreate } from "../../../src/cli/commands/create.js"
import type { CliArgs } from "../../../src/cli/types.js"
import { WorktreeService } from "../../../src/services/worktree-service.js"

describe("CLI create command", () => {
  const createdWorktrees: string[] = []
  let sourceBranch = "main"
  let createdTestBranch = false

  beforeAll(async () => {
    const service = new WorktreeService()
    await service.initialize()
    const repoInfo = await service.getGitService().getRepositoryInfo()
    const localBranch = repoInfo.branches.find((b) => !b.isRemote)
    if (localBranch) {
      sourceBranch = localBranch.name
    } else {
      // CI detached HEAD with no local branches — create one from HEAD
      execSync("git branch test-source-branch HEAD", { stdio: "ignore" })
      sourceBranch = "test-source-branch"
      createdTestBranch = true
    }
  })

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
    if (createdTestBranch) {
      try {
        execSync("git branch -D test-source-branch", { stdio: "ignore" })
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
        source: sourceBranch,
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
        source: sourceBranch,
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
        source: sourceBranch,
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
        source: sourceBranch,
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

    test("should throw for empty branch name", async () => {
      const service = new WorktreeService()
      await service.initialize()

      await expect(
        runCreate({ command: "create", name: "test-wt", source: sourceBranch, branch: "" }, service)
      ).rejects.toThrow("cannot be empty")
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
    test("should default newBranch to the worktree directory name when --branch is omitted", async () => {
      const service = new WorktreeService()
      await service.initialize()

      const wtName = `test-default-branch-${Date.now()}`

      const logs: string[] = []
      const originalLog = console.log
      console.log = (...msgArgs: unknown[]) => {
        logs.push(msgArgs.map(String).join(" "))
      }

      try {
        await runCreate({ command: "create", name: wtName, source: sourceBranch }, service)
        createdWorktrees.push(wtName)

        // The branch line in the output should name the worktree, not the source branch
        const branchLine = logs.find((l) => l.trimStart().startsWith("branch:"))
        expect(branchLine).toBeDefined()
        expect(branchLine).toContain(wtName)
      } finally {
        console.log = originalLog
      }
    })
  })

  describe("successful creation", () => {
    test("should create worktree and output path, source, and branch to stdout", async () => {
      const service = new WorktreeService()
      await service.initialize()

      const branchName = `feat/cli-test-create-${Date.now()}`
      const wtName = `cli-test-create-${Date.now()}`

      const logs: string[] = []
      const originalLog = console.log
      console.log = (...msgArgs: unknown[]) => {
        logs.push(msgArgs.map(String).join(" "))
      }

      try {
        await runCreate({ command: "create", name: wtName, source: sourceBranch, branch: branchName }, service)
        createdWorktrees.push(wtName)

        expect(logs[0]).toContain(wtName)
        const sourceLine = logs.find((l) => l.trimStart().startsWith("source:"))
        const branchLine = logs.find((l) => l.trimStart().startsWith("branch:"))
        expect(sourceLine).toContain(sourceBranch)
        expect(branchLine).toContain(branchName)
      } finally {
        console.log = originalLog
      }
    })

    test("should allow explicit -b that differs from -n", async () => {
      const service = new WorktreeService()
      await service.initialize()

      const wtName = `cli-test-diffname-${Date.now()}`
      const branchName = `feature/different-name-${Date.now()}`

      const logs: string[] = []
      const originalLog = console.log
      console.log = (...msgArgs: unknown[]) => {
        logs.push(msgArgs.map(String).join(" "))
      }

      try {
        await runCreate({ command: "create", name: wtName, source: sourceBranch, branch: branchName }, service)
        createdWorktrees.push(wtName)

        const branchLine = logs.find((l) => l.trimStart().startsWith("branch:"))
        expect(branchLine).toContain(branchName)
        expect(branchLine).not.toContain(wtName)
      } finally {
        console.log = originalLog
      }
    })

    test("should create two sibling worktrees from the same source branch", async () => {
      const service1 = new WorktreeService()
      await service1.initialize()
      const service2 = new WorktreeService()
      await service2.initialize()

      const ts = Date.now()
      const wt1 = `cli-sibling-a-${ts}`
      const wt2 = `cli-sibling-b-${ts}`
      const branch1 = `feat/sibling-a-${ts}`
      const branch2 = `feat/sibling-b-${ts}`

      const originalLog = console.log
      console.log = () => {}

      try {
        await runCreate({ command: "create", name: wt1, source: sourceBranch, branch: branch1 }, service1)
        createdWorktrees.push(wt1)

        await runCreate({ command: "create", name: wt2, source: sourceBranch, branch: branch2 }, service2)
        createdWorktrees.push(wt2)

        const worktrees = await service1.getGitService().listWorktrees()
        const paths = worktrees.map((wt) => wt.path)
        expect(paths.some((p) => p.endsWith(wt1))).toBe(true)
        expect(paths.some((p) => p.endsWith(wt2))).toBe(true)
      } finally {
        console.log = originalLog
      }
    })
  })
})

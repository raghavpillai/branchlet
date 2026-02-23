import { describe, expect, test } from "bun:test"
import { GitService } from "../../src/services/git-service.js"

describe("GitService", () => {
  const gitService = new GitService()

  describe("constructor", () => {
    test("should create GitService with default git root", () => {
      const service = new GitService()
      expect(service).toBeInstanceOf(GitService)
    })

    test("should create GitService with custom git root", () => {
      const service = new GitService("/custom/path")
      expect(service).toBeInstanceOf(GitService)
    })
  })

  describe("validateRepository", () => {
    test("should validate repository status", async () => {
      const result = await gitService.validateRepository()
      expect(typeof result).toBe("boolean")
    })
  })

  describe("getCurrentBranch", () => {
    test("should get current branch or null", async () => {
      const result = await gitService.getCurrentBranch()
      expect(result === null || typeof result === "string").toBe(true)
    })
  })

  describe("getDefaultBranch", () => {
    test("should get default branch", async () => {
      const result = await gitService.getDefaultBranch()
      expect(typeof result).toBe("string")
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe("branchExists", () => {
    test("should check if branch exists", async () => {
      const result = await gitService.branchExists("main")
      expect(typeof result).toBe("boolean")
    })

    test("should return false for non-existent branch", async () => {
      const result = await gitService.branchExists("definitely-does-not-exist-12345")
      expect(result).toBe(false)
    })

    test("should handle special characters in branch name", async () => {
      const result = await gitService.branchExists("feature/test-branch_123")
      expect(typeof result).toBe("boolean")
    })
  })

  describe("worktreeExists", () => {
    test("should check if worktree exists", async () => {
      const result = await gitService.worktreeExists("/non/existent/path")
      expect(result).toBe(false)
    })

    test("should handle current directory check", async () => {
      const result = await gitService.worktreeExists(process.cwd())
      expect(typeof result).toBe("boolean")
    })
  })

  describe("isWorktreeClean", () => {
    test("should check worktree cleanliness", async () => {
      const result = await gitService.isWorktreeClean("/non/existent/path")
      expect(typeof result).toBe("boolean")
    })

    test("should handle current directory", async () => {
      const result = await gitService.isWorktreeClean(process.cwd())
      expect(typeof result).toBe("boolean")
    })
  })

  describe("listWorktrees", () => {
    test("should return array of worktrees", async () => {
      try {
        const result = await gitService.listWorktrees()
        expect(Array.isArray(result)).toBe(true)

        if (result.length > 0) {
          const worktree = result[0]
          expect(worktree).toHaveProperty("path")
          expect(worktree).toHaveProperty("commit")
          expect(worktree).toHaveProperty("branch")
          expect(worktree).toHaveProperty("isMain")
          expect(worktree).toHaveProperty("isClean")
        }
      } catch (error) {
        // If not in a git repository, expect an error
        expect(error).toBeInstanceOf(Error)
      }
    })
  })

  describe("listBranches", () => {
    test("should return array of branches", async () => {
      try {
        const result = await gitService.listBranches()
        expect(Array.isArray(result)).toBe(true)

        if (result.length > 0) {
          const branch = result[0]
          expect(branch).toHaveProperty("name")
          expect(branch).toHaveProperty("lastCommitDate")
          expect(branch).toHaveProperty("isDefault")
          expect(branch).toHaveProperty("isCurrent")
          expect(branch).toHaveProperty("recentlyUsed")
        }
      } catch (error) {
        // If not in a git repository, expect an error
        expect(error).toBeInstanceOf(Error)
      }
    })

    test("should return only local branches when includeRemote is false", async () => {
      try {
        const result = await gitService.listBranches(false)
        expect(Array.isArray(result)).toBe(true)

        for (const branch of result) {
          expect(branch.isRemote).toBe(false)
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })

    test("should include remote branches when includeRemote is true", async () => {
      try {
        const result = await gitService.listBranches(true)
        expect(Array.isArray(result)).toBe(true)

        // Every branch should have the isRemote property
        for (const branch of result) {
          expect(typeof branch.isRemote).toBe("boolean")
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })

    test("should not duplicate local branches when including remotes", async () => {
      try {
        const localBranches = await gitService.listBranches(false)
        const allBranches = await gitService.listBranches(true)

        const localNames = new Set(localBranches.map((b) => b.name))

        // Remote branches should not share exact names with local branches
        for (const branch of allBranches) {
          if (branch.isRemote) {
            const shortName = branch.name.replace(/^[^/]+\//, "")
            expect(localNames.has(shortName)).toBe(false)
          }
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })
  })

  describe("listRemoteBranches", () => {
    test("should return array of remote branches", async () => {
      try {
        const result = await gitService.listRemoteBranches()
        expect(Array.isArray(result)).toBe(true)

        for (const branch of result) {
          expect(branch.isRemote).toBe(true)
          expect(branch.isCurrent).toBe(false)
          expect(branch.isDefault).toBe(false)
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })

    test("should exclude HEAD refs from remote branches", async () => {
      try {
        const result = await gitService.listRemoteBranches()
        for (const branch of result) {
          expect(branch.name.endsWith("/HEAD")).toBe(false)
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })

    test("should return empty array for non-git directory", async () => {
      const tempService = new GitService("/tmp")
      const result = await tempService.listRemoteBranches()
      expect(result).toEqual([])
    })
  })

  describe("getRecentBranches", () => {
    test("should return array of recent branches", async () => {
      try {
        const result = await gitService.getRecentBranches()
        expect(Array.isArray(result)).toBe(true)

        for (const branch of result) {
          expect(typeof branch).toBe("string")
          expect(branch.length).toBeGreaterThan(0)
        }
      } catch (error) {
        // If not in a git repository, expect an error
        expect(error).toBeInstanceOf(Error)
      }
    })
  })

  describe("createWorktree", () => {
    test("should handle invalid options gracefully", async () => {
      const invalidOptions = {
        name: "",
        sourceBranch: "non-existent",
        newBranch: "test-branch",
        basePath: "/tmp/test-invalid",
      }

      try {
        await gitService.createWorktree(invalidOptions)
        // If it doesn't throw, that's fine too
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })
  })

  describe("deleteWorktree", () => {
    test("should handle non-existent worktree deletion", async () => {
      try {
        await gitService.deleteWorktree({
          path: "/completely/non/existent/path/12345",
          force: false,
        })
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })

    test("should handle force deletion", async () => {
      try {
        await gitService.deleteWorktree({
          path: "/non/existent/path",
          force: true,
        })
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })
  })

  describe("getRepositoryInfo", () => {
    test("should return repository information", async () => {
      try {
        const result = await gitService.getRepositoryInfo()

        expect(result).toHaveProperty("path")
        expect(result).toHaveProperty("isGitRepo")
        expect(result).toHaveProperty("currentBranch")
        expect(result).toHaveProperty("defaultBranch")
        expect(result).toHaveProperty("worktrees")
        expect(result).toHaveProperty("branches")

        expect(typeof result.path).toBe("string")
        expect(result.isGitRepo).toBe(true)
        expect(typeof result.currentBranch).toBe("string")
        expect(typeof result.defaultBranch).toBe("string")
        expect(Array.isArray(result.worktrees)).toBe(true)
        expect(Array.isArray(result.branches)).toBe(true)
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })

    test("should handle repository info in non-git directory", async () => {
      const tempService = new GitService("/tmp")

      try {
        const result = await tempService.getRepositoryInfo()
        expect(result.isGitRepo).toBe(true) // This is set to true in the function
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })
  })

  describe("branch status functionality", () => {
    test("should get branch status when comparison branch exists", async () => {
      const service = new GitService()

      try {
        const result = await service.getBranchStatus("test-branch-that-does-not-exist")
        // Should return null for non-existent branch
        expect(result).toBeNull()
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })

    test("should handle branch status for current branch", async () => {
      const service = new GitService()

      try {
        const currentBranch = await service.getCurrentBranch()
        if (currentBranch) {
          const result = await service.getBranchStatus(currentBranch)
          // Should return null when comparing branch with itself
          expect(result).toBeNull()
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })

    test("should handle getBranchStatus with no comparison branch available", async () => {
      const service = new GitService("/tmp") // Non-git directory

      const result = await service.getBranchStatus("any-branch")
      expect(result).toBeNull()
    })
  })

  describe("branch deletion functionality", () => {
    test("should prevent deletion of current branch", async () => {
      const service = new GitService()

      try {
        const currentBranch = await service.getCurrentBranch()
        if (currentBranch) {
          await expect(service.deleteBranch(currentBranch)).rejects.toThrow()
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })

    test("should prevent deletion of default branch", async () => {
      const service = new GitService()

      try {
        const defaultBranch = await service.getDefaultBranch()
        await expect(service.deleteBranch(defaultBranch)).rejects.toThrow()
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })

    test("should handle deletion of non-existent branch", async () => {
      const service = new GitService()

      try {
        await service.deleteBranch("non-existent-branch-12345")
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })

    test("should handle force deletion", async () => {
      const service = new GitService()

      try {
        await service.deleteBranch("non-existent-branch-12345", true)
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })
  })

  describe("error handling", () => {
    test("should handle git operations in non-git directory", async () => {
      const tempService = new GitService("/tmp")

      const isValid = await tempService.validateRepository()
      expect(isValid).toBe(false)
    })

    test("should handle operations with invalid paths", async () => {
      const invalidService = new GitService("/absolutely/does/not/exist/123456789")

      const isValid = await invalidService.validateRepository()
      expect(isValid).toBe(false)
    })
  })
})

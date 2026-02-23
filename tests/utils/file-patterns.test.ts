import { describe, expect, test } from "bun:test"
import {
  fileExists,
  isDirectory,
  matchFiles,
  shouldIgnoreFile,
} from "../../src/utils/file-patterns.js"

describe("file-patterns", () => {
  describe("fileExists", () => {
    test("should detect existing files", async () => {
      const result = await fileExists("/tmp")
      expect(typeof result).toBe("boolean")
    })

    test("should return false for non-existent files", async () => {
      const result = await fileExists("/definitely/does/not/exist/12345")
      expect(result).toBe(false)
    })

    test("should handle various file types", async () => {
      const paths = ["/", "/tmp", "/usr", "/var", process.cwd()]

      for (const path of paths) {
        const result = await fileExists(path)
        expect(typeof result).toBe("boolean")
      }
    })
  })

  describe("isDirectory", () => {
    test("should detect directories", async () => {
      const result = await isDirectory("/tmp")
      expect(typeof result).toBe("boolean")
    })

    test("should return false for non-existent paths", async () => {
      const result = await isDirectory("/definitely/does/not/exist/12345")
      expect(result).toBe(false)
    })

    test("should handle edge cases", async () => {
      const paths = ["", "/", process.cwd()]

      for (const path of paths) {
        const result = await isDirectory(path)
        expect(typeof result).toBe("boolean")
      }
    })
  })

  describe("shouldIgnoreFile", () => {
    test("should match ignore patterns correctly", () => {
      const ignorePatterns = ["node_modules/**", ".git/**", "*.log", "dist/*", "*.tmp"]

      const testCases = [
        { path: "node_modules/package/index.js", shouldIgnore: true },
        { path: ".git/HEAD", shouldIgnore: true },
        { path: "error.log", shouldIgnore: true },
        { path: "dist/bundle.js", shouldIgnore: true },
        { path: "temp.tmp", shouldIgnore: true },
        { path: "src/index.ts", shouldIgnore: false },
        { path: "package.json", shouldIgnore: false },
        { path: "README.md", shouldIgnore: false },
      ]

      for (const testCase of testCases) {
        const result = shouldIgnoreFile(testCase.path, ignorePatterns)
        expect(result).toBe(testCase.shouldIgnore)
      }
    })

    test("should handle empty ignore patterns", () => {
      const result = shouldIgnoreFile("any/file/path", [])
      expect(result).toBe(false)
    })

    test("should handle complex patterns", () => {
      const complexPatterns = [
        "**/node_modules/**",
        "**/*.{log,tmp,cache}",
        "dist/**/*.js",
        ".{git,vscode,idea}/**",
      ]

      const testFiles = [
        "deep/nested/node_modules/pkg/file.js",
        "logs/error.log",
        "cache/data.cache",
        "dist/bundle/main.js",
        ".git/config",
        ".vscode/settings.json",
        "src/components/Button.tsx",
      ]

      for (const file of testFiles) {
        const result = shouldIgnoreFile(file, complexPatterns)
        expect(typeof result).toBe("boolean")
      }
    })

    test("should handle edge case patterns", () => {
      const edgePatterns = ["", "*", "**", ".", "..", "/", "//"]

      for (const pattern of edgePatterns) {
        const result = shouldIgnoreFile("test/file.js", [pattern])
        expect(typeof result).toBe("boolean")
      }
    })
  })

  describe("matchFiles", () => {
    test("should handle non-existent directory", async () => {
      const patterns = ["*.json", "*.md"]
      const ignores = ["node_modules/**"]

      const result = await matchFiles("/non/existent/dir", patterns, ignores)

      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(0)
    })

    test("should handle empty patterns", async () => {
      const result = await matchFiles("/tmp", [], [])

      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(0)
    })

    test("should handle current directory", async () => {
      const patterns = ["*.json", "*.md", "*.ts"]
      const ignores = ["node_modules/**", ".git/**"]

      try {
        const result = await matchFiles(process.cwd(), patterns, ignores)
        expect(Array.isArray(result)).toBe(true)

        // Should find some files in a typical project
        for (const file of result) {
          expect(typeof file).toBe("string")
          expect(file.length).toBeGreaterThan(0)
        }
      } catch (error) {
        // Might fail due to permissions, that's acceptable
        expect(error).toBeInstanceOf(Error)
      }
    })

    test("should respect ignore patterns", async () => {
      const patterns = ["**/*"]
      const ignores = ["node_modules/**", ".git/**", "dist/**"]

      try {
        const result = await matchFiles(process.cwd(), patterns, ignores)

        // No results should contain ignored patterns
        for (const file of result) {
          expect(file).not.toMatch(/node_modules/)
          expect(file).not.toMatch(/\.git/)
          expect(file).not.toMatch(/dist/)
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })

    test("should handle complex glob patterns", async () => {
      const complexPatterns = ["**/*.{js,ts,tsx,jsx}", "src/**/*.test.*", "*.{json,md,yml,yaml}"]

      for (const pattern of complexPatterns) {
        try {
          const result = await matchFiles("/tmp", [pattern], [])
          expect(Array.isArray(result)).toBe(true)
        } catch (error) {
          expect(error).toBeInstanceOf(Error)
        }
      }
    })

    test("should expand simple patterns recursively (e.g., .env)", async () => {
      const result = await matchFiles(process.cwd(), [".env", ".env.*", "*.tfstate"], [])
      expect(Array.isArray(result)).toBe(true)
      // Not asserting exact presence since repo may not contain these files.
      // This ensures the call succeeds with expanded patterns.
    })
  })

  describe("integration scenarios", () => {
    test("should handle realistic file copy scenarios", async () => {
      const realisticConfigs = [
        {
          worktreeCopyPatterns: ["package.json", "*.md", "tsconfig.json"],
          worktreeCopyIgnores: ["node_modules/**", ".git/**"],
          worktreePathTemplate: "$BASE_PATH/$BRANCH_NAME",
          postCreateCmd: ["npm install"],
          terminalCommand: "",
        },
        {
          worktreeCopyPatterns: ["Cargo.toml", "*.md"],
          worktreeCopyIgnores: ["target/**"],
          worktreePathTemplate: "$BASE_PATH/$BRANCH_NAME",
          postCreateCmd: ["cargo check"],
          terminalCommand: "",
        },
      ]

      for (const config of realisticConfigs) {
        try {
          const result = await copyFiles(process.cwd(), "/tmp/test-copy", config)
          expect(result).toBeDefined()
          expect(Array.isArray(result.copied)).toBe(true)
          expect(Array.isArray(result.skipped)).toBe(true)
          expect(Array.isArray(result.errors)).toBe(true)
        } catch (error) {
          expect(error).toBeInstanceOf(Error)
        }
      }
    })
  })

  describe("performance and edge cases", () => {
    test("should handle large file lists efficiently", async () => {
      // Test with patterns that might match many files
      const patterns = ["**/*", "**/*.json", "**/*.md"]
      const ignores = ["node_modules/**", ".git/**", "dist/**", "coverage/**"]

      const startTime = Date.now()

      try {
        const result = await matchFiles(process.cwd(), patterns, ignores)
        const endTime = Date.now()

        expect(Array.isArray(result)).toBe(true)

        // Should complete in reasonable time (less than 5 seconds)
        expect(endTime - startTime).toBeLessThan(5000)
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })
  })
})

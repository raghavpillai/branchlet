import { describe, expect, test } from "bun:test"
import { ShellIntegrationService } from "../../src/services/shell-integration-service.js"

// Access private static methods for testing
// biome-ignore lint/suspicious/noExplicitAny: test access to private methods
const Service = ShellIntegrationService as any

const WRAPPER_SIGNATURE = "# Branchlet setup: added on"
const SETUP_END_MARKER = "# End Branchlet setup"

describe("ShellIntegrationService", () => {
  describe("generateSetupBlock", () => {
    test("should include signature and end marker", () => {
      const block = Service.generateSetupBlock("bash", "branchlet")
      expect(block).toContain(WRAPPER_SIGNATURE)
      expect(block).toContain(SETUP_END_MARKER)
    })

    test("should start with signature and end with marker", () => {
      const block: string = Service.generateSetupBlock("zsh", "branchlet")
      const lines = block.split("\n")
      expect(lines[0]).toContain(WRAPPER_SIGNATURE)
      expect(lines[lines.length - 1]).toBe(SETUP_END_MARKER)
    })

    test("should include the wrapper function", () => {
      const block = Service.generateSetupBlock("bash", "branchlet")
      expect(block).toContain("branchlet() {")
      expect(block).toContain("command branchlet --from-wrapper")
      expect(block).toContain('builtin cd "$dir"')
      expect(block).toContain('command branchlet "$@"')
    })

    test("should use custom command name in wrapper", () => {
      const block = Service.generateSetupBlock("bash", "myapp")
      expect(block).toContain("myapp() {")
      expect(block).toContain("command myapp --from-wrapper")
      expect(block).toContain('command myapp "$@"')
    })

    test("should include bash completions for bash shell", () => {
      const block = Service.generateSetupBlock("bash", "branchlet")
      expect(block).toContain("_branchlet_completions()")
      expect(block).toContain("complete -F _branchlet_completions branchlet")
      expect(block).toContain("COMPREPLY")
      expect(block).toContain("COMP_WORDS")
    })

    test("should include zsh completions for zsh shell", () => {
      const block = Service.generateSetupBlock("zsh", "branchlet")
      expect(block).toContain("_branchlet()")
      expect(block).toContain("compdef _branchlet branchlet")
      expect(block).toContain("_arguments")
      expect(block).toContain("_describe")
    })

    test("bash completions should not contain zsh-specific syntax", () => {
      const block = Service.generateSetupBlock("bash", "branchlet")
      expect(block).not.toContain("compdef")
      expect(block).not.toContain("_arguments")
      expect(block).not.toContain("_describe")
    })

    test("zsh completions should not contain bash-specific syntax", () => {
      const block = Service.generateSetupBlock("zsh", "branchlet")
      expect(block).not.toContain("COMPREPLY")
      expect(block).not.toContain("COMP_WORDS")
      expect(block).not.toContain("_branchlet_completions")
    })

    test("should include date in signature", () => {
      const block = Service.generateSetupBlock("bash", "branchlet")
      const dateMatch = block.match(/# Branchlet setup: added on (\d{4}-\d{2}-\d{2})/)
      expect(dateMatch).not.toBeNull()
    })

    test("bash completions should complete subcommands", () => {
      const block = Service.generateSetupBlock("bash", "branchlet")
      expect(block).toContain("create")
      expect(block).toContain("list")
      expect(block).toContain("delete")
      expect(block).toContain("settings")
    })

    test("zsh completions should have command descriptions", () => {
      const block = Service.generateSetupBlock("zsh", "branchlet")
      expect(block).toContain("create:Create a new worktree")
      expect(block).toContain("list:List all worktrees")
      expect(block).toContain("delete:Delete a worktree")
      expect(block).toContain("settings:Manage configuration")
    })

    test("bash completions should complete flags", () => {
      const block = Service.generateSetupBlock("bash", "branchlet")
      expect(block).toContain("--help")
      expect(block).toContain("--version")
      expect(block).toContain("--mode")
      expect(block).toContain("--from-wrapper")
    })

    test("zsh completions should complete flags", () => {
      const block = Service.generateSetupBlock("zsh", "branchlet")
      expect(block).toContain("--help")
      expect(block).toContain("--version")
      expect(block).toContain("--mode")
      expect(block).toContain("--from-wrapper")
    })

    test("bash template escaping should produce valid shell syntax", () => {
      const block: string = Service.generateSetupBlock("bash", "branchlet")
      // Template literal \${...} should produce literal ${...} in output
      // biome-ignore lint/suspicious/noTemplateCurlyInString: testing shell variable output
      expect(block).toContain("${COMP_WORDS[COMP_CWORD]}")
      // biome-ignore lint/suspicious/noTemplateCurlyInString: testing shell variable output
      expect(block).toContain("${COMP_CWORD}")
      // biome-ignore lint/suspicious/noTemplateCurlyInString: testing shell variable output
      expect(block).toContain("${commands}")
      // biome-ignore lint/suspicious/noTemplateCurlyInString: testing shell variable output
      expect(block).toContain("${flags}")
      // biome-ignore lint/suspicious/noTemplateCurlyInString: testing shell variable output
      expect(block).toContain("${cur}")
      // Should NOT contain JS template artifacts
      expect(block).not.toContain("\\${")
    })

    test("zsh template escaping should produce valid shell syntax", () => {
      const block: string = Service.generateSetupBlock("zsh", "branchlet")
      // Backslash line continuations should be single \
      expect(block).toContain("_arguments -C \\")
      expect(block).not.toContain("_arguments -C \\\\")
      // Shell variables should be literal
      expect(block).toContain("$state")
    })
  })

  describe("findSetupEndIndex", () => {
    test("should find end marker", () => {
      const lines = [
        "# Branchlet setup: added on 2026-01-01",
        "branchlet() {",
        "  echo hello",
        "}",
        "# End Branchlet setup",
      ]
      const result = Service.findSetupEndIndex(lines, 0)
      expect(result).toBe(4)
    })

    test("should fallback to last closing brace without end marker", () => {
      const lines = [
        "# Branchlet setup: added on 2025-01-01",
        "branchlet() {",
        "  if [ true ]; then",
        "    echo hi",
        "  fi",
        "}",
      ]
      const result = Service.findSetupEndIndex(lines, 0)
      expect(result).toBe(5)
    })

    test("should find last brace in old wrapper with nested structures", () => {
      const lines = [
        "# Branchlet setup: added on 2025-01-01",
        "_completions() {",
        "  echo completions",
        "}",
        "branchlet() {",
        "  echo wrapper",
        "}",
      ]
      const result = Service.findSetupEndIndex(lines, 0)
      // Should find the LAST }, which is the wrapper closing brace
      expect(result).toBe(6)
    })

    test("should respect 50-line search limit", () => {
      const lines = ["# Branchlet setup: added on 2025-01-01"]
      // Fill with 60 empty lines then a brace
      for (let i = 0; i < 60; i++) lines.push("")
      lines.push("}")

      const result = Service.findSetupEndIndex(lines, 0)
      // Should NOT find the brace beyond 50 lines, returns startIndex
      expect(result).toBe(0)
    })

    test("should prefer end marker over closing brace", () => {
      const lines = [
        "# Branchlet setup: added on 2026-01-01",
        "branchlet() {",
        "  echo hello",
        "}",
        "# End Branchlet setup",
        "some_other_function() {",
        "}",
      ]
      const result = Service.findSetupEndIndex(lines, 0)
      // Should find the end marker at index 4, not the later brace
      expect(result).toBe(4)
    })

    test("should handle start index in middle of file", () => {
      const lines = [
        "# some config",
        "export FOO=bar",
        "# Branchlet setup: added on 2026-01-01",
        "branchlet() {",
        "}",
        "# End Branchlet setup",
        "# more config",
      ]
      const result = Service.findSetupEndIndex(lines, 2)
      expect(result).toBe(5)
    })
  })

  describe("install/remove logic", () => {
    // Test the splice/replacement logic by simulating what install() and remove() do

    test("install upgrade should not leave duplicates", () => {
      const existingContent = [
        "# before",
        "",
        "# Branchlet setup: added on 2026-01-01",
        "_branchlet() { }",
        "branchlet() {",
        "  echo old",
        "}",
        "# End Branchlet setup",
        "",
        "# after",
      ].join("\n")

      const lines = existingContent.split("\n")
      const startIndex = lines.findIndex((l) => l.includes(WRAPPER_SIGNATURE))
      const endIndex = Service.findSetupEndIndex(lines, startIndex)

      // Simulate install's splice
      lines.splice(startIndex, endIndex - startIndex + 1)
      const result = lines.join("\n")

      expect(result).not.toContain(WRAPPER_SIGNATURE)
      expect(result).toContain("# before")
      expect(result).toContain("# after")
    })

    test("remove should clean surrounding blank lines", () => {
      const existingContent = [
        "# before",
        "",
        "# Branchlet setup: added on 2026-01-01",
        "branchlet() { }",
        "# End Branchlet setup",
        "",
        "# after",
      ].join("\n")

      const lines = existingContent.split("\n")
      const startIndex = lines.findIndex((l) => l.includes(WRAPPER_SIGNATURE))
      const endIndex = Service.findSetupEndIndex(lines, startIndex)

      // Simulate remove's blank line cleanup
      const removeStart =
        startIndex > 0 && lines[startIndex - 1]?.trim() === "" ? startIndex - 1 : startIndex
      const removeEnd =
        endIndex + 1 < lines.length && lines[endIndex + 1]?.trim() === "" ? endIndex + 1 : endIndex

      lines.splice(removeStart, removeEnd - removeStart + 1)
      const result = lines.join("\n")

      expect(result).not.toContain(WRAPPER_SIGNATURE)
      expect(result).toContain("# before")
      expect(result).toContain("# after")
      // Should not have excessive blank lines
      expect(result).not.toContain("\n\n\n")
    })

    test("remove should handle block at start of file", () => {
      const lines = [
        "# Branchlet setup: added on 2026-01-01",
        "branchlet() { }",
        "# End Branchlet setup",
        "",
        "# after",
      ]

      const startIndex = 0
      const endIndex = Service.findSetupEndIndex(lines, startIndex)

      const removeStart =
        startIndex > 0 && lines[startIndex - 1]?.trim() === "" ? startIndex - 1 : startIndex
      const removeEnd =
        endIndex + 1 < lines.length && lines[endIndex + 1]?.trim() === "" ? endIndex + 1 : endIndex

      // removeStart should be 0 (no line before), not -1
      expect(removeStart).toBe(0)

      lines.splice(removeStart, removeEnd - removeStart + 1)
      const result = lines.join("\n")

      expect(result).not.toContain(WRAPPER_SIGNATURE)
      expect(result).toContain("# after")
    })

    test("remove should handle block at end of file", () => {
      const lines = [
        "# before",
        "",
        "# Branchlet setup: added on 2026-01-01",
        "branchlet() { }",
        "# End Branchlet setup",
      ]

      const startIndex = 2
      const endIndex = Service.findSetupEndIndex(lines, startIndex)

      const removeStart =
        startIndex > 0 && lines[startIndex - 1]?.trim() === "" ? startIndex - 1 : startIndex
      const removeEnd =
        endIndex + 1 < lines.length && lines[endIndex + 1]?.trim() === "" ? endIndex + 1 : endIndex

      // removeEnd should be 4 (no line after), not 5
      expect(removeEnd).toBe(4)

      lines.splice(removeStart, removeEnd - removeStart + 1)
      const result = lines.join("\n")

      expect(result).toBe("# before")
    })
  })

  describe("detectShell", () => {
    test("should detect zsh", () => {
      const originalShell = process.env.SHELL
      process.env.SHELL = "/bin/zsh"
      expect(Service.detectShell()).toBe("zsh")
      process.env.SHELL = originalShell
    })

    test("should detect bash", () => {
      const originalShell = process.env.SHELL
      process.env.SHELL = "/bin/bash"
      expect(Service.detectShell()).toBe("bash")
      process.env.SHELL = originalShell
    })

    test("should return unknown for other shells", () => {
      const originalShell = process.env.SHELL
      process.env.SHELL = "/usr/bin/fish"
      expect(Service.detectShell()).toBe("unknown")
      process.env.SHELL = originalShell
    })

    test("should return unknown when SHELL is unset", () => {
      const originalShell = process.env.SHELL
      delete process.env.SHELL
      expect(Service.detectShell()).toBe("unknown")
      process.env.SHELL = originalShell
    })
  })

  describe("getConfigPath", () => {
    test("should return .zshrc for zsh", () => {
      const path = Service.getConfigPath("zsh")
      expect(path).toContain(".zshrc")
    })

    test("should return .bashrc for bash", () => {
      const path = Service.getConfigPath("bash")
      expect(path).toContain(".bashrc")
    })

    test("should return null for unknown shell", () => {
      expect(Service.getConfigPath("unknown")).toBeNull()
    })
  })
})

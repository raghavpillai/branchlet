import { existsSync } from "node:fs"
import { readFile, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"

export interface ShellIntegrationStatus {
  isInstalled: boolean
  shell: "zsh" | "bash" | "unknown"
  configPath: string | null
  reason?: string
}

// biome-ignore lint/complexity/noStaticOnlyClass: Service class pattern
export class ShellIntegrationService {
  private static readonly WRAPPER_SIGNATURE = "# Branchlet setup: added on"
  private static readonly SETUP_END_MARKER = "# End Branchlet setup"

  /**
   * Detects if shell integration is installed
   */
  static async detect(): Promise<ShellIntegrationStatus> {
    const shell = ShellIntegrationService.detectShell()
    const configPath = ShellIntegrationService.getConfigPath(shell)

    if (!configPath) {
      return {
        isInstalled: false,
        shell,
        configPath: null,
        reason: "Could not determine shell config file",
      }
    }

    if (!existsSync(configPath)) {
      return {
        isInstalled: false,
        shell,
        configPath,
        reason: "Config file does not exist",
      }
    }

    try {
      const content = await readFile(configPath, "utf-8")
      const isInstalled = content.includes(ShellIntegrationService.WRAPPER_SIGNATURE)

      if (isInstalled) {
        return {
          isInstalled,
          shell,
          configPath,
        }
      }

      return {
        isInstalled,
        shell,
        configPath,
        reason: "Shell integration not found in config",
      }
    } catch (error) {
      return {
        isInstalled: false,
        shell,
        configPath,
        reason: `Failed to read config: ${error}`,
      }
    }
  }

  /**
   * Installs shell integration to the user's shell config
   */
  static async install(shell: "zsh" | "bash", commandName = "branchlet"): Promise<void> {
    const configPath = ShellIntegrationService.getConfigPath(shell)
    if (!configPath) {
      throw new Error("Could not determine shell config path")
    }

    const setupBlock = ShellIntegrationService.generateSetupBlock(shell, commandName)

    // Check if already installed
    if (existsSync(configPath)) {
      const content = await readFile(configPath, "utf-8")
      if (content.includes(ShellIntegrationService.WRAPPER_SIGNATURE)) {
        const lines = content.split("\n")
        const startIndex = lines.findIndex((line) =>
          line.includes(ShellIntegrationService.WRAPPER_SIGNATURE)
        )

        if (startIndex !== -1) {
          const endIndex = ShellIntegrationService.findSetupEndIndex(lines, startIndex)

          // Remove old integration
          lines.splice(startIndex, endIndex - startIndex + 1)
          await writeFile(configPath, lines.join("\n"), "utf-8")
        }
      }
    }

    // Append new integration
    const contentToAppend = `\n${setupBlock}\n`

    if (existsSync(configPath)) {
      await writeFile(configPath, contentToAppend, { flag: "a", encoding: "utf-8" })
    } else {
      await writeFile(configPath, contentToAppend, "utf-8")
    }
  }

  /**
   * Removes shell integration from config file
   */
  static async remove(shell: "zsh" | "bash"): Promise<void> {
    const configPath = ShellIntegrationService.getConfigPath(shell)
    if (!configPath || !existsSync(configPath)) {
      return
    }

    const content = await readFile(configPath, "utf-8")
    if (!content.includes(ShellIntegrationService.WRAPPER_SIGNATURE)) {
      return
    }

    const lines = content.split("\n")
    const startIndex = lines.findIndex((line) =>
      line.includes(ShellIntegrationService.WRAPPER_SIGNATURE)
    )

    if (startIndex !== -1) {
      const endIndex = ShellIntegrationService.findSetupEndIndex(lines, startIndex)

      // Remove the integration block including surrounding blank lines
      const removeStart =
        startIndex > 0 && lines[startIndex - 1]?.trim() === "" ? startIndex - 1 : startIndex
      const removeEnd =
        endIndex + 1 < lines.length && lines[endIndex + 1]?.trim() === "" ? endIndex + 1 : endIndex

      lines.splice(removeStart, removeEnd - removeStart + 1)
      await writeFile(configPath, lines.join("\n"), "utf-8")
    }
  }

  /**
   * Detects the user's shell from environment
   */
  private static detectShell(): "zsh" | "bash" | "unknown" {
    const shell = process.env.SHELL?.toLowerCase() || ""

    if (shell.includes("zsh")) {
      return "zsh"
    }
    if (shell.includes("bash")) {
      return "bash"
    }

    return "unknown"
  }

  /**
   * Gets the config file path for the given shell
   */
  private static getConfigPath(shell: "zsh" | "bash" | "unknown"): string | null {
    const home = homedir()

    switch (shell) {
      case "zsh":
        return join(home, ".zshrc")
      case "bash":
        return join(home, ".bashrc")
      default:
        return null
    }
  }

  /**
   * Finds the end index of the setup block, using end marker with fallback
   */
  private static findSetupEndIndex(lines: string[], startIndex: number): number {
    // Look for end marker first
    for (let i = startIndex + 1; i < lines.length; i++) {
      if (lines[i]?.includes(ShellIntegrationService.SETUP_END_MARKER)) {
        return i
      }
    }

    // Fallback for old installations without end marker: find last closing brace
    let endIndex = startIndex
    for (let i = startIndex + 1; i < lines.length; i++) {
      if (lines[i]?.trim() === "}") {
        endIndex = i
      }
      // Stop searching after a reasonable distance
      if (i - startIndex > 50) break
    }
    return endIndex
  }

  /**
   * Generates the full setup block including completions and wrapper function
   */
  private static generateSetupBlock(shell: "zsh" | "bash", commandName: string): string {
    const today = new Date().toISOString().split("T")[0]
    const completions =
      shell === "zsh"
        ? ShellIntegrationService.generateZshCompletions()
        : ShellIntegrationService.generateBashCompletions()

    return `${ShellIntegrationService.WRAPPER_SIGNATURE} ${today}
${completions}
${commandName}() {
  if [ $# -eq 0 ]; then
    local dir=$(FORCE_COLOR=3 command ${commandName} --from-wrapper)
    if [ -n "$dir" ]; then
      builtin cd "$dir" && echo "Branchlet: Navigated to $(pwd)"
    fi
  else
    command ${commandName} "$@"
  fi
}
${ShellIntegrationService.SETUP_END_MARKER}`
  }

  private static generateBashCompletions(): string {
    return `_branchlet_completions() {
  local cur="\${COMP_WORDS[COMP_CWORD]}"
  local commands="create list delete settings"
  local flags="--help --version --mode --from-wrapper"
  if [[ \${COMP_CWORD} -eq 1 ]]; then
    COMPREPLY=($(compgen -W "\${commands} \${flags}" -- "\${cur}"))
  elif [[ "\${COMP_WORDS[1]}" == "--mode" || "\${COMP_WORDS[1]}" == "-m" ]]; then
    COMPREPLY=($(compgen -W "menu create list delete settings" -- "\${cur}"))
  fi
}
complete -F _branchlet_completions branchlet`
  }

  private static generateZshCompletions(): string {
    return `_branchlet() {
  local -a commands
  commands=(
    'create:Create a new worktree'
    'list:List all worktrees'
    'delete:Delete a worktree'
    'settings:Manage configuration'
  )
  _arguments -C \\
    '(-h --help)'{-h,--help}'[Show help]' \\
    '(-v --version)'{-v,--version}'[Show version]' \\
    '(-m --mode)'{-m,--mode}'[Set mode]:mode:(menu create list delete settings)' \\
    '--from-wrapper[Called from shell wrapper]' \\
    '1:command:->command'
  case "$state" in
    command)
      _describe -t commands 'branchlet commands' commands
      ;;
  esac
}
compdef _branchlet branchlet`
  }
}

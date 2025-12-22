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

export class ShellIntegrationService {
  private static readonly WRAPPER_SIGNATURE = "# Branchlet setup: added on"

  /**
   * Detects if shell integration is installed
   */
  static async detect(): Promise<ShellIntegrationStatus> {
    const shell = this.detectShell()
    const configPath = this.getConfigPath(shell)

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
      const isInstalled = content.includes(this.WRAPPER_SIGNATURE)

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
    const configPath = this.getConfigPath(shell)
    if (!configPath) {
      throw new Error("Could not determine shell config path")
    }

    const wrapperFunction = this.generateWrapperFunction(commandName)

    // Check if already installed
    if (existsSync(configPath)) {
      const content = await readFile(configPath, "utf-8")
      if (content.includes(this.WRAPPER_SIGNATURE)) {
        // Already installed, update it
        const lines = content.split("\n")
        const startIndex = lines.findIndex((line) => line.includes(this.WRAPPER_SIGNATURE))

        if (startIndex !== -1) {
          // Find the end of the function (closing brace)
          let endIndex = startIndex
          for (let i = startIndex + 1; i < lines.length; i++) {
            if (lines[i]?.trim() === "}") {
              endIndex = i
              break
            }
          }

          // Remove old integration
          lines.splice(startIndex, endIndex - startIndex + 1)
          await writeFile(configPath, lines.join("\n"), "utf-8")
        }
      }
    }

    // Append new integration
    const contentToAppend = `\n${wrapperFunction}\n`

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
    const configPath = this.getConfigPath(shell)
    if (!configPath || !existsSync(configPath)) {
      return
    }

    const content = await readFile(configPath, "utf-8")
    if (!content.includes(this.WRAPPER_SIGNATURE)) {
      return
    }

    const lines = content.split("\n")
    const startIndex = lines.findIndex((line) => line.includes(this.WRAPPER_SIGNATURE))

    if (startIndex !== -1) {
      // Find the end of the function (closing brace)
      let endIndex = startIndex
      for (let i = startIndex + 1; i < lines.length; i++) {
        if (lines[i]?.trim() === "}") {
          endIndex = i
          break
        }
      }

      // Remove the integration block
      lines.splice(startIndex - 1, endIndex - startIndex + 3) // Include blank lines before/after

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
   * Generates the shell wrapper function
   */
  private static generateWrapperFunction(commandName: string): string {
    const today = new Date().toISOString().split("T")[0]

    return `# Branchlet setup: added on ${today}
${commandName}() {
  if [ $# -eq 0 ]; then
    local dir=\$(FORCE_COLOR=3 command ${commandName} --cd)
    if [ -n "\$dir" ]; then
      cd "\$dir" && echo "📍 \$(pwd)"
    fi
  else
    command ${commandName} "$@"
  fi
}`
  }
}

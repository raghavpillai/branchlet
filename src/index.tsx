#!/usr/bin/env node
import { render } from "ink"
import minimist from "minimist"
import packageJson from "../package.json" with { type: "json" }
import { App } from "./components/app.js"
import { MESSAGES } from "./constants/index.js"
import type { AppMode } from "./types/index.js"

const VERSION = packageJson.version

function parseArguments(): { mode: AppMode; help: boolean } {
  const argv = minimist(process.argv.slice(2), {
    string: ["mode"],
    boolean: ["help", "version"],
    alias: {
      h: "help",
      v: "version",
      m: "mode",
    },
  })

  if (argv.help) {
    return { mode: "menu", help: true }
  }

  if (argv.version) {
    console.log(`Branchlet v${VERSION}`)
    process.exit(0)
  }

  const validModes: AppMode[] = ["menu", "create", "list", "delete", "settings"]
  let mode: AppMode = "menu"

  if (argv.mode && validModes.includes(argv.mode as AppMode)) {
    mode = argv.mode as AppMode
  }

  if (argv._.length > 0) {
    const command = argv._[0]
    if (validModes.includes(command as AppMode)) {
      mode = command as AppMode
    }
  }

  return { mode, help: false }
}

function showHelp(): void {
  console.log(`
${MESSAGES.WELCOME}

Usage:
  branchlet [command] [options]

Commands:
  create     Create a new worktree
  list       List all worktrees
  delete     Delete a worktree
  settings   Manage configuration
  (no command) Start interactive menu

Options:
  -h, --help     Show this help message
  -v, --version  Show version number
  -m, --mode     Set initial mode

Examples:
  branchlet                # Start interactive menu
  branchlet create         # Go directly to create worktree flow
  branchlet list           # List all worktrees
  branchlet delete         # Go directly to delete worktree flow
  branchlet settings       # Open settings menu

Configuration:
  The tool looks for configuration files in the following order:
  1. .branchlet.json in current directory
  2. ~/.branchlet/settings.json (global config)

For more information, visit: https://github.com/raghavpillai/git-worktree-manager
`)
}

function main(): void {
  const { mode, help } = parseArguments()

  if (help) {
    showHelp()
    process.exit(0)
  }

  let hasExited = false

  const { unmount } = render(
    <App
      initialMode={mode}
      onExit={() => {
        if (!hasExited) {
          hasExited = true
          unmount()
          process.exit(0)
        }
      }}
    />
  )

  process.on("SIGINT", () => {
    if (!hasExited) {
      hasExited = true
      unmount()
      process.exit(0)
    }
  })

  process.on("SIGTERM", () => {
    if (!hasExited) {
      hasExited = true
      unmount()
      process.exit(0)
    }
  })
}

// Always run main when this file is executed
main()

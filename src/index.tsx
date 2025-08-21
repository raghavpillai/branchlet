#!/usr/bin/env node
import { render } from "ink"
import minimist from "minimist"
import { App } from "./components/app.js"
import { MESSAGES } from "./constants/index.js"
import type { AppMode } from "./types/index.js"

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
    console.log("Brancher v0.1.0")
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
  brancher [command] [options]

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
  brancher                # Start interactive menu
  brancher create         # Go directly to create worktree flow
  brancher list           # List all worktrees
  brancher delete         # Go directly to delete worktree flow
  brancher settings       # Open settings menu

Configuration:
  The tool looks for configuration files in the following order:
  1. .brancher.json in current directory
  2. ~/.brancher/settings.json (global config)

For more information, visit: https://github.com/your-username/brancher
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

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

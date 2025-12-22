#!/usr/bin/env node
import { render } from "ink"
import minimist from "minimist"
import packageJson from "../package.json" with { type: "json" }
import { App } from "./components/app.js"
import { MESSAGES } from "./constants/index.js"
import type { AppMode } from "./types/index.js"

const VERSION = packageJson.version

function parseArguments(): { mode: AppMode; help: boolean; cdMode: boolean } {
  const argv = minimist(process.argv.slice(2), {
    string: ["mode"],
    boolean: ["help", "version", "cd"],
    alias: {
      h: "help",
      v: "version",
      m: "mode",
    },
  })

  if (argv.help) {
    return { mode: "menu", help: true, cdMode: false }
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

  const cdMode = argv.cd === true

  return { mode, help: false, cdMode }
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
  --cd           Quick directory change mode (outputs path for shell wrapper)

Examples:
  branchlet                # Start interactive menu
  branchlet create         # Go directly to create worktree flow
  branchlet list           # List all worktrees
  branchlet list --cd      # Select worktree and output path (for shell integration)
  branchlet delete         # Go directly to delete worktree flow
  branchlet settings       # Open settings menu

Shell Integration:
  Run 'branchlet' and select "Setup Shell Integration" to enable quick directory switching.
  After setup, just run 'branchlet' to quickly change to any worktree directory.

Configuration:
  The tool looks for configuration files in the following order:
  1. .branchlet.json in current directory
  2. ~/.branchlet/settings.json (global config)

For more information, visit: https://github.com/raghavpillai/git-worktree-manager
`)
}

function main(): void {
  const { mode, help, cdMode } = parseArguments()

  if (help) {
    showHelp()
    process.exit(0)
  }

  let hasExited = false

  let inkStdin = process.stdin
  let inkStdout = process.stdout

  if (cdMode) {
    process.env.FORCE_COLOR = "3"

    try {
      const fs = require("node:fs")
      const tty = require("node:tty")
      const ttyFd = fs.openSync("/dev/tty", "r+")
      inkStdin = new tty.ReadStream(ttyFd) as any
      inkStdout = new tty.WriteStream(ttyFd) as any

      Object.defineProperty(inkStdout, "isTTY", { value: true })
      Object.defineProperty(inkStdout, "hasColors", { value: () => true })
      Object.defineProperty(inkStdout, "getColorDepth", { value: () => 24 })
    } catch (error) {
      console.error("Could not open /dev/tty:", error)
    }
  }

  const { unmount } = render(
    <App
      initialMode={mode}
      cdMode={cdMode}
      onExit={() => {
        if (!hasExited) {
          hasExited = true
          unmount()
          process.exit(0)
        }
      }}
    />,
    {
      stdin: inkStdin,
      stdout: inkStdout,
      stderr: process.stderr,
    }
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

main()

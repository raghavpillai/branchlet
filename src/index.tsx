#!/usr/bin/env node
import { render } from "ink"
import minimist from "minimist"
import packageJson from "../package.json" with { type: "json" }
import { App } from "./components/app.js"
import { MESSAGES } from "./constants/index.js"
import type { AppMode } from "./types/index.js"
import {
  getBashCompletion,
  getCompletionHelp,
  getFishCompletion,
  getZshCompletion,
} from "./utils/completion-scripts.js"

const VERSION = packageJson.version

function parseArguments(): { mode: AppMode; help: boolean; isFromWrapper: boolean } {
  const argv = minimist(process.argv.slice(2), {
    string: ["mode"],
    boolean: ["help", "version", "from-wrapper"],
    alias: {
      h: "help",
      v: "version",
      m: "mode",
    },
  })

  if (argv.help) {
    return { mode: "menu", help: true, isFromWrapper: false }
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

  const isFromWrapper = argv["from-wrapper"] === true

  return { mode, help: false, isFromWrapper }
}

function handleCompletion(): void {
  const args = process.argv.slice(2)
  if (args[0] !== "completion") return

  const shell = args[1]
  const showHelp = args.includes("--help") || args.includes("-h")

  if (showHelp || !shell) {
    console.log(getCompletionHelp())
    process.exit(0)
  }

  switch (shell) {
    case "bash":
      console.log(getBashCompletion())
      break
    case "zsh":
      console.log(getZshCompletion())
      break
    case "fish":
      console.log(getFishCompletion())
      break
    default:
      console.error(`Unknown shell: ${shell}. Use bash, zsh, or fish.`)
      process.exit(1)
  }
  process.exit(0)
}

function showHelp(): void {
  console.log(`
${MESSAGES.WELCOME}

Usage:
  branchlet [command] [options]

Commands:
  create       Create a new worktree
  list         List all worktrees
  delete       Delete a worktree
  settings     Manage configuration
  completion   Generate shell completions
  (no command) Start interactive menu

Options:
  -h, --help     Show this help message
  -v, --version  Show version number
  -m, --mode     Set initial mode
  --from-wrapper Called from shell wrapper (outputs path to stdout)

Examples:
  branchlet                # Start interactive menu
  branchlet create         # Go directly to create worktree flow
  branchlet list           # List all worktrees
  branchlet --from-wrapper # Used by shell wrapper to enable directory switching
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
  handleCompletion()

  const { mode, help, isFromWrapper } = parseArguments()

  if (help) {
    showHelp()
    process.exit(0)
  }

  let hasExited = false

  let inkStdin: NodeJS.ReadStream = process.stdin
  let inkStdout: NodeJS.WriteStream = process.stdout

  if (isFromWrapper) {
    process.env.FORCE_COLOR = "3"

    try {
      const fs = require("node:fs")
      const tty = require("node:tty")
      const ttyFd = fs.openSync("/dev/tty", "r+")
      inkStdin = new tty.ReadStream(ttyFd) as unknown as NodeJS.ReadStream
      inkStdout = new tty.WriteStream(ttyFd) as unknown as NodeJS.WriteStream

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
      isFromWrapper={isFromWrapper}
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

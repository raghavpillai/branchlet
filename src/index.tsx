#!/usr/bin/env node
import { render } from "ink"
import minimist from "minimist"
import packageJson from "../package.json" with { type: "json" }
import type { CliArgs } from "./cli/index.js"
import { runCli } from "./cli/index.js"
import { App } from "./components/app.js"
import { MESSAGES } from "./constants/index.js"
import type { AppMode } from "./types/index.js"

const VERSION = packageJson.version

function parseArguments(): {
  mode: AppMode
  help: boolean
  isFromWrapper: boolean
  cliArgs: CliArgs | null
} {
  const argv = minimist(process.argv.slice(2), {
    string: ["mode", "name", "source", "branch", "path"],
    boolean: ["help", "version", "from-wrapper", "json", "force"],
    alias: {
      h: "help",
      v: "version",
      m: "mode",
      n: "name",
      s: "source",
      b: "branch",
      p: "path",
      f: "force",
    },
  })

  if (argv.help) {
    return { mode: "menu", help: true, isFromWrapper: false, cliArgs: null }
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

  // Detect non-interactive CLI mode
  const cliCommands = ["create", "list", "delete"] as const
  const isCliCommand = cliCommands.includes(mode as (typeof cliCommands)[number])
  const hasCliFlags =
    argv.name || argv.source || argv.branch || argv.path || argv.force || argv.json

  const isFromWrapper = argv["from-wrapper"] === true

  if (isCliCommand && hasCliFlags) {
    return {
      mode,
      help: false,
      isFromWrapper: false,
      cliArgs: {
        command: mode as CliArgs["command"],
        name: argv.name || undefined,
        source: argv.source || undefined,
        branch: argv.branch || undefined,
        path: argv.path || undefined,
        json: argv.json || false,
        force: argv.force || false,
      },
    }
  }

  return { mode, help: false, isFromWrapper, cliArgs: null }
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

Interactive Options:
  -h, --help     Show this help message
  -v, --version  Show version number
  -m, --mode     Set initial mode
  --from-wrapper Called from shell wrapper (outputs path to stdout)

Non-Interactive Options:
  -n, --name <name>      Worktree directory name (create, delete)
  -s, --source <branch>  Source branch (create)
  -b, --branch <branch>  New branch name; defaults to source (create)
  -p, --path <path>      Worktree path (delete)
  -f, --force            Force delete even with uncommitted changes (delete)
  --json                 Output as JSON (list)

Interactive Examples:
  branchlet                # Start interactive menu
  branchlet create         # Go directly to create worktree flow
  branchlet list           # List all worktrees interactively
  branchlet --from-wrapper # Used by shell wrapper to enable directory switching
  branchlet delete         # Go directly to delete worktree flow
  branchlet settings       # Open settings menu

Non-Interactive Examples:
  branchlet create -n my-feature -s main              # Create worktree from main
  branchlet create -n my-feature -s main -b feat/foo  # Create with new branch
  branchlet list --json                               # List worktrees as JSON
  branchlet delete -n my-feature                      # Delete worktree by name
  branchlet delete -p /path/to/worktree -f            # Force delete by path

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

async function main(): Promise<void> {
  const { mode, help, isFromWrapper, cliArgs } = parseArguments()

  if (help) {
    showHelp()
    process.exit(0)
  }

  // Non-interactive CLI mode
  if (cliArgs) {
    try {
      await runCli(cliArgs)
      process.exit(0)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      process.stderr.write(`Error: ${message}\n`)
      process.exit(1)
    }
  }

  // Interactive TUI mode
  let hasExited = false

  let inkStdin: NodeJS.ReadStream = process.stdin
  let inkStdout: NodeJS.WriteStream = process.stdout
  let ttyInFd: number | null = null
  let ttyOutFd: number | null = null

  if (isFromWrapper) {
    process.env.FORCE_COLOR = "3"

    try {
      const fs = require("node:fs")
      const tty = require("node:tty")
      // Open /dev/tty with separate fds for read and write. Sharing one fd
      // between tty.ReadStream and tty.WriteStream leaks references to the
      // controlling PTY's slave end and causes Terminal.app to hang on Cmd+W
      // until libuv finally tears the duplicated handles down.
      ttyInFd = fs.openSync("/dev/tty", "r")
      ttyOutFd = fs.openSync("/dev/tty", "w")
      inkStdin = new tty.ReadStream(ttyInFd) as unknown as NodeJS.ReadStream
      inkStdout = new tty.WriteStream(ttyOutFd) as unknown as NodeJS.WriteStream

      Object.defineProperty(inkStdout, "isTTY", { value: true })
      Object.defineProperty(inkStdout, "hasColors", { value: () => true })
      Object.defineProperty(inkStdout, "getColorDepth", { value: () => 24 })

      // The bash subshell inherited fd 0; nothing in --from-wrapper mode reads
      // from it, so don't let it ref the libuv loop after Ink hands off.
      if (typeof process.stdin.unref === "function") {
        process.stdin.unref()
      }
    } catch (error) {
      console.error("Could not open /dev/tty:", error)
    }
  }

  const cleanupAndExit = (code: number): void => {
    if (hasExited) return
    hasExited = true

    try {
      unmount()
    } catch {}

    if (isFromWrapper) {
      const stdinAny = inkStdin as NodeJS.ReadStream & { destroy?: () => void }
      const stdoutAny = inkStdout as NodeJS.WriteStream & { destroy?: () => void }

      try {
        if (stdinAny.isTTY && typeof stdinAny.setRawMode === "function") {
          stdinAny.setRawMode(false)
        }
      } catch {}
      try {
        stdinAny.destroy?.()
      } catch {}
      try {
        stdoutAny.destroy?.()
      } catch {}

      const fs = require("node:fs")
      if (ttyInFd !== null) {
        try {
          fs.closeSync(ttyInFd)
        } catch {}
        ttyInFd = null
      }
      if (ttyOutFd !== null) {
        try {
          fs.closeSync(ttyOutFd)
        } catch {}
        ttyOutFd = null
      }
    }

    process.exit(code)
  }

  const { unmount } = render(
    <App
      initialMode={mode}
      isFromWrapper={isFromWrapper}
      onExit={() => cleanupAndExit(0)}
    />,
    {
      stdin: inkStdin,
      stdout: inkStdout,
      stderr: process.stderr,
    }
  )

  process.on("SIGINT", () => cleanupAndExit(0))
  process.on("SIGTERM", () => cleanupAndExit(0))
  // Cmd+W / closing the terminal tab triggers a PTY vhangup, which delivers
  // SIGHUP. Without this handler the explicitly-opened /dev/tty fds are only
  // released by libuv during default-handler teardown — slow enough that
  // Terminal.app spins for minutes waiting for the slave PTY's refcount to
  // drop to zero.
  process.on("SIGHUP", () => cleanupAndExit(0))
}

main().catch((error) => {
  process.stderr.write(`Fatal: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
})

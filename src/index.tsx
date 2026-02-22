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
  cliArgs: CliArgs | null
} {
  const argv = minimist(process.argv.slice(2), {
    string: ["mode", "name", "source", "branch", "path"],
    boolean: ["help", "version", "json", "force"],
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
    return { mode: "menu", help: true, cliArgs: null }
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

  if (isCliCommand && hasCliFlags) {
    return {
      mode,
      help: false,
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

  return { mode, help: false, cliArgs: null }
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
  branchlet delete         # Go directly to delete worktree flow
  branchlet settings       # Open settings menu

Non-Interactive Examples:
  branchlet create -n my-feature -s main              # Create worktree from main
  branchlet create -n my-feature -s main -b feat/foo  # Create with new branch
  branchlet list --json                               # List worktrees as JSON
  branchlet delete -n my-feature                      # Delete worktree by name
  branchlet delete -p /path/to/worktree -f            # Force delete by path

Configuration:
  The tool looks for configuration files in the following order:
  1. .branchlet.json in current directory
  2. ~/.branchlet/settings.json (global config)

For more information, visit: https://github.com/raghavpillai/git-worktree-manager
`)
}

async function main(): Promise<void> {
  const { mode, help, cliArgs } = parseArguments()

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

main()

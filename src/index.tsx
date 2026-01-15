#!/usr/bin/env node
import { render } from 'ink';
import minimist from 'minimist';
import packageJson from '../package.json' with { type: 'json' };
import { App } from './components/app.js';
import { MESSAGES } from './constants/index.js';
import type { AppMode } from './types/index.js';
import {
  getBashCompletion,
  getCompletionHelp,
  getFishCompletion,
  getZshCompletion,
} from './utils/completion-scripts.js';

const VERSION = packageJson.version;

function parseArguments(): { mode: AppMode; help: boolean } {
  const argv = minimist(process.argv.slice(2), {
    string: ['mode'],
    boolean: ['help', 'version'],
    alias: {
      h: 'help',
      v: 'version',
      m: 'mode',
    },
  });

  if (argv.help) {
    return { mode: 'menu', help: true };
  }

  if (argv.version) {
    console.log(`Branchlet v${VERSION}`);
    process.exit(0);
  }

  const validModes: AppMode[] = [
    'menu',
    'create',
    'list',
    'delete',
    'settings',
  ];
  let mode: AppMode = 'menu';

  if (argv.mode && validModes.includes(argv.mode as AppMode)) {
    mode = argv.mode as AppMode;
  }

  if (argv._.length > 0) {
    const command = argv._[0];
    if (validModes.includes(command as AppMode)) {
      mode = command as AppMode;
    }
  }

  return { mode, help: false };
}

function handleCompletion(): void {
  const args = process.argv.slice(2);
  if (args[0] !== 'completion') return;

  const shell = args[1];
  const showHelp = args.includes('--help') || args.includes('-h');

  if (showHelp || !shell) {
    console.log(getCompletionHelp());
    process.exit(0);
  }

  switch (shell) {
    case 'bash':
      console.log(getBashCompletion());
      break;
    case 'zsh':
      console.log(getZshCompletion());
      break;
    case 'fish':
      console.log(getFishCompletion());
      break;
    default:
      console.error(`Unknown shell: ${shell}. Use bash, zsh, or fish.`);
      process.exit(1);
  }
  process.exit(0);
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
`);
}

function main(): void {
  handleCompletion();

  const { mode, help } = parseArguments();

  if (help) {
    showHelp();
    process.exit(0);
  }

  let hasExited = false;

  const { unmount } = render(
    <App
      initialMode={mode}
      onExit={() => {
        if (!hasExited) {
          hasExited = true;
          unmount();
          process.exit(0);
        }
      }}
    />
  );

  process.on('SIGINT', () => {
    if (!hasExited) {
      hasExited = true;
      unmount();
      process.exit(0);
    }
  });

  process.on('SIGTERM', () => {
    if (!hasExited) {
      hasExited = true;
      unmount();
      process.exit(0);
    }
  });
}

main();

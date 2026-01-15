/** Available modes for the --mode flag */
const MODES = ['menu', 'create', 'list', 'delete', 'settings'];

/** Command definitions with descriptions for shell completions */
const COMMAND_DEFS = [
  { name: 'create', desc: 'Create a new worktree' },
  { name: 'list', desc: 'List all worktrees' },
  { name: 'delete', desc: 'Delete a worktree' },
  { name: 'settings', desc: 'Manage configuration' },
  { name: 'completion', desc: 'Generate shell completions' },
] as const;

/**
 * Generates a Bash completion script for branchlet.
 * @returns Bash completion script to be sourced or saved to a completions directory
 */
export function getBashCompletion(): string {
  const commands = COMMAND_DEFS.map((c) => c.name).join(' ');
  return `# Bash completion for branchlet
_branchlet_completions() {
  local cur="\${COMP_WORDS[COMP_CWORD]}"
  local commands="${commands}"
  local flags="--help --version --mode"

  if [[ \${COMP_CWORD} -eq 1 ]]; then
    COMPREPLY=($(compgen -W "\${commands} \${flags}" -- "\${cur}"))
  elif [[ "\${COMP_WORDS[1]}" == "completion" ]]; then
    COMPREPLY=($(compgen -W "bash zsh fish --help" -- "\${cur}"))
  elif [[ "\${COMP_WORDS[1]}" == "--mode" || "\${COMP_WORDS[1]}" == "-m" ]]; then
    COMPREPLY=($(compgen -W "${MODES.join(' ')}" -- "\${cur}"))
  fi
}
complete -F _branchlet_completions branchlet
`;
}

/**
 * Generates a Zsh completion script for branchlet.
 * @returns Zsh completion script to be sourced or saved to fpath
 */
export function getZshCompletion(): string {
  const commandList = COMMAND_DEFS.map((c) => `    '${c.name}:${c.desc}'`).join(
    '\n'
  );
  return `#compdef branchlet

_branchlet() {
  local -a commands
  commands=(
${commandList}
  )

  _arguments -C \\
    '(-h --help)'{-h,--help}'[Show help]' \\
    '(-v --version)'{-v,--version}'[Show version]' \\
    '(-m --mode)'{-m,--mode}'[Set mode]:mode:(${MODES.join(' ')})' \\
    '1:command:->command' \\
    '*::arg:->args'

  case "\$state" in
    command)
      _describe -t commands 'branchlet commands' commands
      ;;
    args)
      case "\${words[1]}" in
        completion)
          _values 'shell' bash zsh fish
          ;;
      esac
      ;;
  esac
}

_branchlet "\$@"
`;
}

/**
 * Generates a Fish completion script for branchlet.
 * @returns Fish completion script to be saved to the completions directory
 */
export function getFishCompletion(): string {
  const commandCompletions = COMMAND_DEFS.map(
    (c) =>
      `complete -c branchlet -n "__fish_use_subcommand" -a ${c.name} -d "${c.desc}"`
  ).join('\n');
  return `# Fish completion for branchlet

# Disable file completion
complete -c branchlet -f

# Commands
${commandCompletions}

# Global flags
complete -c branchlet -s h -l help -d "Show help"
complete -c branchlet -s v -l version -d "Show version"
complete -c branchlet -s m -l mode -d "Set mode" -xa "${MODES.join(' ')}"

# Completion subcommand
complete -c branchlet -n "__fish_seen_subcommand_from completion" -a "bash zsh fish" -d "Shell type"
`;
}

/**
 * Generates help text with setup instructions for shell completions.
 * @returns Help text showing how to configure completions for each shell
 */
export function getCompletionHelp(): string {
  return `Branchlet Shell Completion Setup

USAGE:
  branchlet completion <shell>

SHELLS:
  bash    Generate Bash completion script
  zsh     Generate Zsh completion script
  fish    Generate Fish completion script

SETUP:

  BASH:
    Add to ~/.bashrc:
      eval "$(branchlet completion bash)"

    Or save to completions directory:
      branchlet completion bash > /etc/bash_completion.d/branchlet

  ZSH:
    Add to ~/.zshrc:
      eval "$(branchlet completion zsh)"

    Or save to fpath (before compinit):
      branchlet completion zsh > ~/.zsh/completions/_branchlet

  FISH:
    Save to completions directory:
      branchlet completion fish > ~/.config/fish/completions/branchlet.fish
`;
}

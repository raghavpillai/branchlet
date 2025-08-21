import type { WorktreeConfig } from "../types/index.js"

export const DEFAULT_CONFIG: WorktreeConfig = {
  worktreeCopyPatterns: [".env", ".vscode/**"],
  worktreeCopyIgnores: [
    "**/node_modules/**",
    "**/dist/**",
    "**/.git/**",
    "**/.svn/**",
    "**/.hg/**",
    "**/CVS/**",
    "**/Thumbs.db",
    "**/.DS_Store",
    "**/coverage/**",
    "**/build/**",
    "**/out/**",
    "**/.next/**",
    "**/.nuxt/**",
    "**/target/**",
  ],
  worktreePathTemplate: "$BASE_PATH.worktree",
  postCreateCmd: [],
  terminalCommand: "",
}

export const LOCAL_CONFIG_FILE_NAME = ".brancher.json"

export const GLOBAL_CONFIG_DIR = `${process.env.HOME}/.brancher`

export const GLOBAL_CONFIG_FILE = `${GLOBAL_CONFIG_DIR}/settings.json`

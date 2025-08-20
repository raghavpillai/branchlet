import type { WorktreeConfig } from '../types/index.js';

export const DEFAULT_CONFIG: WorktreeConfig = {
  worktreeCopyPatterns: [
    '.env',
    '.vscode/**'
  ],
  worktreeCopyIgnores: [
    '**/node_modules/**',
    '**/dist/**',
    '**/.git/**',
    '**/.svn/**',
    '**/.hg/**',
    '**/CVS/**',
    '**/Thumbs.db',
    '**/.DS_Store',
    '**/coverage/**',
    '**/build/**',
    '**/out/**',
    '**/.next/**',
    '**/.nuxt/**',
    '**/target/**'
  ],
  worktreePathTemplate: '$BASE_PATH.worktree',
  postCreateCmd: '',
  terminalCommand: ''
};

export const CONFIG_FILE_NAMES = [
  '.brancherrc.json',
  '.brancher.json',
  'brancher.config.json'
] as const;

export const GLOBAL_CONFIG_DIR = process.env.XDG_CONFIG_HOME || 
  (process.platform === 'win32' ? process.env.APPDATA : process.env.HOME + '/.config');

export const GLOBAL_CONFIG_PATH = `${GLOBAL_CONFIG_DIR}/brancher`;
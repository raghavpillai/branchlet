export interface WorktreeConfig {
  worktreeCopyPatterns: string[]
  worktreeCopyIgnores: string[]
  worktreePathTemplate: string
  postCreateCmd: string[]
  terminalCommand: string
}

export interface ConfigFile {
  config: WorktreeConfig
  path: string
  isGlobal: boolean
}

export interface TemplateVariables {
  BASE_PATH: string
  WORKTREE_PATH: string
  BRANCH_NAME: string
  SOURCE_BRANCH: string
}

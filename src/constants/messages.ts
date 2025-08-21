export const MESSAGES = {
  // Welcome and general
  WELCOME: "Brancher - Git Worktree Manager",

  // Menu options
  MENU_TITLE: "What would you like to do?",
  MENU_CREATE: "Create new worktree",
  MENU_LIST: "List worktrees",
  MENU_DELETE: "Delete worktree",
  MENU_SETTINGS: "Settings",
  MENU_EXIT: "Exit",

  // Create flow
  CREATE_DIRECTORY_PROMPT: "Enter directory name for the new worktree:",
  CREATE_DIRECTORY_PLACEHOLDER: "feature-name",
  CREATE_SOURCE_BRANCH_PROMPT: "Select source branch:",
  CREATE_NEW_BRANCH_PROMPT: "Enter name for new branch:",
  CREATE_NEW_BRANCH_PLACEHOLDER: "feature/new-feature",
  CREATE_CONFIRM_TITLE: "Create Worktree Confirmation",
  CREATE_SUCCESS: "Worktree created successfully!",
  CREATE_CREATING: "Creating worktree...",

  // Delete flow
  DELETE_SELECT_PROMPT: "Select worktree to delete:",
  DELETE_CONFIRM_TITLE: "Delete Worktree Confirmation",
  DELETE_WARNING: "This action cannot be undone.",
  DELETE_SUCCESS: "Worktree deleted successfully!",
  DELETE_DELETING: "Deleting worktree...",

  // List view
  LIST_TITLE: "Git Worktrees",
  LIST_NO_WORKTREES: "No additional worktrees found.",
  LIST_MAIN_INDICATOR: "(main)",
  LIST_DIRTY_INDICATOR: "(dirty)",

  // Validation errors
  ERROR_NOT_GIT_REPO: "Current directory is not a git repository.",
  ERROR_DIRECTORY_EXISTS: "Directory already exists.",
  ERROR_INVALID_DIRECTORY_NAME: "Invalid directory name.",
  ERROR_INVALID_BRANCH_NAME: "Invalid branch name.",
  ERROR_BRANCH_EXISTS: "Branch already exists.",
  ERROR_WORKTREE_EXISTS: "Worktree already exists.",
  ERROR_WORKTREE_HAS_CHANGES: "Worktree has uncommitted changes.",
  ERROR_OPERATION_FAILED: "Operation failed. Please try again.",

  // Git errors
  GIT_ERROR_FETCH: "Failed to fetch git information.",
  GIT_ERROR_CREATE: "Failed to create worktree.",
  GIT_ERROR_DELETE: "Failed to delete worktree.",
  GIT_ERROR_LIST: "Failed to list worktrees.",

  // File operations
  FILES_COPYING: "Copying files...",
  FILES_COPY_SUCCESS: "Files copied successfully.",
  FILES_COPY_ERROR: "Failed to copy some files.",

  // Post-create actions
  POST_CREATE_RUNNING: "Running post-create command...",
  POST_CREATE_SUCCESS: "Post-create command completed.",
  POST_CREATE_ERROR: "Post-create command failed.",

  // Navigation hints
  HINT_ARROW_KEYS: "Use ↑↓ arrow keys to navigate",
  HINT_ENTER_SELECT: "Press Enter to select",
  HINT_ESC_CANCEL: "Press Esc to cancel",
  HINT_CTRL_C_EXIT: "Press Ctrl+C to exit",

  // Loading states
  LOADING_GIT_INFO: "Loading git information...",
  LOADING_BRANCHES: "Loading branches...",
  LOADING_WORKTREES: "Loading worktrees...",
} as const

export const COLORS = {
  PRIMARY: "#61dafb",
  SUCCESS: "#28a745",
  WARNING: "#ffc107",
  ERROR: "#dc3545",
  INFO: "#17a2b8",
  MUTED: "#6c757d",
  HIGHLIGHT: "#007bff",
} as const

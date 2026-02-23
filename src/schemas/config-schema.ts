import { z } from "zod"

export const WorktreeConfigSchema = z
  .object({
    worktreeCopyPatterns: z
      .array(z.string())
      .default([".env*", ".vscode/**"])
      .describe("File patterns to copy to new worktrees (glob patterns supported)"),
    worktreeCopyIgnores: z
      .array(z.string())
      .default(["**/node_modules/**", "**/dist/**", "**/.git/**", "**/Thumbs.db", "**/.DS_Store"])
      .describe("File patterns to ignore when copying (glob patterns supported)"),
    worktreePathTemplate: z
      .string()
      .default("$BASE_PATH.worktree")
      .describe(
        "Template for worktree directory names. Variables: $BASE_PATH, $WORKTREE_PATH, $BRANCH_NAME, $SOURCE_BRANCH"
      ),
    postCreateCmd: z
      .array(z.string())
      .default([])
      .describe(
        "Commands to run after creating a worktree. Variables: $BASE_PATH, $WORKTREE_PATH, $BRANCH_NAME, $SOURCE_BRANCH"
      ),
    terminalCommand: z
      .string()
      .default("")
      .describe("Command to open terminal in new worktree directory (e.g., 'code $WORKTREE_PATH')"),
    deleteBranchWithWorktree: z
      .boolean()
      .default(false)
      .describe("Also delete the associated git branch when deleting a worktree"),
    showRemoteBranches: z
      .boolean()
      .default(true)
      .describe("Show remote-only branches in the source branch picker"),
    lastUpdateCheck: z
      .number()
      .optional()
      .describe("Timestamp of last update check (milliseconds since epoch)"),
    latestVersion: z
      .string()
      .optional()
      .describe("Latest version available on npm"),
    checkedVersion: z
      .string()
      .optional()
      .describe("Version that was current when last checked"),
  })
  .describe("Configuration for Git worktree management tool")

export type WorktreeConfig = z.infer<typeof WorktreeConfigSchema>

export function validateConfig(config: unknown): {
  success: boolean
  data?: WorktreeConfig
  error?: string
} {
  try {
    const result = WorktreeConfigSchema.parse(config)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues
        .map((err: z.ZodIssue) => `${err.path.join(".")}: ${err.message}`)
        .join("; ")
      return { success: false, error: errorMessages }
    }
    return { success: false, error: String(error) }
  }
}

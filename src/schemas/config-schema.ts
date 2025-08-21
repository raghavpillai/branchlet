import { z } from "zod"

export const WorktreeConfigSchema = z.object({
  worktreeCopyPatterns: z.array(z.string()).default([".env", ".vscode/**"]),
  worktreeCopyIgnores: z
    .array(z.string())
    .default(["**/node_modules/**", "**/dist/**", "**/.git/**", "**/Thumbs.db", "**/.DS_Store"]),
  worktreePathTemplate: z.string().default("$BASE_PATH.worktree"),
  postCreateCmd: z.array(z.string()).default([]),
  terminalCommand: z.string().default(""),
})

export type WorktreeConfigOutput = z.output<typeof WorktreeConfigSchema>

export function validateConfig(config: unknown): {
  success: boolean
  data?: WorktreeConfigOutput
  error?: string
} {
  try {
    const result = WorktreeConfigSchema.parse(config)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join("; ")
      return { success: false, error: errorMessages }
    }
    return { success: false, error: String(error) }
  }
}

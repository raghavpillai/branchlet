import { z } from "zod"

export const AppStateSchema = z.object({
  lastUpdateCheck: z
    .number()
    .optional()
    .describe("Timestamp of last update check (milliseconds since epoch)"),
  latestVersion: z.string().optional().describe("Latest version available on npm"),
  checkedVersion: z.string().optional().describe("Version that was current when last checked"),
})

export type AppState = z.infer<typeof AppStateSchema>

export const DEFAULT_APP_STATE: AppState = AppStateSchema.parse({})

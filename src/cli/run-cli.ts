import { WorktreeService } from "../services/worktree-service.js"
import { runCreate } from "./commands/create.js"
import { runDelete } from "./commands/delete.js"
import { runList } from "./commands/list.js"
import type { CliArgs } from "./types.js"

export async function runCli(args: CliArgs): Promise<void> {
  const worktreeService = new WorktreeService()
  await worktreeService.initialize()

  switch (args.command) {
    case "create":
      await runCreate(args, worktreeService)
      break
    case "list":
      await runList(worktreeService)
      break
    case "delete":
      await runDelete(args, worktreeService)
      break
  }
}

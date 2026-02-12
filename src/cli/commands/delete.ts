import type { WorktreeService } from "../../services/index.js"
import type { CliArgs } from "../types.js"

export async function runDelete(args: CliArgs, worktreeService: WorktreeService): Promise<void> {
  let worktreePath: string | undefined = args.path

  if (!worktreePath && !args.name) {
    throw new Error("Missing required argument: --path (-p) or --name (-n)")
  }

  if (!worktreePath && args.name) {
    const gitService = worktreeService.getGitService()
    const worktrees = await gitService.listWorktrees()
    const match = worktrees.find((wt) => {
      const dirName = wt.path.split("/").pop()
      return dirName === args.name
    })
    if (!match) {
      throw new Error(`No worktree found with directory name '${args.name}'`)
    }
    worktreePath = match.path
  }

  if (!worktreePath) {
    throw new Error("Could not resolve worktree path")
  }

  const result = await worktreeService.deleteWorktree(worktreePath, args.force ?? false)

  const parts = [`Worktree deleted: ${worktreePath}`]
  if (result.branchDeleted && result.branchName) {
    parts.push(`Branch deleted: ${result.branchName}`)
  }
  console.log(parts.join("\n"))
}

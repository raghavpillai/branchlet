import type { WorktreeService } from "../../services/index.js"

export async function runList(worktreeService: WorktreeService): Promise<void> {
  const gitService = worktreeService.getGitService()
  const worktrees = await gitService.listWorktrees()
  console.log(JSON.stringify(worktrees, null, 2))
}

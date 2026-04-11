import { dirname } from "node:path"
import type { WorktreeService } from "../../services/index.js"
import {
  getWorktreePath,
  validateBranchName,
  validateDirectoryName,
} from "../../utils/path-utils.js"
import type { CliArgs } from "../types.js"

export async function runCreate(args: CliArgs, worktreeService: WorktreeService): Promise<void> {
  if (!args.name) {
    throw new Error("Missing required argument: --name (-n)")
  }
  if (!args.source) {
    throw new Error("Missing required argument: --source (-s)")
  }

  const dirError = validateDirectoryName(args.name)
  if (dirError) {
    throw new Error(`Invalid directory name: ${dirError}`)
  }

  if (args.branch !== undefined && !args.branch.trim()) {
    throw new Error("Branch name cannot be empty")
  }

  if (args.branch) {
    const branchError = validateBranchName(args.branch)
    if (branchError) {
      throw new Error(`Invalid branch name: ${branchError}`)
    }
  }

  const config = worktreeService.getConfigService().getConfig()
  const gitService = worktreeService.getGitService()

  const allBranches = await gitService.listBranches()
  const sourceBranchEntry = allBranches.find((b) => b.name === args.source)
  if (!sourceBranchEntry) {
    throw new Error(`Source branch '${args.source}' does not exist`)
  }

  // When --branch is omitted, default to the worktree directory name so a fresh
  // branch is always created (avoids conflicts when the source branch is already
  // checked out in another worktree).
  const newBranch = args.branch ?? args.name

  const worktreePath = getWorktreePath(
    gitService.getGitRoot(),
    args.name,
    config.worktreePathTemplate,
    newBranch,
    args.source
  )
  const basePath = dirname(worktreePath)

  await worktreeService.createWorktree({
    name: args.name,
    sourceBranch: args.source,
    newBranch,
    basePath,
  })

  console.log(worktreePath)
  console.log(`  source: ${args.source}`)
  console.log(`  branch: ${newBranch}`)
}

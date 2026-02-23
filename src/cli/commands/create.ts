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

  if (args.branch) {
    const branchError = validateBranchName(args.branch)
    if (branchError) {
      throw new Error(`Invalid branch name: ${branchError}`)
    }
  }

  const config = worktreeService.getConfigService().getConfig()
  const gitService = worktreeService.getGitService()

  const allBranches = await gitService.listBranches(true)
  const sourceBranchEntry = allBranches.find((b) => b.name === args.source)
  if (!sourceBranchEntry) {
    throw new Error(`Source branch '${args.source}' does not exist`)
  }

  // For remote branches without an explicit --branch, derive a local name
  const newBranch = args.branch
    ?? (sourceBranchEntry.isRemote ? args.source.replace(/^[^/]+\//, "") : args.source)

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
}

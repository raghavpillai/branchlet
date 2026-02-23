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

  const newBranch = args.branch ?? args.source
  if (args.branch) {
    const branchError = validateBranchName(args.branch)
    if (branchError) {
      throw new Error(`Invalid branch name: ${branchError}`)
    }
  }

  const config = worktreeService.getConfigService().getConfig()
  const gitService = worktreeService.getGitService()
  const repoInfo = await gitService.getRepositoryInfo()

  const allBranches = await gitService.listBranches(config.showRemoteBranches)
  const branchExists = allBranches.some((b) => b.name === args.source)
  if (!branchExists) {
    throw new Error(`Source branch '${args.source}' does not exist`)
  }

  const worktreePath = getWorktreePath(
    repoInfo.path,
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

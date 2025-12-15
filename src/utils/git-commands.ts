import { spawn } from "node:child_process"
import type { GitCommandResult } from "../types/index.js"

export async function executeGitCommand(args: string[], cwd?: string): Promise<GitCommandResult> {
  return new Promise((resolve) => {
    const child = spawn("git", args, {
      cwd: cwd || process.cwd(),
      stdio: "pipe",
      shell: false,
    })

    let stdout = ""
    let stderr = ""

    child.stdout?.on("data", (data) => {
      stdout += data.toString()
    })

    child.stderr?.on("data", (data) => {
      stderr += data.toString()
    })

    child.on("close", (code) => {
      resolve({
        success: code === 0,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code || 0,
      })
    })

    child.on("error", (error) => {
      resolve({
        success: false,
        stdout: "",
        stderr: error.message,
        exitCode: 1,
      })
    })
  })
}

export async function isGitRepository(path?: string): Promise<boolean> {
  const result = await executeGitCommand(["rev-parse", "--git-dir"], path)
  return result.success
}

export async function getCurrentBranch(path?: string): Promise<string | null> {
  const result = await executeGitCommand(["symbolic-ref", "--short", "HEAD"], path)
  if (result.success) {
    return result.stdout
  }

  const fallbackResult = await executeGitCommand(["rev-parse", "--abbrev-ref", "HEAD"], path)
  return fallbackResult.success ? fallbackResult.stdout : null
}

export async function getDefaultBranch(path?: string): Promise<string> {
  const result = await executeGitCommand(["symbolic-ref", "refs/remotes/origin/HEAD"], path)
  if (result.success) {
    return result.stdout.replace("refs/remotes/origin/", "")
  }

  const commonDefaults = ["main", "master", "develop"]
  for (const branch of commonDefaults) {
    const checkResult = await executeGitCommand(
      ["show-ref", "--verify", `refs/heads/${branch}`],
      path
    )
    if (checkResult.success) {
      return branch
    }
  }

  return "main"
}

export async function getGitRoot(path?: string): Promise<string | null> {
  const result = await executeGitCommand(
    ["rev-parse", "--path-format=absolute", "--git-common-dir"],
    path
  )

  if (!result.success) {
    return null
  }

  const gitDir = result.stdout
  if (gitDir.endsWith("/.git")) {
    return gitDir.slice(0, -5) // removes "/.git"
  }

  const parentDir = gitDir.split("/").slice(0, -1).join("/")
  return parentDir || null
}

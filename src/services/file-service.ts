import { spawn } from "node:child_process"
import { copyFile, mkdir, readdir, stat } from "node:fs/promises"
import { dirname, join, relative } from "node:path"
import type { WorktreeConfig } from "../schemas/config-schema.js"
import type { TemplateVariables } from "../types/index.js"
import { fileExists, isDirectory, matchFiles, shouldIgnoreFile } from "../utils/file-patterns.js"
import { resolveTemplate } from "../utils/path-utils.js"

export async function copyFiles(
  sourceDir: string,
  targetDir: string,
  config: WorktreeConfig
): Promise<{ copied: string[]; skipped: string[]; errors: string[] }> {
  const result = {
    copied: [] as string[],
    skipped: [] as string[],
    errors: [] as string[],
  }

  try {
    const filesToCopy = await matchFiles(
      sourceDir,
      config.worktreeCopyPatterns,
      config.worktreeCopyIgnores
    )

    for (const filePath of filesToCopy) {
      try {
        const sourcePath = join(sourceDir, filePath)
        const targetPath = join(targetDir, filePath)

        if (shouldIgnoreFile(filePath, config.worktreeCopyIgnores)) {
          result.skipped.push(filePath)
          continue
        }

        if (!(await fileExists(sourcePath))) {
          result.skipped.push(filePath)
          continue
        }

        if (await isDirectory(sourcePath)) {
          await copyDirectory(sourcePath, targetPath, result)
        } else {
          await mkdir(dirname(targetPath), { recursive: true })
          await copyFile(sourcePath, targetPath)
          result.copied.push(filePath)
        }
      } catch (error) {
        result.errors.push(`${filePath}: ${error}`)
      }
    }
  } catch (error) {
    result.errors.push(`Failed to match files: ${error}`)
  }

  return result
}

async function copyDirectory(
  sourceDir: string,
  targetDir: string,
  result: { copied: string[]; skipped: string[]; errors: string[] }
): Promise<void> {
  try {
    await mkdir(targetDir, { recursive: true })
    const entries = await readdir(sourceDir)

    for (const entry of entries) {
      const sourcePath = join(sourceDir, entry)
      const targetPath = join(targetDir, entry)
      const stats = await stat(sourcePath)

      if (stats.isDirectory()) {
        await FileService.copyDirectory(sourcePath, targetPath, result)
      } else {
        await copyFile(sourcePath, targetPath)
        result.copied.push(relative(process.cwd(), targetPath))
      }
    }
  } catch (error) {
    result.errors.push(`Directory ${sourceDir}: ${error}`)
  }
}

export async function executePostCreateCommands(
  commands: string[],
  variables: TemplateVariables,
  onProgress?: (command: string, index: number, total: number) => void
): Promise<{ success: boolean; output: string; error?: string }> {
  if (commands.length === 0) {
    return { success: true, output: "" }
  }

  let allOutput = ""

  for (let i = 0; i < commands.length; i++) {
    const command = commands[i]
    if (!command.trim()) continue

    onProgress?.(command, i + 1, commands.length)

    const resolvedCommand = resolveTemplate(command, variables)
    const result = await executeCommand(resolvedCommand, variables.WORKTREE_PATH)

    allOutput += `Command ${i + 1}: ${command}\n${result.output}\n\n`

    if (!result.success) {
      return {
        success: false,
        output: allOutput,
        error: result.error,
      }
    }
  }

  return { success: true, output: allOutput }
}

async function executeCommand(
  command: string,
  cwd: string
): Promise<{ success: boolean; output: string; error?: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, {
      cwd,
      stdio: "pipe",
      shell: true,
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
        output: stdout,
        error: code !== 0 ? stderr : undefined,
      })
    })

    child.on("error", (error) => {
      resolve({
        success: false,
        output: "",
        error: error.message,
      })
    })
  })
}

export async function openTerminal(
  terminalCommand: string,
  worktreePath: string
): Promise<{ success: boolean; error?: string }> {
  if (!terminalCommand.trim()) {
    return { success: true }
  }

  const variables: TemplateVariables = {
    BASE_PATH: "",
    WORKTREE_PATH: worktreePath,
    BRANCH_NAME: "",
    SOURCE_BRANCH: "",
  }

  const resolvedCommand = resolveTemplate(terminalCommand, variables)

  return new Promise((resolve) => {
    const child = spawn(resolvedCommand, {
      cwd: worktreePath,
      stdio: "ignore",
      shell: true,
      detached: true,
    })

    child.on("error", (error) => {
      resolve({
        success: false,
        error: error.message,
      })
    })

    child.unref()
    resolve({ success: true })
  })
}

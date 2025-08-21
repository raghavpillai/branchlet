import { stat } from "node:fs/promises"
import { glob } from "glob"
import { minimatch } from "minimatch"

export async function matchFiles(
  baseDir: string,
  patterns: string[],
  ignorePatterns: string[] = []
): Promise<string[]> {
  const allMatches = new Set<string>()

  for (const pattern of patterns) {
    try {
      const matches = await glob(pattern, {
        cwd: baseDir,
        dot: true,
        ignore: ignorePatterns,
        nodir: false,
      })

      for (const match of matches) {
        allMatches.add(match)
      }
    } catch (error) {
      console.warn(`Warning: Failed to match pattern '${pattern}': ${error}`)
    }
  }

  return Array.from(allMatches).sort()
}

export function shouldIgnoreFile(filePath: string, ignorePatterns: string[]): boolean {
  return ignorePatterns.some((pattern) => minimatch(filePath, pattern, { dot: true }))
}

export async function isDirectory(path: string): Promise<boolean> {
  try {
    const stats = await stat(path)
    return stats.isDirectory()
  } catch {
    return false
  }
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

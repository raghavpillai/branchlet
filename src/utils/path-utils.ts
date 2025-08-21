import { basename, dirname, join, resolve } from "node:path"
import type { TemplateVariables } from "../types/index.js"

export function resolveTemplate(template: string, variables: TemplateVariables): string {
  let result = template

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `$${key}`
    result = result.replace(new RegExp(placeholder.replace(/\$/g, "\\$"), "g"), value)
  }

  return result
}

export function getRepositoryBaseName(gitRoot: string): string {
  return basename(gitRoot)
}

export function getRepositoryRoot(path?: string): string {
  return resolve(path || process.cwd())
}

export function getWorktreeBasePath(gitRoot: string, template: string): string {
  const baseName = getRepositoryBaseName(gitRoot)
  const parentDir = dirname(gitRoot)

  const variables: TemplateVariables = {
    BASE_PATH: baseName,
    WORKTREE_PATH: "",
    BRANCH_NAME: "",
    SOURCE_BRANCH: "",
  }

  const resolvedTemplate = resolveTemplate(template, variables)
  return join(parentDir, resolvedTemplate)
}

export function getWorktreePath(
  gitRoot: string,
  directoryName: string,
  template: string,
  branchName?: string,
  sourceBranch?: string
): string {
  const baseName = getRepositoryBaseName(gitRoot)
  const parentDir = dirname(gitRoot)

  const variables: TemplateVariables = {
    BASE_PATH: baseName,
    WORKTREE_PATH: join(parentDir, directoryName),
    BRANCH_NAME: branchName || "",
    SOURCE_BRANCH: sourceBranch || "",
  }

  const resolvedTemplate = resolveTemplate(template, variables)
  const worktreeBase = join(parentDir, resolvedTemplate)

  return join(worktreeBase, directoryName)
}

export function validateDirectoryName(name: string): string | undefined {
  if (!name.trim()) {
    return "Directory name cannot be empty"
  }

  if (name.includes("/") || name.includes("\\")) {
    return "Directory name cannot contain path separators"
  }

  if (name.startsWith(".") || name.startsWith("-")) {
    return "Directory name cannot start with . or -"
  }

  // Check for invalid filesystem characters
  const hasInvalidChars = /[<>:"|?*]/.test(name)
  const hasControlChars = name.split('').some(char => {
    const code = char.charCodeAt(0)
    return code >= 0x00 && code <= 0x1F
  })
  
  if (hasInvalidChars || hasControlChars) {
    return "Directory name contains invalid characters"
  }

  if (name.length > 255) {
    return "Directory name too long"
  }

  return undefined
}

export function validateBranchName(name: string): string | undefined {
  if (!name.trim()) {
    return "Branch name cannot be empty"
  }

  if (name.includes("..") || name.includes("//")) {
    return "Branch name cannot contain .. or //"
  }

  if (name.startsWith("/") || name.endsWith("/")) {
    return "Branch name cannot start or end with /"
  }

  if (name.startsWith("-") || name.endsWith(".")) {
    return "Branch name cannot start with - or end with ."
  }

  if (/[\s~^:?*\[\]\\@]/.test(name)) {
    return "Branch name contains invalid characters"
  }

  if (name === "HEAD") {
    return "Branch name cannot be HEAD"
  }

  return undefined
}

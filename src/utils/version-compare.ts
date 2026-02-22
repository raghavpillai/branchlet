interface SemanticVersion {
  major: number
  minor: number
  patch: number
  prerelease?: string | undefined
}

function parseVersion(version: string): SemanticVersion {
  const cleaned = version.replace(/^v/, "")

  const [versionPart, prerelease] = cleaned.split("-")

  if (!versionPart) {
    throw new Error(`Invalid version format: ${version}`)
  }

  const parts = versionPart.split(".")

  if (parts.length < 3 || !parts[0] || !parts[1] || !parts[2]) {
    throw new Error(`Invalid version format: ${version}`)
  }

  return {
    major: Number.parseInt(parts[0], 10),
    minor: Number.parseInt(parts[1], 10),
    patch: Number.parseInt(parts[2], 10),
    prerelease,
  }
}

/**
 * Compares two semantic version strings
 * Returns true if version2 is newer than version1
 *
 * Examples:
 *   isNewerVersion("0.2.0", "0.3.0") => true
 *   isNewerVersion("0.2.0", "1.0.0") => true
 *   isNewerVersion("0.2.0", "0.2.0") => false
 *   isNewerVersion("0.3.0", "0.2.0") => false
 */
export function isNewerVersion(version1: string, version2: string): boolean {
  try {
    const v1 = parseVersion(version1)
    const v2 = parseVersion(version2)

    if (v2.major > v1.major) return true
    if (v2.major < v1.major) return false

    if (v2.minor > v1.minor) return true
    if (v2.minor < v1.minor) return false

    if (v2.patch > v1.patch) return true

    return false
  } catch {
    return false
  }
}

/**
 * Validates if a string is a valid semantic version
 */
export function isValidVersion(version: string): boolean {
  try {
    parseVersion(version)
    return true
  } catch {
    return false
  }
}

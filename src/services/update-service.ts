import type { AppStateService } from "./app-state-service.js"
import { isNewerVersion } from "../utils/version-compare.js"

export interface UpdateCheckResult {
  hasUpdate: boolean
  currentVersion: string
  latestVersion?: string
  checkedAt: number
  error?: string
}

const NPM_REGISTRY_URL = "https://registry.npmjs.org/branchlet/latest"
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

export function shouldCheckForUpdates(appStateService: AppStateService): boolean {
  const state = appStateService.getState()
  const lastCheck = state.lastUpdateCheck || 0
  const now = Date.now()
  return now - lastCheck >= CACHE_TTL_MS
}

export async function checkForUpdates(
  currentVersion: string,
  appStateService: AppStateService,
  force = false
): Promise<UpdateCheckResult> {
  const state = appStateService.getState()
  const now = Date.now()

  if (!force && !shouldCheckForUpdates(appStateService)) {
    return (
      getCachedUpdateStatus(appStateService, currentVersion) || {
        hasUpdate: false,
        currentVersion,
        checkedAt: state.lastUpdateCheck || now,
      }
    )
  }

  try {
    const latestVersion = await fetchLatestVersion()
    const hasUpdate = isNewerVersion(currentVersion, latestVersion)

    appStateService.update({
      lastUpdateCheck: now,
      latestVersion: latestVersion,
      checkedVersion: currentVersion,
    })

    appStateService.save().catch(() => {})

    return {
      hasUpdate,
      currentVersion,
      latestVersion,
      checkedAt: now,
    }
  } catch (error) {
    return {
      hasUpdate: false,
      currentVersion,
      checkedAt: now,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export function getCachedUpdateStatus(
  appStateService: AppStateService,
  currentVersion?: string
): UpdateCheckResult | null {
  const state = appStateService.getState()

  if (!state.lastUpdateCheck || !state.latestVersion) {
    return null
  }

  const version = currentVersion || state.checkedVersion || state.latestVersion
  const hasUpdate = isNewerVersion(version, state.latestVersion)

  return {
    hasUpdate,
    currentVersion: version,
    latestVersion: state.latestVersion,
    checkedAt: state.lastUpdateCheck,
  }
}

async function fetchLatestVersion(): Promise<string> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(NPM_REGISTRY_URL, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = (await response.json()) as { version: string }
    return data.version
  } finally {
    clearTimeout(timeoutId)
  }
}

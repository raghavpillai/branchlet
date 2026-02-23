import type { ConfigService } from "./config-service.js"
import { isNewerVersion } from "../utils/version-compare.js"

export interface UpdateCheckResult {
  hasUpdate: boolean
  currentVersion: string
  latestVersion?: string
  checkedAt: number
  error?: string
}

// biome-ignore lint/complexity/noStaticOnlyClass: Service class pattern
export class UpdateService {
  private static readonly NPM_REGISTRY_URL = "https://registry.npmjs.org/branchlet/latest"
  private static readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000

  static shouldCheckForUpdates(configService: ConfigService): boolean {
    const config = configService.getConfig()
    const lastCheck = config.lastUpdateCheck || 0
    const now = Date.now()
    return now - lastCheck >= UpdateService.CACHE_TTL_MS
  }

  static async checkForUpdates(
    currentVersion: string,
    configService: ConfigService,
    force = false
  ): Promise<UpdateCheckResult> {
    const config = configService.getConfig()
    const now = Date.now()

    if (!force && !UpdateService.shouldCheckForUpdates(configService)) {
      return (
        UpdateService.getCachedUpdateStatus(configService, currentVersion) || {
          hasUpdate: false,
          currentVersion,
          checkedAt: config.lastUpdateCheck || now,
        }
      )
    }

    try {
      const latestVersion = await UpdateService.fetchLatestVersion()
      const hasUpdate = isNewerVersion(currentVersion, latestVersion)

      const updatedConfig = configService.updateConfig({
        lastUpdateCheck: now,
        latestVersion: latestVersion,
        checkedVersion: currentVersion,
      })

      configService.saveConfig(updatedConfig).catch(() => {})

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

  static getCachedUpdateStatus(
    configService: ConfigService,
    currentVersion?: string
  ): UpdateCheckResult | null {
    const config = configService.getConfig()

    if (!config.lastUpdateCheck || !config.latestVersion) {
      return null
    }

    const version = currentVersion || config.checkedVersion || config.latestVersion
    const hasUpdate = isNewerVersion(version, config.latestVersion)

    return {
      hasUpdate,
      currentVersion: version,
      latestVersion: config.latestVersion,
      checkedAt: config.lastUpdateCheck,
    }
  }

  private static async fetchLatestVersion(): Promise<string> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    try {
      const response = await fetch(UpdateService.NPM_REGISTRY_URL, {
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
}

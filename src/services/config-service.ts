import { access, mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import {
  CONFIG_FILE_NAMES,
  DEFAULT_CONFIG,
  GLOBAL_CONFIG_DIR,
  GLOBAL_CONFIG_FILE,
} from "../constants/index"
import { validateConfig, WorktreeConfigSchema } from "../schemas/config-schema.js"
import type { ConfigFile, ConfigValidation, WorktreeConfig } from "../types/index"
import { ConfigError } from "../utils/index"

export class ConfigService {
  private config: WorktreeConfig
  private configPath?: string

  constructor() {
    this.config = { ...DEFAULT_CONFIG }
  }

  async loadConfig(projectPath?: string): Promise<WorktreeConfig> {
    await this.ensureGlobalConfig()

    const configFile = await this.findConfigFile(projectPath)

    if (configFile) {
      try {
        const content = await readFile(configFile.path, "utf-8")
        const parsed = JSON.parse(content)

        const validation = validateConfig(parsed)
        if (!validation.success) {
          throw new ConfigError(
            `Invalid configuration: ${validation.error}`,
            configFile.path
          )
        }

        this.config = validation.data!
        this.configPath = configFile.path
      } catch (error) {
        if (error instanceof ConfigError) {
          throw error
        }
        throw new ConfigError(
          `Failed to load config from ${configFile.path}: ${error}`,
          configFile.path
        )
      }
    }

    return this.config
  }

  async saveConfig(config: WorktreeConfig, path?: string): Promise<void> {
    const configPath = path || this.configPath || join(process.cwd(), CONFIG_FILE_NAMES[0])

    const validation = this.validateConfig(config)
    if (!validation.isValid) {
      throw new ConfigError(`Invalid configuration: ${validation.errors.join(", ")}`)
    }

    try {
      await mkdir(dirname(configPath), { recursive: true })
      await writeFile(configPath, JSON.stringify(config, null, 2), "utf-8")

      this.config = { ...config }
      this.configPath = configPath
    } catch (error) {
      throw new ConfigError(`Failed to save config to ${configPath}: ${error}`)
    }
  }

  getConfig(): WorktreeConfig {
    return { ...this.config }
  }

  updateConfig(updates: Partial<WorktreeConfig>): WorktreeConfig {
    this.config = { ...this.config, ...updates }
    return this.getConfig()
  }

  resetConfig(): WorktreeConfig {
    this.config = { ...DEFAULT_CONFIG }
    return this.getConfig()
  }

  validateConfig(config: unknown): ConfigValidation {
    const errors: string[] = []
    const warnings: string[] = []

    if (!config || typeof config !== "object") {
      return { isValid: false, errors: ["Configuration must be an object"], warnings: [] }
    }

    const cfg = config as Record<string, unknown>

    if (cfg.worktreeCopyPatterns !== undefined) {
      if (!Array.isArray(cfg.worktreeCopyPatterns)) {
        errors.push("worktreeCopyPatterns must be an array of strings")
      } else if (!cfg.worktreeCopyPatterns.every((p) => typeof p === "string")) {
        errors.push("All worktreeCopyPatterns must be strings")
      }
    }

    if (cfg.worktreeCopyIgnores !== undefined) {
      if (!Array.isArray(cfg.worktreeCopyIgnores)) {
        errors.push("worktreeCopyIgnores must be an array of strings")
      } else if (!cfg.worktreeCopyIgnores.every((p) => typeof p === "string")) {
        errors.push("All worktreeCopyIgnores must be strings")
      }
    }

    if (cfg.worktreePathTemplate !== undefined) {
      if (typeof cfg.worktreePathTemplate !== "string") {
        errors.push("worktreePathTemplate must be a string")
      } else if (!cfg.worktreePathTemplate.includes("$BASE_PATH")) {
        warnings.push("worktreePathTemplate should include $BASE_PATH variable")
      }
    }

    if (cfg.postCreateCmd !== undefined && typeof cfg.postCreateCmd !== "string") {
      errors.push("postCreateCmd must be a string")
    }

    if (cfg.terminalCommand !== undefined && typeof cfg.terminalCommand !== "string") {
      errors.push("terminalCommand must be a string")
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  private async findConfigFile(projectPath?: string): Promise<ConfigFile | null> {
    const searchPaths: string[] = []

    if (projectPath) {
      for (const fileName of CONFIG_FILE_NAMES) {
        searchPaths.push(join(projectPath, fileName))
      }
    }

    for (const fileName of CONFIG_FILE_NAMES) {
      searchPaths.push(join(process.cwd(), fileName))
    }

    searchPaths.push(GLOBAL_CONFIG_FILE)

    for (const fileName of CONFIG_FILE_NAMES) {
      searchPaths.push(join(GLOBAL_CONFIG_DIR, fileName))
    }

    for (const path of searchPaths) {
      try {
        await access(path)
        return {
          config: this.config,
          path,
          isGlobal: path.includes(GLOBAL_CONFIG_DIR),
        }
      } catch {}
    }

    return null
  }

  async ensureGlobalConfig(): Promise<void> {
    try {
      await access(GLOBAL_CONFIG_FILE)
    } catch {
      await mkdir(GLOBAL_CONFIG_DIR, { recursive: true })
      const defaultConfig = WorktreeConfigSchema.parse(DEFAULT_CONFIG)
      await writeFile(GLOBAL_CONFIG_FILE, JSON.stringify(defaultConfig, null, 2), "utf-8")
    }
  }

  async createGlobalConfig(): Promise<string> {
    await this.saveConfig(DEFAULT_CONFIG, GLOBAL_CONFIG_FILE)
    return GLOBAL_CONFIG_FILE
  }

  async hasGlobalConfig(): Promise<boolean> {
    try {
      await access(GLOBAL_CONFIG_FILE)
      return true
    } catch {
      return false
    }
  }

  getConfigPath(): string | undefined {
    return this.configPath
  }
}

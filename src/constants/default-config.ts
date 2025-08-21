import { WorktreeConfigSchema } from "../schemas/config-schema.js"

export const DEFAULT_CONFIG = WorktreeConfigSchema.parse({})
export const LOCAL_CONFIG_FILE_NAME = ".brancher.json"
export const GLOBAL_CONFIG_DIR = `${process.env.HOME}/.brancher`
export const GLOBAL_CONFIG_FILE = `${GLOBAL_CONFIG_DIR}/settings.json`

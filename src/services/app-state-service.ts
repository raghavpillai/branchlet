import { access, mkdir, readFile, writeFile } from "node:fs/promises"
import { GLOBAL_CONFIG_DIR } from "../constants/index"
import { AppStateSchema, DEFAULT_APP_STATE, type AppState } from "../schemas/app-state-schema.js"

const STATE_FILE = `${GLOBAL_CONFIG_DIR}/state.json`

export class AppStateService {
  private state: AppState

  constructor() {
    this.state = { ...DEFAULT_APP_STATE }
  }

  async load(): Promise<AppState> {
    try {
      await access(STATE_FILE)
      const content = await readFile(STATE_FILE, "utf-8")
      const parsed = JSON.parse(content)
      const result = AppStateSchema.safeParse(parsed)
      if (result.success) {
        this.state = result.data
      }
    } catch {
      // No state file yet, use defaults
    }
    return this.state
  }

  async save(): Promise<void> {
    try {
      await mkdir(GLOBAL_CONFIG_DIR, { recursive: true })
      await writeFile(STATE_FILE, JSON.stringify(this.state, null, 2), "utf-8")
    } catch {
      // Non-critical, silently ignore
    }
  }

  getState(): AppState {
    return { ...this.state }
  }

  update(updates: Partial<AppState>): AppState {
    this.state = { ...this.state, ...updates }
    return this.getState()
  }
}

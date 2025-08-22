import { Box } from "ink"
import { COLORS } from "../constants/index.js"
import {
  CreateWorktree,
  DeleteWorktree,
  ListWorktrees,
  MainPanel,
  SettingsMenu,
} from "../panels/index.js"
import type { WorktreeService } from "../services/index.js"
import type { AppMode } from "../types/index.js"
import { WelcomeHeader } from "./welcome-header.js"

interface AppRouterProps {
  mode: AppMode
  worktreeService: WorktreeService
  lastMenuIndex: number
  gitRoot?: string | undefined
  onMenuSelect: (value: AppMode | "exit", selectedIndex?: number) => void
  onBackToMenu: () => void
  onExit: () => void
}

export function AppRouter({
  mode,
  worktreeService,
  lastMenuIndex,
  gitRoot,
  onMenuSelect,
  onBackToMenu,
  onExit,
}: AppRouterProps) {
  return (
    <Box flexDirection="column">
      <WelcomeHeader mode={mode} gitRoot={gitRoot} />

      {mode === "menu" && (
        <Box borderStyle="round" padding={1} borderColor={COLORS.MUTED}>
          <MainPanel onSelect={onMenuSelect} onCancel={onExit} defaultIndex={lastMenuIndex} />
        </Box>
      )}

      {mode === "create" && (
        <Box borderStyle="round" padding={1} borderColor={COLORS.MUTED}>
          <CreateWorktree
            worktreeService={worktreeService}
            onComplete={onBackToMenu}
            onCancel={onBackToMenu}
          />
        </Box>
      )}

      {mode === "list" && (
        <Box borderStyle="round" padding={1} borderColor={COLORS.MUTED}>
          <ListWorktrees worktreeService={worktreeService} onBack={onBackToMenu} />
        </Box>
      )}

      {mode === "delete" && (
        <Box borderStyle="round" padding={1} borderColor={COLORS.MUTED}>
          <DeleteWorktree
            worktreeService={worktreeService}
            onComplete={onBackToMenu}
            onCancel={onBackToMenu}
          />
        </Box>
      )}

      {mode === "settings" && (
        <Box borderStyle="round" padding={1} borderColor={COLORS.MUTED}>
          <SettingsMenu worktreeService={worktreeService} onBack={onBackToMenu} />
        </Box>
      )}
    </Box>
  )
}

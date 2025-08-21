import { Box, Text, useInput } from "ink"
import { useCallback, useEffect, useState } from "react"
import { COLORS, MESSAGES } from "../constants/index.js"
import {
  CreateWorktree,
  DeleteWorktree,
  ListWorktrees,
  MainPanel,
  SettingsMenu,
} from "../panels/index.js"
import { ConfigService } from "../services/config-service.js"
import { WorktreeService } from "../services/index.js"
import type { AppMode } from "../types/index.js"
import { getUserFriendlyErrorMessage } from "../utils/index.js"
import { ConfirmDialog, StatusIndicator } from "./common/index.js"

function WelcomeHeader({ mode }: { mode: AppMode }): JSX.Element {
  const cwd = process.cwd()
  const formatPath = (path: string): string => {
    const home = process.env.HOME || ""
    return path.replace(home, "~")
  }

  const getHeaderText = (): JSX.Element => {
    if (mode === "menu") {
      return (
        <Text>
          🌳 Welcome to{" "}
          <Text bold color={COLORS.PRIMARY}>
            Brancher
          </Text>
          !
        </Text>
      )
    }

    const modeLabels = {
      create: "Create",
      list: "List",
      delete: "Delete",
      settings: "Settings",
    }

    return (
      <Text>
        🌳 Brancher -{" "}
        <Text bold color={COLORS.PRIMARY}>
          {modeLabels[mode] || mode}
        </Text>
      </Text>
    )
  }

  return (
    <Box borderStyle="round" paddingX={1} paddingY={0} marginBottom={1}>
      <Box flexDirection="column">
        {getHeaderText()}
        <Text color={COLORS.MUTED}>cwd: {formatPath(cwd)}</Text>
      </Box>
    </Box>
  )
}

interface AppProps {
  initialMode?: AppMode
  onExit?: () => void
}

export function App({ initialMode = "menu", onExit }: AppProps): JSX.Element {
  const [mode, setMode] = useState<AppMode>(initialMode)
  const [worktreeService, setWorktreeService] = useState<WorktreeService | null>(null)
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(true)
  const [lastMenuIndex, setLastMenuIndex] = useState(0)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  useEffect(() => {
    initializeService()
  }, [])

  const initializeService = async (): Promise<void> => {
    try {
      setLoading(true)
      setError(undefined)

      const service = new WorktreeService()
      await service.initialize()

      setWorktreeService(service)
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err instanceof Error ? err : new Error(String(err))))
    } finally {
      setLoading(false)
    }
  }

  const handleExit = useCallback((): void => {
    onExit?.()
  }, [onExit])

  const handleBackToMenu = useCallback((): void => {
    setMode("menu")
  }, [])

  useInput((input, key) => {
    if (key.ctrl && input === "c") {
      handleExit()
    }

    if (error && !loading && !showResetConfirm) {
      if (input?.toLowerCase() === "r") {
        setShowResetConfirm(true)
        return
      }

      setError(undefined)
      if (mode !== "menu") {
        setMode("menu")
      }
    }
  })

  const handleResetConfig = async (): Promise<void> => {
    try {
      setShowResetConfirm(false)
      setLoading(true)

      const tempConfigService = new ConfigService()
      await tempConfigService.createGlobalConfig()

      await initializeService()
    } catch (err) {
      setError(`Failed to reset configuration: ${err}`)
      setLoading(false)
    }
  }

  const handleMenuSelect = (value: AppMode | "exit", selectedIndex?: number): void => {
    if (selectedIndex !== undefined) {
      setLastMenuIndex(selectedIndex)
    }
    if (value === "exit") {
      handleExit()
    } else {
      setMode(value)
    }
  }

  if (loading) {
    return (
      <Box flexDirection="column">
        <WelcomeHeader mode={mode} />
        <StatusIndicator status="loading" message={MESSAGES.LOADING_GIT_INFO} />
      </Box>
    )
  }

  if (error) {
    if (showResetConfirm) {
      return (
        <Box flexDirection="column">
          <WelcomeHeader mode={mode} />
          <ConfirmDialog
            title="Reset Configuration"
            message="This will reset all settings to defaults and overwrite your current configuration file. Are you sure?"
            variant="warning"
            onConfirm={handleResetConfig}
            onCancel={() => setShowResetConfirm(false)}
          />
        </Box>
      )
    }

    const isConfigError = error.toLowerCase().includes("configuration")

    return (
      <Box flexDirection="column">
        <WelcomeHeader mode={mode} />
        <Text color={COLORS.ERROR}>{error}</Text>

        {isConfigError && (
          <Box marginTop={1}>
            <Text color={COLORS.MUTED}>
              Press 'r' to reset settings, any other key to retry, or Ctrl+C to exit
            </Text>
          </Box>
        )}

        {!isConfigError && (
          <Box marginTop={1}>
            <Text color={COLORS.MUTED}>Press any key to retry or Ctrl+C to exit</Text>
          </Box>
        )}
      </Box>
    )
  }

  if (!worktreeService) {
    return <Text color={COLORS.ERROR}>Failed to initialize worktree service</Text>
  }

  return (
    <Box flexDirection="column">
      <WelcomeHeader mode={mode} />

      {mode === "menu" && (
        <Box borderStyle="round" padding={1} borderColor={COLORS.MUTED}>
          <MainPanel
            onSelect={handleMenuSelect}
            onCancel={handleExit}
            defaultIndex={lastMenuIndex}
          />
        </Box>
      )}

      {mode === "create" && (
        <Box borderStyle="round" padding={1} borderColor={COLORS.MUTED}>
          <CreateWorktree
            worktreeService={worktreeService}
            onComplete={handleBackToMenu}
            onCancel={handleBackToMenu}
          />
        </Box>
      )}

      {mode === "list" && (
        <Box borderStyle="round" padding={1} borderColor={COLORS.MUTED}>
          <ListWorktrees worktreeService={worktreeService} onBack={handleBackToMenu} />
        </Box>
      )}

      {mode === "delete" && (
        <Box borderStyle="round" padding={1} borderColor={COLORS.MUTED}>
          <DeleteWorktree
            worktreeService={worktreeService}
            onComplete={handleBackToMenu}
            onCancel={handleBackToMenu}
          />
        </Box>
      )}

      {mode === "settings" && (
        <Box borderStyle="round" padding={1} borderColor={COLORS.MUTED}>
          <SettingsMenu worktreeService={worktreeService} onBack={handleBackToMenu} />
        </Box>
      )}
    </Box>
  )
}

import { Text, useInput } from "ink"
import { useCallback, useEffect, useState } from "react"
import { COLORS } from "../constants/index.js"
import { ConfigService } from "../services/config-service.js"
import { WorktreeService } from "../services/index.js"
import type { ShellIntegrationStatus } from "../services/shell-integration-service.js"
import { ShellIntegrationService } from "../services/shell-integration-service.js"
import type { AppMode } from "../types/index.js"
import { getGitRoot, getUserFriendlyErrorMessage } from "../utils/index.js"
import { AppRouter } from "./app-router.js"
import { ErrorState } from "./error-state.js"
import { LoadingState } from "./loading-state.js"

interface AppProps {
  initialMode?: AppMode
  isFromWrapper?: boolean
  onExit?: () => void
}

export function App({ initialMode = "menu", isFromWrapper = false, onExit }: AppProps) {
  const [mode, setMode] = useState<AppMode>(initialMode)
  const [worktreeService, setWorktreeService] = useState<WorktreeService | null>(null)
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(true)
  const [initializing, setInitializing] = useState(true)
  const [lastMenuIndex, setLastMenuIndex] = useState(0)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [gitRoot, setGitRoot] = useState<string>()
  const [shellIntegrationStatus, setShellIntegrationStatus] =
    useState<ShellIntegrationStatus | null>(null)

  const initialize = useCallback(async (): Promise<void> => {
    try {
      const root = await getGitRoot()
      const workingDir = root || process.cwd()
      setGitRoot(workingDir)
      setInitializing(false)

      setLoading(true)
      setError(undefined)

      ShellIntegrationService.detect()
        .then(setShellIntegrationStatus)
        .catch(() => {
          setShellIntegrationStatus({
            isInstalled: false,
            shell: "unknown",
            configPath: null,
            reason: "Detection failed",
          })
        })

      const service = new WorktreeService(workingDir)
      await service.initialize()

      setWorktreeService(service)
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err instanceof Error ? err : new Error(String(err))))
    } finally {
      setLoading(false)
    }
  }, [])

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

      await initialize()
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

  useEffect(() => {
    initialize()
  }, [initialize])

  if (initializing) {
    return null
  }

  if (loading) {
    return <LoadingState mode={mode} gitRoot={gitRoot} />
  }

  if (error) {
    return (
      <ErrorState
        mode={mode}
        error={error}
        showResetConfirm={showResetConfirm}
        onResetConfirm={handleResetConfig}
        onResetCancel={() => setShowResetConfirm(false)}
      />
    )
  }

  if (!worktreeService) {
    return <Text color={COLORS.ERROR}>Failed to initialize worktree service</Text>
  }

  return (
    <AppRouter
      mode={mode}
      worktreeService={worktreeService}
      lastMenuIndex={lastMenuIndex}
      gitRoot={gitRoot}
      shellIntegrationStatus={shellIntegrationStatus}
      isFromWrapper={isFromWrapper}
      onMenuSelect={handleMenuSelect}
      onBackToMenu={handleBackToMenu}
      onExit={handleExit}
      onShellIntegrationComplete={() => {
        ShellIntegrationService.detect()
          .then(setShellIntegrationStatus)
          .catch(() => {})
      }}
    />
  )
}

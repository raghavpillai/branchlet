import { Box, Text } from "ink"
import { COLORS } from "../constants/index.js"
import type { AppMode } from "../types/index.js"
import { ConfirmDialog } from "./common/index.js"
import { WelcomeHeader } from "./welcome-header.js"

interface ErrorStateProps {
  mode: AppMode
  error: string
  showResetConfirm: boolean
  onResetConfirm: () => Promise<void>
  onResetCancel: () => void
}

export function ErrorState({
  mode,
  error,
  showResetConfirm,
  onResetConfirm,
  onResetCancel,
}: ErrorStateProps) {
  if (showResetConfirm) {
    return (
      <Box flexDirection="column">
        <WelcomeHeader mode={mode} />
        <ConfirmDialog
          title="Reset Configuration"
          message="This will reset all settings to defaults and overwrite your current configuration file. Are you sure?"
          variant="warning"
          onConfirm={onResetConfirm}
          onCancel={onResetCancel}
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

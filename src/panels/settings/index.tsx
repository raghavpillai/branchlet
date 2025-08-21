import { Box, Text, useInput } from "ink"
import { useEffect, useState } from "react"
import { SelectPrompt, StatusIndicator } from "../../components/common/index.js"
import { COLORS } from "../../constants/index.js"
import { GLOBAL_CONFIG_FILE } from "../../constants/default-config.js"
import type { WorktreeService } from "../../services/index.js"
import type { SelectOption, WorktreeConfig } from "../../types/index.js"

interface SettingsMenuProps {
  worktreeService: WorktreeService
  onBack: () => void
}

export function SettingsMenu({ worktreeService, onBack }: SettingsMenuProps): JSX.Element {
  const [config, setConfig] = useState<WorktreeConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()

  useEffect(() => {
    loadConfig()
  }, [])

  useInput((input, key) => {
    if (error && input?.toLowerCase() === "r") {
      resetConfig()
      return
    }
    
    if (key.escape || key.return || input) {
      onBack()
    }
  })

  const loadConfig = async (): Promise<void> => {
    try {
      setLoading(true)
      const configService = worktreeService.getConfigService()
      const currentConfig = configService.getConfig()
      setConfig(currentConfig)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const resetConfig = async (): Promise<void> => {
    try {
      const configService = worktreeService.getConfigService()
      await configService.createGlobalConfig()
      const newConfig = configService.getConfig()
      setConfig(newConfig)
      setError(undefined)
    } catch (err) {
      setError(`Failed to reset configuration: ${err}`)
    }
  }

  if (loading) {
    return <StatusIndicator status="loading" message="Loading configuration..." />
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Box marginBottom={2}>
          <Text color={COLORS.ERROR}>Configuration Error</Text>
        </Box>
        
        <Box marginBottom={2}>
          <Text>{error}</Text>
        </Box>

        <Box marginBottom={2}>
          <Text>
            Please edit the configuration file at: <Text bold color={COLORS.PRIMARY}>{GLOBAL_CONFIG_FILE}</Text>
          </Text>
        </Box>

        <Box marginBottom={2}>
          <Text color={COLORS.MUTED}>
            Or press 'r' to reset to default settings, any other key to go back
          </Text>
        </Box>
      </Box>
    )
  }

  if (!config) {
    return (
      <Box flexDirection="column">
        <Text color={COLORS.ERROR}>Failed to load configuration</Text>
        <Box marginTop={1}>
          <Text color={COLORS.MUTED}>Press any key to go back...</Text>
        </Box>
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={2}>
        <Text>
          Configuration file: <Text bold color={COLORS.PRIMARY}>{GLOBAL_CONFIG_FILE}</Text>
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text bold color={COLORS.INFO}>Current Settings:</Text>
      </Box>

      <Box flexDirection="column" marginLeft={2} marginBottom={2}>
        <Text>
          <Text color={COLORS.MUTED}>Copy Patterns:</Text> {config.worktreeCopyPatterns.join(", ")}
        </Text>
        <Text>
          <Text color={COLORS.MUTED}>Ignore Patterns:</Text> {config.worktreeCopyIgnores.length} patterns
        </Text>
        <Text>
          <Text color={COLORS.MUTED}>Path Template:</Text> {config.worktreePathTemplate}
        </Text>
        <Text>
          <Text color={COLORS.MUTED}>Post-Create Command:</Text> {config.postCreateCmd || "(none)"}
        </Text>
        <Text>
          <Text color={COLORS.MUTED}>Terminal Command:</Text> {config.terminalCommand || "(none)"}
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text color={COLORS.MUTED} dimColor>
          Edit the configuration file directly, then restart. Press any key to go back.
        </Text>
      </Box>
    </Box>
  )
}
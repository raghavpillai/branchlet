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

type SettingsStep = 
  | "menu" 
  | "copy-patterns" 
  | "ignore-patterns" 
  | "path-template" 
  | "post-cmd" 
  | "terminal-cmd"

export function SettingsMenu({ worktreeService, onBack }: SettingsMenuProps): JSX.Element {
  const [config, setConfig] = useState<WorktreeConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [step, setStep] = useState<SettingsStep>("menu")

  useEffect(() => {
    loadConfig()
  }, [])

  useInput((input, key) => {
    if (error && input?.toLowerCase() === "r") {
      resetConfig()
      return
    }
    
    if (key.escape) {
      if (step === "menu") {
        onBack()
      } else {
        setStep("menu")
      }
      return
    }
    
    if (step !== "menu" && (key.return || input)) {
      setStep("menu")
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

  const getMenuOptions = (): SelectOption<SettingsStep>[] => [
    {
      label: "Copy Patterns",
      value: "copy-patterns",
      description: `${config?.worktreeCopyPatterns.length || 0} patterns`,
    },
    {
      label: "Ignore Patterns", 
      value: "ignore-patterns",
      description: `${config?.worktreeCopyIgnores.length || 0} patterns`,
    },
    {
      label: "Path Template",
      value: "path-template",
      description: config?.worktreePathTemplate || "",
    },
    {
      label: "Post-Create Commands",
      value: "post-cmd", 
      description: `${config?.postCreateCmd.length || 0} commands`,
    },
    {
      label: "Terminal Command",
      value: "terminal-cmd",
      description: config?.terminalCommand || "(none)",
    },
  ]

  const handleMenuSelect = (value: SettingsStep): void => {
    setStep(value)
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

  switch (step) {
    case "menu":
      return (
        <Box flexDirection="column">
          <Box marginBottom={2}>
            <Text>
              Configuration file: <Text bold color={COLORS.PRIMARY}>{GLOBAL_CONFIG_FILE}</Text>
            </Text>
          </Box>

          <SelectPrompt
            label="Select setting to view:"
            options={getMenuOptions()}
            onSelect={handleMenuSelect}
            onCancel={onBack}
          />
        </Box>
      )

    case "copy-patterns":
      return (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text bold color={COLORS.INFO}>Copy Patterns</Text>
          </Box>
          
          <Box marginBottom={2}>
            <Text color={COLORS.MUTED}>Files/patterns copied to new worktrees:</Text>
          </Box>

          <Box flexDirection="column" marginLeft={2} marginBottom={2}>
            {config?.worktreeCopyPatterns.map((pattern) => (
              <Text key={pattern}>• {pattern}</Text>
            ))}
          </Box>

          <Box>
            <Text color={COLORS.MUTED} dimColor>
              Edit in {GLOBAL_CONFIG_FILE}. Press any key to go back.
            </Text>
          </Box>
        </Box>
      )

    case "ignore-patterns":
      return (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text bold color={COLORS.INFO}>Ignore Patterns</Text>
          </Box>
          
          <Box marginBottom={2}>
            <Text color={COLORS.MUTED}>Files/patterns excluded from copying:</Text>
          </Box>

          <Box flexDirection="column" marginLeft={2} marginBottom={2}>
            {config?.worktreeCopyIgnores.map((pattern) => (
              <Text key={pattern} color={COLORS.MUTED}>• {pattern}</Text>
            ))}
          </Box>

          <Box>
            <Text color={COLORS.MUTED} dimColor>
              Edit in {GLOBAL_CONFIG_FILE}. Press any key to go back.
            </Text>
          </Box>
        </Box>
      )

    case "path-template":
      return (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text bold color={COLORS.INFO}>Worktree Path Template</Text>
          </Box>
          
          <Box marginBottom={2}>
            <Text color={COLORS.MUTED}>Template for worktree directory paths:</Text>
          </Box>

          <Box marginLeft={2} marginBottom={2}>
            <Text color={COLORS.SUCCESS}>{config?.worktreePathTemplate}</Text>
          </Box>

          <Box marginBottom={2}>
            <Text color={COLORS.INFO}>Available variables:</Text>
            <Box flexDirection="column" marginLeft={2}>
              <Text color={COLORS.MUTED}>• $BASE_PATH - Repository name</Text>
              <Text color={COLORS.MUTED}>• $WORKTREE_PATH - Full worktree path</Text>
              <Text color={COLORS.MUTED}>• $BRANCH_NAME - New branch name</Text>
            </Box>
          </Box>

          <Box>
            <Text color={COLORS.MUTED} dimColor>
              Edit in {GLOBAL_CONFIG_FILE}. Press any key to go back.
            </Text>
          </Box>
        </Box>
      )

    case "post-cmd":
      return (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text bold color={COLORS.INFO}>Post-Create Commands</Text>
          </Box>
          
          <Box marginBottom={2}>
            <Text color={COLORS.MUTED}>Commands executed after creating a worktree (in order):</Text>
          </Box>

          <Box flexDirection="column" marginLeft={2} marginBottom={2}>
            {config?.postCreateCmd.length === 0 ? (
              <Text color={COLORS.MUTED}>(none)</Text>
            ) : (
              config?.postCreateCmd.map((command, index) => (
                <Text key={command}>
                  <Text color={COLORS.MUTED}>{index + 1}.</Text> {command}
                </Text>
              ))
            )}
          </Box>

          <Box marginBottom={2}>
            <Text color={COLORS.INFO}>Available variables:</Text>
            <Box flexDirection="column" marginLeft={2}>
              <Text color={COLORS.MUTED}>• $WORKTREE_PATH - Path to new worktree</Text>
              <Text color={COLORS.MUTED}>• $BRANCH_NAME - New branch name</Text>
              <Text color={COLORS.MUTED}>• $SOURCE_BRANCH - Source branch name</Text>
            </Box>
          </Box>

          <Box>
            <Text color={COLORS.MUTED} dimColor>
              Edit in {GLOBAL_CONFIG_FILE}. Press any key to go back.
            </Text>
          </Box>
        </Box>
      )

    case "terminal-cmd":
      return (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text bold color={COLORS.INFO}>Terminal Command</Text>
          </Box>
          
          <Box marginBottom={2}>
            <Text color={COLORS.MUTED}>Command to open terminal in new worktree:</Text>
          </Box>

          <Box marginLeft={2} marginBottom={2}>
            <Text color={COLORS.SUCCESS}>{config?.terminalCommand || "(none)"}</Text>
          </Box>

          <Box marginBottom={2}>
            <Text color={COLORS.INFO}>Available variables:</Text>
            <Box flexDirection="column" marginLeft={2}>
              <Text color={COLORS.MUTED}>• $WORKTREE_PATH - Path to new worktree</Text>
            </Box>
          </Box>

          <Box>
            <Text color={COLORS.MUTED} dimColor>
              Edit in {GLOBAL_CONFIG_FILE}. Press any key to go back.
            </Text>
          </Box>
        </Box>
      )

    default:
      return <Text>Unknown step</Text>
  }
}
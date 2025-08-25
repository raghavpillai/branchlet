import { Box, Text, useInput } from "ink"
import { useCallback, useEffect, useState } from "react"
import { SelectPrompt, StatusIndicator } from "../../components/common/index.js"
import { GLOBAL_CONFIG_FILE } from "../../constants/default-config.js"
import { COLORS } from "../../constants/index.js"
import type { WorktreeConfig } from "../../schemas/config-schema.js"
import type { WorktreeService } from "../../services/index.js"
import type { SelectOption } from "../../types/index.js"

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
  | "delete-branch"

export function SettingsMenu({ worktreeService, onBack }: SettingsMenuProps) {
  const [config, setConfig] = useState<WorktreeConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [step, setStep] = useState<SettingsStep>("menu")
  const [configPath, setConfigPath] = useState<string>()

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

  const loadConfig = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const configService = worktreeService.getConfigService()
      const currentConfig = configService.getConfig()
      setConfig(currentConfig)
      setConfigPath(configService.getConfigPath() || GLOBAL_CONFIG_FILE)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [worktreeService])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  const resetConfig = async (): Promise<void> => {
    try {
      const configService = worktreeService.getConfigService()
      await configService.createGlobalConfig()
      const newConfig = configService.getConfig()
      setConfig(newConfig)
      setConfigPath(configService.getConfigPath() || GLOBAL_CONFIG_FILE)
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
    {
      label: "Delete Branch with Worktree",
      value: "delete-branch",
      description: config?.deleteBranchWithWorktree ? "enabled" : "disabled",
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
        <Box>
          <Text color={COLORS.ERROR}>Configuration Error</Text>
        </Box>

        <Box>
          <Text>{error}</Text>
        </Box>

        <Box>
          <Text>
            Please edit the configuration file at:{" "}
            <Text bold color={COLORS.PRIMARY}>
              {configPath || GLOBAL_CONFIG_FILE}
            </Text>
          </Text>
        </Box>

        <Box>
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
          <Box>
            <Text>
              Configuration file:{" "}
              <Text bold color={COLORS.PRIMARY}>
              {configPath || GLOBAL_CONFIG_FILE}
              </Text>
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
          <Box>
            <Text bold color={COLORS.INFO}>
              Copy Patterns
            </Text>
          </Box>

          <Box>
            <Text color={COLORS.MUTED}>Files/patterns copied to new worktrees:</Text>
          </Box>

          <Box flexDirection="column" marginLeft={2}>
            {config?.worktreeCopyPatterns.map((pattern) => (
              <Text key={pattern}>• {pattern}</Text>
            ))}
          </Box>

          <Box marginTop={1}>
            <Text color={COLORS.MUTED} dimColor>
              Edit in {configPath || GLOBAL_CONFIG_FILE}. Press any key to go back.
            </Text>
          </Box>
        </Box>
      )

    case "ignore-patterns":
      return (
        <Box flexDirection="column">
          <Box>
            <Text bold color={COLORS.INFO}>
              Ignore Patterns
            </Text>
          </Box>

          <Box>
            <Text color={COLORS.MUTED}>Files/patterns excluded from copying:</Text>
          </Box>

          <Box flexDirection="column" marginLeft={2}>
            {config?.worktreeCopyIgnores.map((pattern) => (
              <Text key={pattern} color={COLORS.MUTED}>
                • {pattern}
              </Text>
            ))}
          </Box>

          <Box marginTop={1}>
            <Text color={COLORS.MUTED} dimColor>
              Edit in {configPath || GLOBAL_CONFIG_FILE}. Press any key to go back.
            </Text>
          </Box>
        </Box>
      )

    case "path-template":
      return (
        <Box flexDirection="column">
          <Box>
            <Text bold color={COLORS.INFO}>
              Worktree Path Template
            </Text>
          </Box>

          <Box>
            <Text color={COLORS.MUTED}>Template for worktree directory paths:</Text>
          </Box>

          <Box marginLeft={2}>
            <Text color={COLORS.SUCCESS}>{config?.worktreePathTemplate}</Text>
          </Box>

          <Box>
            <Text color={COLORS.INFO}>Available variables:</Text>
            <Box flexDirection="column" marginLeft={2}>
              <Text color={COLORS.MUTED}>• $BASE_PATH - Repository name</Text>
              <Text color={COLORS.MUTED}>• $WORKTREE_PATH - Full worktree path</Text>
              <Text color={COLORS.MUTED}>• $BRANCH_NAME - New branch name</Text>
            </Box>
          </Box>

          <Box marginTop={1}>
            <Text color={COLORS.MUTED} dimColor>
              Edit in {configPath || GLOBAL_CONFIG_FILE}. Press any key to go back.
            </Text>
          </Box>
        </Box>
      )

    case "post-cmd":
      return (
        <Box flexDirection="column">
          <Box>
            <Text bold color={COLORS.INFO}>
              Post-Create Commands
            </Text>
          </Box>

          <Box>
            <Text color={COLORS.MUTED}>
              Commands executed after creating a worktree (in order):
            </Text>
          </Box>

          <Box flexDirection="column" marginLeft={2}>
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

          <Box>
            <Text color={COLORS.INFO}>Available variables:</Text>
            <Box flexDirection="column" marginLeft={2}>
              <Text color={COLORS.MUTED}>• $WORKTREE_PATH - Path to new worktree</Text>
              <Text color={COLORS.MUTED}>• $BRANCH_NAME - New branch name</Text>
              <Text color={COLORS.MUTED}>• $SOURCE_BRANCH - Source branch name</Text>
            </Box>
          </Box>

          <Box marginTop={1}>
            <Text color={COLORS.MUTED} dimColor>
              Edit in {configPath || GLOBAL_CONFIG_FILE}. Press any key to go back.
            </Text>
          </Box>
        </Box>
      )

    case "terminal-cmd":
      return (
        <Box flexDirection="column">
          <Box>
            <Text bold color={COLORS.INFO}>
              Terminal Command
            </Text>
          </Box>

          <Box>
            <Text color={COLORS.MUTED}>Command to open terminal in new worktree:</Text>
          </Box>

          <Box marginLeft={2}>
            <Text color={COLORS.SUCCESS}>{config?.terminalCommand || "(none)"}</Text>
          </Box>

          <Box>
            <Text color={COLORS.INFO}>Available variables:</Text>
            <Box flexDirection="column" marginLeft={2}>
              <Text color={COLORS.MUTED}>• $WORKTREE_PATH - Path to new worktree</Text>
            </Box>
          </Box>

          <Box marginTop={1}>
            <Text color={COLORS.MUTED} dimColor>
              Edit in {configPath || GLOBAL_CONFIG_FILE}. Press any key to go back.
            </Text>
          </Box>
        </Box>
      )

    case "delete-branch":
      return (
        <Box flexDirection="column">
          <Box>
            <Text bold color={COLORS.INFO}>
              Delete Branch with Worktree
            </Text>
          </Box>

          <Box>
            <Text color={COLORS.MUTED}>Also delete the associated git branch when deleting a worktree:</Text>
          </Box>

          <Box marginLeft={2}>
            <Text color={config?.deleteBranchWithWorktree ? COLORS.SUCCESS : COLORS.MUTED}>
              {config?.deleteBranchWithWorktree ? "✓ Enabled" : "✗ Disabled"}
            </Text>
          </Box>

          {config?.deleteBranchWithWorktree && (
            <Box>
              <Text color={COLORS.WARNING}>
                ⚠️  This is a more destructive operation. Branches will be permanently deleted.
              </Text>
            </Box>
          )}

          <Box>
            <Text color={COLORS.INFO}>Safety features:</Text>
            <Box flexDirection="column" marginLeft={2}>
              <Text color={COLORS.MUTED}>• Never deletes current or default branches</Text>
              <Text color={COLORS.MUTED}>• Shows branch status (commits ahead/behind)</Text>
              <Text color={COLORS.MUTED}>• Requires explicit confirmation</Text>
            </Box>
          </Box>

          <Box marginTop={1}>
            <Text color={COLORS.MUTED} dimColor>
              Edit in {configPath || GLOBAL_CONFIG_FILE}. Press any key to go back.
            </Text>
          </Box>
        </Box>
      )

    default:
      return <Text>Unknown step</Text>
  }
}

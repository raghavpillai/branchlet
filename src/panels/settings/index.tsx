import { Box, Text } from "ink"
import { useEffect, useState } from "react"
import { InputPrompt, SelectPrompt, StatusIndicator } from "../../components/common/index.js"
import { COLORS } from "../../constants/index.js"
import type { WorktreeService } from "../../services/index.js"
import type { SelectOption, WorktreeConfig } from "../../types/index.js"

interface SettingsMenuProps {
  worktreeService: WorktreeService
  onBack: () => void
}

type SettingsStep =
  | "menu"
  | "edit-copy-patterns"
  | "edit-ignore-patterns"
  | "edit-path-template"
  | "edit-post-cmd"
  | "edit-terminal-cmd"
  | "save-config"
  | "reset-config"

export function SettingsMenu({ worktreeService, onBack }: SettingsMenuProps): JSX.Element {
  const [step, setStep] = useState<SettingsStep>("menu")
  const [config, setConfig] = useState<WorktreeConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<string>()

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async (): Promise<void> => {
    try {
      setLoading(true)
      const configService = worktreeService.getConfigService()
      const currentConfig = configService.getConfig()
      setConfig(currentConfig)
    } catch (error) {
      setStatus(`Failed to load configuration: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async (): Promise<void> => {
    if (!config) return

    try {
      const configService = worktreeService.getConfigService()
      await configService.saveConfig(config)
      setStatus("Configuration saved successfully!")

      setTimeout(() => {
        setStatus(undefined)
        setStep("menu")
      }, 2000)
    } catch (error) {
      setStatus(`Failed to save configuration: ${error}`)
    }
  }

  const resetConfig = async (): Promise<void> => {
    try {
      const configService = worktreeService.getConfigService()
      const defaultConfig = configService.resetConfig()
      setConfig(defaultConfig)
      setStatus("Configuration reset to defaults!")

      setTimeout(() => {
        setStatus(undefined)
        setStep("menu")
      }, 2000)
    } catch (error) {
      setStatus(`Failed to reset configuration: ${error}`)
    }
  }

  const getMenuOptions = (): SelectOption<SettingsStep>[] => [
    {
      label: "Copy Patterns",
      value: "edit-copy-patterns",
      description: config?.worktreeCopyPatterns.join(", ") || "",
    },
    {
      label: "Ignore Patterns",
      value: "edit-ignore-patterns",
      description: `${config?.worktreeCopyIgnores.length || 0} patterns`,
    },
    {
      label: "Path Template",
      value: "edit-path-template",
      description: config?.worktreePathTemplate || "",
    },
    {
      label: "Post-Create Command",
      value: "edit-post-cmd",
      description: config?.postCreateCmd || "(none)",
    },
    {
      label: "Terminal Command",
      value: "edit-terminal-cmd",
      description: config?.terminalCommand || "(none)",
    },
    {
      label: "Save Configuration",
      value: "save-config",
    },
    {
      label: "Reset to Defaults",
      value: "reset-config",
    },
  ]

  const handleMenuSelect = (value: SettingsStep): void => {
    if (value === "save-config") {
      saveConfig()
    } else if (value === "reset-config") {
      resetConfig()
    } else {
      setStep(value)
    }
  }

  const updateConfigField = <K extends keyof WorktreeConfig>(
    field: K,
    value: WorktreeConfig[K]
  ): void => {
    if (!config) return
    setConfig((prev) => (prev ? { ...prev, [field]: value } : null))
  }

  if (loading) {
    return <StatusIndicator status="loading" message="Loading configuration..." />
  }

  if (status) {
    return <StatusIndicator status="info" message={status} spinner={false} />
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
            <Text bold color={COLORS.PRIMARY}>
              Settings
            </Text>
          </Box>

          <SelectPrompt
            label="Select setting to edit:"
            options={getMenuOptions()}
            onSelect={handleMenuSelect}
            onCancel={onBack}
          />
        </Box>
      )

    case "edit-copy-patterns":
      return (
        <InputPrompt
          label="Copy Patterns (comma-separated):"
          defaultValue={config.worktreeCopyPatterns.join(", ")}
          onSubmit={(value) => {
            const patterns = value
              .split(",")
              .map((p) => p.trim())
              .filter((p) => p)
            updateConfigField("worktreeCopyPatterns", patterns)
            setStep("menu")
          }}
          onCancel={() => setStep("menu")}
        />
      )

    case "edit-ignore-patterns":
      return (
        <Box flexDirection="column">
          <Text>Current ignore patterns:</Text>
          <Box flexDirection="column" marginLeft={2} marginY={1}>
            {config.worktreeCopyIgnores.map((pattern) => (
              <Text key={pattern} color={COLORS.MUTED}>
                • {pattern}
              </Text>
            ))}
          </Box>
          <InputPrompt
            label="Ignore Patterns (comma-separated):"
            defaultValue={config.worktreeCopyIgnores.join(", ")}
            onSubmit={(value) => {
              const patterns = value
                .split(",")
                .map((p) => p.trim())
                .filter((p) => p)
              updateConfigField("worktreeCopyIgnores", patterns)
              setStep("menu")
            }}
            onCancel={() => setStep("menu")}
          />
        </Box>
      )

    case "edit-path-template":
      return (
        <Box flexDirection="column">
          <Text color={COLORS.INFO}>
            Available variables: $BASE_PATH, $WORKTREE_PATH, $BRANCH_NAME
          </Text>
          <InputPrompt
            label="Worktree Path Template:"
            defaultValue={config.worktreePathTemplate}
            onSubmit={(value) => {
              updateConfigField("worktreePathTemplate", value)
              setStep("menu")
            }}
            onCancel={() => setStep("menu")}
          />
        </Box>
      )

    case "edit-post-cmd":
      return (
        <Box flexDirection="column">
          <Text color={COLORS.INFO}>
            Available variables: $WORKTREE_PATH, $BRANCH_NAME, $SOURCE_BRANCH
          </Text>
          <InputPrompt
            label="Post-Create Command:"
            defaultValue={config.postCreateCmd}
            onSubmit={(value) => {
              updateConfigField("postCreateCmd", value)
              setStep("menu")
            }}
            onCancel={() => setStep("menu")}
          />
        </Box>
      )

    case "edit-terminal-cmd":
      return (
        <InputPrompt
          label="Terminal Command:"
          defaultValue={config.terminalCommand}
          onSubmit={(value) => {
            updateConfigField("terminalCommand", value)
            setStep("menu")
          }}
          onCancel={() => setStep("menu")}
        />
      )

    default:
      return <Text>Unknown step</Text>
  }
}

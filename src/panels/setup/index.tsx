import { Box, Text, useInput } from "ink"
import { useEffect, useState } from "react"
import { ConfirmDialog, SelectPrompt, StatusIndicator } from "../../components/common/index.js"
import { COLORS } from "../../constants/index.js"
import {
  ShellIntegrationService,
  type ShellIntegrationStatus,
} from "../../services/shell-integration-service.js"
import type { SelectOption } from "../../types/index.js"

interface SetupShellIntegrationProps {
  shellIntegrationStatus: ShellIntegrationStatus | null
  onComplete: () => void
  onCancel: () => void
}

type SetupStep = "select-shell" | "confirm" | "installing" | "success" | "error"

export function SetupShellIntegration({
  shellIntegrationStatus,
  onComplete,
  onCancel,
}: SetupShellIntegrationProps) {
  const [step, setStep] = useState<SetupStep>("select-shell")
  const [selectedShell, setSelectedShell] = useState<"zsh" | "bash" | null>(null)
  const [error, setError] = useState<string>()

  useInput((input, key) => {
    if (step === "error") {
      if (key.escape || key.return || input) {
        onCancel()
      }
    }
  })

  // Auto-select shell if detected
  useEffect(() => {
    if (shellIntegrationStatus?.shell && shellIntegrationStatus.shell !== "unknown") {
      setSelectedShell(shellIntegrationStatus.shell)
    }
  }, [shellIntegrationStatus])

  const handleShellSelect = (shell: "zsh" | "bash") => {
    setSelectedShell(shell)
    setStep("confirm")
  }

  const handleConfirm = async () => {
    if (!selectedShell) {
      return
    }

    setStep("installing")
    setError(undefined)

    try {
      await ShellIntegrationService.install(selectedShell, "branchlet")
      setStep("success")

      setTimeout(() => {
        onComplete()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStep("error")
    }
  }

  const handleCancel = () => {
    if (step === "confirm") {
      setStep("select-shell")
    } else {
      onCancel()
    }
  }

  if (step === "installing") {
    return (
      <Box flexDirection="column">
        <StatusIndicator status="loading" message="Installing shell integration..." spinner />
      </Box>
    )
  }

  if (step === "success") {
    const configFile = selectedShell === "zsh" ? "~/.zshrc" : "~/.bashrc"
    return (
      <Box flexDirection="column" gap={1}>
        <StatusIndicator status="success" message="Shell integration installed successfully!" />
        <Box marginTop={1} flexDirection="column">
          <Text color={COLORS.INFO}>
            Added to: <Text bold>{configFile}</Text>
          </Text>
          <Text color={COLORS.MUTED} dimColor>
            Reload your shell: <Text color={COLORS.PRIMARY}>source {configFile}</Text>
          </Text>
          <Box marginTop={1}>
            <Text color={COLORS.SUCCESS}>
              Try it now: <Text bold>branchlet</Text>
            </Text>
          </Box>
        </Box>
      </Box>
    )
  }

  if (step === "error") {
    return (
      <Box flexDirection="column" gap={1}>
        <StatusIndicator status="error" message="Failed to install shell integration" />
        {error && (
          <Box marginLeft={2}>
            <Text color={COLORS.ERROR}>{error}</Text>
          </Box>
        )}
        <Box marginTop={1}>
          <Text color={COLORS.MUTED}>Press any key to go back...</Text>
        </Box>
      </Box>
    )
  }

  if (step === "confirm" && selectedShell) {
    const configFile = selectedShell === "zsh" ? "~/.zshrc" : "~/.bashrc"
    const commandName = "branchlet"

    return (
      <ConfirmDialog
        title="Install Shell Integration"
        message={
          <Box flexDirection="column" gap={1}>
            <Text>
              This will add the following function to <Text bold>{configFile}</Text>:
            </Text>
            <Box
              marginTop={1}
              marginBottom={1}
              paddingX={2}
              paddingY={1}
              borderStyle="round"
              borderColor={COLORS.MUTED}
            >
              <Text color={COLORS.MUTED} dimColor>
                {`${commandName}() {
  if [ $# -eq 0 ]; then
    local dir=$(FORCE_COLOR=3 command ${commandName} --from-wrapper)
    if [ -n "$dir" ]; then
      cd "$dir" && echo "Branchlet: Navigated to $(pwd)"
    fi
  else
    command ${commandName} "$@"
  fi
}`}
              </Text>
            </Box>
            <Text color={COLORS.INFO}>
              After installation, run: <Text bold>source {configFile}</Text>
            </Text>
            <Text color={COLORS.SUCCESS}>
              Then use: <Text bold>{commandName}</Text> to quickly switch directories
            </Text>
          </Box>
        }
        confirmLabel="Install"
        cancelLabel="Cancel"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        variant="default"
      />
    )
  }

  // Step: select-shell
  const shellOptions: SelectOption<"zsh" | "bash">[] = []

  if (shellIntegrationStatus?.shell === "zsh") {
    shellOptions.push({ label: "zsh (~/.zshrc)", value: "zsh", description: "detected" })
    shellOptions.push({ label: "bash (~/.bashrc)", value: "bash" })
  } else if (shellIntegrationStatus?.shell === "bash") {
    shellOptions.push({ label: "zsh (~/.zshrc)", value: "zsh" })
    shellOptions.push({ label: "bash (~/.bashrc)", value: "bash", description: "detected" })
  } else {
    shellOptions.push({ label: "zsh (~/.zshrc)", value: "zsh" })
    shellOptions.push({ label: "bash (~/.bashrc)", value: "bash" })
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color={COLORS.INFO}>
          Shell integration wraps the <Text bold>branchlet</Text> command to enable quick directory
          switching.
        </Text>
      </Box>

      <SelectPrompt
        label="Select your shell:"
        options={shellOptions}
        onSelect={handleShellSelect}
        onCancel={onCancel}
        defaultIndex={selectedShell === "zsh" ? 0 : selectedShell === "bash" ? 1 : 0}
      />
    </Box>
  )
}

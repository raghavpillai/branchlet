import { Box, Text, useInput } from "ink"
import { useEffect, useMemo, useState } from "react"
import { COLORS } from "../../constants/index.js"
import { useBorderContext } from "../../contexts/border-context.js"
import type { ConfirmDialogProps } from "../../types/index.js"

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Yes",
  cancelLabel = "No",
  onConfirm,
  onCancel,
  variant = "default",
}: ConfirmDialogProps) {
  const [selectedOption, setSelectedOption] = useState<"confirm" | "cancel">("cancel")
  const borderContext = useBorderContext()

  const variantColors = useMemo(
    () => ({
      default: COLORS.INFO,
      warning: COLORS.WARNING,
      danger: COLORS.ERROR,
    }),
    []
  )

  const borderColors = useMemo(
    () => ({
      default: COLORS.INFO,
      warning: COLORS.WARNING,
      danger: COLORS.ERROR,
    }),
    []
  )

  useEffect(() => {
    borderContext?.setBorderColor(borderColors[variant])
    return () => {
      borderContext?.setBorderColor(COLORS.MUTED)
    }
  }, [variant, borderContext, borderColors])

  useInput((input, key) => {
    if (key.escape) {
      onCancel()
      return
    }

    if (key.return) {
      if (selectedOption === "confirm") {
        onConfirm()
      } else {
        onCancel()
      }
      return
    }

    if (key.leftArrow || key.rightArrow || key.tab) {
      setSelectedOption((prev) => (prev === "confirm" ? "cancel" : "confirm"))
      return
    }

    if (input.toLowerCase() === "y") {
      setSelectedOption("confirm")
    } else if (input.toLowerCase() === "n") {
      setSelectedOption("cancel")
    }
  })

  return (
    <Box flexDirection="column" width="100%">
      <Box marginBottom={1}>
        <Text color={variantColors[variant]} bold>
          {title}
        </Text>
      </Box>

      <Box marginBottom={2} width="100%">
        {typeof message === "string" ? <Text>{message}</Text> : message}
      </Box>

      <Box justifyContent="center" columnGap={2} width="100%">
        <Box borderStyle="round" paddingX={2} paddingY={0} borderColor={COLORS.MUTED}>
          <Text
            color={selectedOption === "confirm" ? "white" : COLORS.MUTED}
            bold={selectedOption === "confirm"}
          >
            {confirmLabel}
          </Text>
        </Box>

        <Box borderStyle="round" paddingX={2} paddingY={0} borderColor={COLORS.MUTED}>
          <Text
            color={selectedOption === "cancel" ? "white" : COLORS.MUTED}
            bold={selectedOption === "cancel"}
          >
            {cancelLabel}
          </Text>
        </Box>
      </Box>

      <Box marginTop={1} justifyContent="center" width="100%">
        <Text color={COLORS.MUTED} dimColor>
          Use ←→ or Tab to navigate, Enter to confirm, Esc to cancel
        </Text>
      </Box>
    </Box>
  )
}

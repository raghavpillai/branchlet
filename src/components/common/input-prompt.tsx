import { Box, Text, useInput } from "ink"
import { useState } from "react"
import { COLORS } from "../../constants/index.js"
import type { InputPromptProps } from "../../types/index.js"

export function InputPrompt({
  label,
  placeholder = "",
  defaultValue = "",
  validate,
  onSubmit,
  onCancel,
}: InputPromptProps): JSX.Element {
  const [value, setValue] = useState(defaultValue)
  const [error, setError] = useState<string>()

  // Real-time validation
  const currentError = validate?.(value)
  const isValid = !currentError

  useInput((input, key) => {
    if (key.escape) {
      onCancel?.()
      return
    }

    if (key.return) {
      if (currentError) {
        setError(currentError)
        return
      }

      setError(undefined)
      onSubmit(value)
      return
    }

    if (key.backspace || key.delete) {
      setValue((prev) => prev.slice(0, -1))
      setError(undefined)
      return
    }

    if (input && !key.ctrl && !key.meta) {
      setValue((prev) => prev + input)
      setError(undefined)
    }
  })

  return (
    <Box flexDirection="column">
      <Box marginBottom={0}>
        <Text>{label}</Text>
      </Box>

      <Box
        borderStyle="round"
        {...(value ? { borderColor: isValid ? COLORS.SUCCESS : COLORS.ERROR } : {})}
        paddingX={1}
        paddingY={0}
      >
        <Text>{value}</Text>
        {!value && placeholder && (
          <Text color={COLORS.MUTED} dimColor>
            {placeholder}
          </Text>
        )}
        <Text>{"|"}</Text>
      </Box>

      {(error || (value && currentError)) && (
        <Box marginTop={1}>
          <Text color={COLORS.ERROR}>{error || currentError}</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color={COLORS.MUTED} dimColor>
          Press Enter to confirm, Esc to cancel
        </Text>
      </Box>
    </Box>
  )
}

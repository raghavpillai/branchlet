import { Box, Text, useInput } from "ink"
import { useEffect, useState } from "react"
import { COLORS } from "../../constants/index.js"
import type { SelectPromptProps } from "../../types/index.js"

export function SelectPrompt<T = string>({
  label,
  options,
  onSelect,
  onCancel,
  defaultIndex = 0,
}: SelectPromptProps<T>) {
  const [selectedIndex, setSelectedIndex] = useState(defaultIndex)

  useEffect(() => {
    setSelectedIndex(Math.max(0, Math.min(defaultIndex, options.length - 1)))
  }, [defaultIndex, options.length])

  useInput((input, key) => {
    if (key.escape) {
      onCancel?.()
      return
    }

    if (key.return) {
      const selectedOption = options[selectedIndex]
      if (selectedOption) {
        onSelect(selectedOption.value, selectedIndex)
      }
      return
    }

    if (key.upArrow || input.toLowerCase() === "k") {
      setSelectedIndex((prev) => (prev === 0 ? options.length - 1 : prev - 1))
      return
    }

    if (key.downArrow || input.toLowerCase() === "j") {
      setSelectedIndex((prev) => (prev === options.length - 1 ? 0 : prev + 1))
      return
    }

    const numericInput = Number.parseInt(input, 10)
    if (!Number.isNaN(numericInput) && numericInput >= 1 && numericInput <= options.length) {
      setSelectedIndex(numericInput - 1)
    }
  })

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text>{label}</Text>
      </Box>

      {options.map((option, index) => {
        const isSelected = index === selectedIndex
        const marker = isSelected ? "> " : "  "
        const textColor = option.color || (isSelected ? COLORS.PRIMARY : undefined)

        return (
          <Box key={option.value as React.Key} marginLeft={1}>
            <Text {...(textColor ? { color: textColor } : {})}>
              {marker}
              {option.label}
            </Text>
            {option.description && (
              <Text color={COLORS.MUTED} dimColor italic>
                {" "}
                ({option.description})
              </Text>
            )}
          </Box>
        )
      })}

      <Box marginTop={1}>
        <Text color={COLORS.MUTED} dimColor>
          Use ↑↓ arrows to navigate, Enter to select, Esc to cancel
        </Text>
      </Box>
    </Box>
  )
}

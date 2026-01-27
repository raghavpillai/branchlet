import { Box, Text, useInput } from "ink"
import { useEffect, useState } from "react"
import { COLORS } from "../../constants/index.js"
import type { SelectPromptProps } from "../../types/index.js"

const MAX_VISIBLE = 10

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

  const getVisibleRange = () => {
    if (options.length <= MAX_VISIBLE) {
      return { start: 0, end: options.length }
    }
    const half = Math.floor(MAX_VISIBLE / 2)
    let start = selectedIndex - half
    let end = selectedIndex + half + (MAX_VISIBLE % 2)
    if (start < 0) {
      start = 0
      end = MAX_VISIBLE
    } else if (end > options.length) {
      end = options.length
      start = options.length - MAX_VISIBLE
    }
    return { start, end }
  }

  const { start, end } = getVisibleRange()
  const visibleOptions = options.slice(start, end)
  const hasMoreAbove = start > 0
  const hasMoreBelow = end < options.length

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

      {hasMoreAbove && (
        <Box marginLeft={1}>
          <Text color={COLORS.MUTED} dimColor>
            ↑ {start} more above
          </Text>
        </Box>
      )}

      {visibleOptions.map((option, visibleIndex) => {
        const actualIndex = start + visibleIndex
        const isSelected = actualIndex === selectedIndex
        const marker = isSelected ? "> " : "  "

        return (
          <Box key={option.value as React.Key} marginLeft={1}>
            <Text {...(isSelected ? { color: COLORS.PRIMARY } : {})}>
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

      {hasMoreBelow && (
        <Box marginLeft={1}>
          <Text color={COLORS.MUTED} dimColor>
            ↓ {options.length - end} more below
          </Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color={COLORS.MUTED} dimColor>
          Use ↑↓ arrows to navigate, Enter to select, Esc to cancel
        </Text>
      </Box>
    </Box>
  )
}

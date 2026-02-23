import { Box, Text, useInput } from "ink"
import { useEffect, useMemo, useState } from "react"
import { COLORS } from "../../constants/index.js"
import type { SelectPromptProps } from "../../types/index.js"

const MAX_VISIBLE = 10

export function SelectPrompt<T = string>({
  label,
  options,
  onSelect,
  onCancel,
  defaultIndex = 0,
  searchable = false,
}: SelectPromptProps<T>) {
  const [selectedIndex, setSelectedIndex] = useState(defaultIndex)
  const [searchQuery, setSearchQuery] = useState("")

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery) return options
    const query = searchQuery.toLowerCase()
    return options.filter((opt) => opt.label.toLowerCase().includes(query))
  }, [options, searchQuery, searchable])

  useEffect(() => {
    setSelectedIndex(Math.max(0, Math.min(defaultIndex, options.length - 1)))
  }, [defaultIndex, options.length])

  // Clamp selected index when filtered list shrinks
  useEffect(() => {
    if (selectedIndex >= filteredOptions.length && filteredOptions.length > 0) {
      setSelectedIndex(filteredOptions.length - 1)
    }
  }, [filteredOptions.length, selectedIndex])

  const getVisibleRange = () => {
    if (filteredOptions.length <= MAX_VISIBLE) {
      return { start: 0, end: filteredOptions.length }
    }
    const half = Math.floor(MAX_VISIBLE / 2)
    let start = selectedIndex - half
    let end = selectedIndex + half + (MAX_VISIBLE % 2)
    if (start < 0) {
      start = 0
      end = MAX_VISIBLE
    } else if (end > filteredOptions.length) {
      end = filteredOptions.length
      start = filteredOptions.length - MAX_VISIBLE
    }
    return { start, end }
  }

  const { start, end } = getVisibleRange()
  const visibleOptions = filteredOptions.slice(start, end)
  const hasMoreAbove = start > 0
  const hasMoreBelow = end < filteredOptions.length

  useInput((input, key) => {
    if (key.escape) {
      if (searchable && searchQuery) {
        setSearchQuery("")
        return
      }
      onCancel?.()
      return
    }

    if (key.return) {
      const selectedOption = filteredOptions[selectedIndex]
      if (selectedOption && !selectedOption.disabled) {
        onSelect(selectedOption.value, selectedIndex)
      }
      return
    }

    if (key.upArrow && filteredOptions.length > 0) {
      setSelectedIndex((prev) => (prev === 0 ? filteredOptions.length - 1 : prev - 1))
      return
    }

    if (key.downArrow && filteredOptions.length > 0) {
      setSelectedIndex((prev) => (prev === filteredOptions.length - 1 ? 0 : prev + 1))
      return
    }

    if (searchable) {
      if (key.backspace || key.delete) {
        setSearchQuery((prev) => prev.slice(0, -1))
        return
      }
      // Printable character — append to search
      if (input && !key.ctrl && !key.meta) {
        setSearchQuery((prev) => prev + input)
        setSelectedIndex(0)
        return
      }
    } else {
      // Non-searchable: keep j/k and numeric shortcuts
      if (input.toLowerCase() === "k") {
        setSelectedIndex((prev) => (prev === 0 ? options.length - 1 : prev - 1))
        return
      }
      if (input.toLowerCase() === "j") {
        setSelectedIndex((prev) => (prev === options.length - 1 ? 0 : prev + 1))
        return
      }
      const numericInput = Number.parseInt(input, 10)
      if (!Number.isNaN(numericInput) && numericInput >= 1 && numericInput <= options.length) {
        setSelectedIndex(numericInput - 1)
      }
    }
  })

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text>{label}</Text>
      </Box>

      {searchable && (
        <Box marginBottom={1} marginLeft={1}>
          <Text color={COLORS.MUTED}>Search: </Text>
          <Text color={COLORS.PRIMARY}>{searchQuery}</Text>
          <Text color={COLORS.MUTED} dimColor>
            {searchQuery ? "" : "type to filter..."}
          </Text>
        </Box>
      )}

      {hasMoreAbove && (
        <Box marginLeft={1}>
          <Text color={COLORS.MUTED} dimColor>
            ↑ {start} more above
          </Text>
        </Box>
      )}

      {filteredOptions.length === 0 ? (
        <Box marginLeft={1}>
          <Text color={COLORS.MUTED} italic>
            No matching options
          </Text>
        </Box>
      ) : (
        visibleOptions.map((option, visibleIndex) => {
          const actualIndex = start + visibleIndex
          const isSelected = actualIndex === selectedIndex
          const marker = isSelected ? "> " : "  "
          const textColor = option.disabled
            ? COLORS.MUTED
            : option.color || (isSelected ? COLORS.PRIMARY : undefined)

          return (
            <Box key={option.value as React.Key} marginLeft={1}>
              <Text
                {...(textColor ? { color: textColor } : {})}
                {...(option.disabled ? { dimColor: true } : {})}
              >
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
        })
      )}

      {hasMoreBelow && (
        <Box marginLeft={1}>
          <Text color={COLORS.MUTED} dimColor>
            ↓ {filteredOptions.length - end} more below
          </Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color={COLORS.MUTED} dimColor>
          {searchable
            ? "Use ↑↓ arrows to navigate, Enter to select, Esc to clear search/cancel"
            : "Use ↑↓ arrows to navigate, Enter to select, Esc to cancel"}
        </Text>
      </Box>
    </Box>
  )
}

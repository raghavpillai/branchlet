import { Box, Text } from "ink"
import { useEffect, useState } from "react"
import { COLORS } from "../../constants/index.js"
import type { StatusIndicatorProps } from "../../types/index.js"

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]

export function StatusIndicator({ status, message, spinner = true }: StatusIndicatorProps) {
  const [frameIndex, setFrameIndex] = useState(0)

  useEffect(() => {
    if (status !== "loading" || !spinner) return

    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % SPINNER_FRAMES.length)
    }, 100)

    return () => clearInterval(interval)
  }, [status, spinner])

  const getStatusIcon = (): string => {
    switch (status) {
      case "loading":
        return spinner ? (SPINNER_FRAMES[frameIndex] ?? "[LOADING]") : "[LOADING]"
      case "success":
        return "[SUCCESS]"
      case "error":
        return "[ERROR]"
      case "info":
        return "[INFO]"
      default:
        return ""
    }
  }

  const getStatusColor = (): string => {
    switch (status) {
      case "success":
        return COLORS.SUCCESS
      case "error":
        return COLORS.ERROR
      case "info":
        return COLORS.INFO
      case "loading":
        return COLORS.PRIMARY
      default:
        return ""
    }
  }

  return (
    <Box>
      <Text color={getStatusColor()}>
        {getStatusIcon()} {message}
      </Text>
    </Box>
  )
}

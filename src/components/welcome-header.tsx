import { Box, Text } from "ink"
import { COLORS } from "../constants/index.js"
import type { AppMode } from "../types/index.js"

interface WelcomeHeaderProps {
  mode: AppMode
}

export function WelcomeHeader({ mode }: WelcomeHeaderProps): JSX.Element {
  const cwd = process.cwd()
  const formatPath = (path: string): string => {
    const home = process.env.HOME || ""
    return path.replace(home, "~")
  }

  const getHeaderText = (): JSX.Element => {
    if (mode === "menu") {
      return (
        <Text>
          🌳 Welcome to{" "}
          <Text bold color={COLORS.PRIMARY}>
            Brancher
          </Text>
          !
        </Text>
      )
    }

    const modeLabels = {
      create: "Create",
      list: "List",
      delete: "Delete",
      settings: "Settings",
    }

    return (
      <Text>
        🌳 Brancher -{" "}
        <Text bold color={COLORS.PRIMARY}>
          {modeLabels[mode] || mode}
        </Text>
      </Text>
    )
  }

  return (
    <Box borderStyle="round" paddingX={1} paddingY={0} marginBottom={1}>
      <Box flexDirection="column">
        {getHeaderText()}
        <Text color={COLORS.MUTED}>cwd: {formatPath(cwd)}</Text>
      </Box>
    </Box>
  )
}
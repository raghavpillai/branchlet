import { Box, Text } from "ink"
import Spinner from "ink-spinner"
import { COLORS } from "../../constants/index.js"

interface CommandProgressProps {
  command: string
  currentIndex: number
  totalCommands: number
}

export function CommandProgress({
  command,
  currentIndex,
  totalCommands,
}: CommandProgressProps): JSX.Element {
  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color={COLORS.INFO}>
          Running post-create commands ({currentIndex}/{totalCommands})
        </Text>
      </Box>

      <Box>
        <Spinner type="dots" />
        <Text>
          {" "}
          Executing: <Text color={COLORS.SUCCESS}>{command}</Text>
        </Text>
      </Box>
    </Box>
  )
}

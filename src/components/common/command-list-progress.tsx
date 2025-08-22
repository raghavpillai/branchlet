import { Box, Text } from "ink"
import Spinner from "ink-spinner"
import { COLORS } from "../../constants/index.js"

interface CommandStatus {
  command: string
  status: "pending" | "running" | "completed" | "failed"
}

interface CommandListProgressProps {
  commands: string[]
  currentIndex: number
  completedCommands?: string[]
  failedCommands?: string[]
}

export function CommandListProgress({ 
  commands, 
  currentIndex, 
  completedCommands = [], 
  failedCommands = [] 
}: CommandListProgressProps) {
  const getCommandStatus = (index: number): CommandStatus["status"] => {
    const command = commands[index]
    if (!command) return "pending"
    if (failedCommands.includes(command)) return "failed"
    if (completedCommands.includes(command)) return "completed"
    if (index < currentIndex) return "completed"
    if (index === currentIndex) return "running"
    return "pending"
  }

  const getStatusIcon = (status: CommandStatus["status"]) => {
    switch (status) {
      case "running":
        return <Spinner type="dots" />
      case "completed":
        return <Text color={COLORS.SUCCESS}>✓</Text>
      case "failed":
        return <Text color={COLORS.ERROR}>✗</Text>
      case "pending":
        return <Text color={COLORS.MUTED}>○</Text>
    }
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color={COLORS.INFO}>
          Running post-create commands ({currentIndex}/{commands.length})
        </Text>
      </Box>

      {commands.map((command, index) => {
        const status = getCommandStatus(index)
        
        return (
          <Box key={index} marginBottom={0}>
            {getStatusIcon(status)}
            <Text> {command || ""}</Text>
          </Box>
        )
      })}
    </Box>
  )
}
import { Box } from "ink"
import { MESSAGES } from "../constants/index.js"
import type { AppMode } from "../types/index.js"
import { StatusIndicator } from "./common/index.js"
import { WelcomeHeader } from "./welcome-header.js"

interface LoadingStateProps {
  mode: AppMode
  gitRoot?: string | undefined
}

export function LoadingState({ mode, gitRoot }: LoadingStateProps) {
  return (
    <Box flexDirection="column">
      <WelcomeHeader mode={mode} gitRoot={gitRoot} />
      <StatusIndicator status="loading" message={MESSAGES.LOADING_GIT_INFO} />
    </Box>
  )
}

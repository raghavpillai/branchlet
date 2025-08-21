import { Box } from "ink"
import { MESSAGES } from "../constants/index.js"
import type { AppMode } from "../types/index.js"
import { StatusIndicator } from "./common/index.js"
import { WelcomeHeader } from "./welcome-header.js"

interface LoadingStateProps {
  mode: AppMode
}

export function LoadingState({ mode }: LoadingStateProps): JSX.Element {
  return (
    <Box flexDirection="column">
      <WelcomeHeader mode={mode} />
      <StatusIndicator status="loading" message={MESSAGES.LOADING_GIT_INFO} />
    </Box>
  )
}
import { Box, Text } from "ink"
import { COLORS } from "../constants/index.js"
import type { UpdateCheckResult } from "../services/update-service.js"

interface UpdateBannerProps {
  updateStatus: UpdateCheckResult | null
}

export function UpdateBanner({ updateStatus }: UpdateBannerProps) {
  if (!updateStatus || !updateStatus.hasUpdate || !updateStatus.latestVersion) {
    return null
  }

  return (
    <Box borderStyle="round" paddingX={1} paddingY={0} borderColor={COLORS.WARNING} marginBottom={1}>
      <Box flexDirection="column">
        <Text>
          <Text color={COLORS.WARNING}>⚠ Update Available:</Text>
          {" "}
          <Text color={COLORS.MUTED}>v{updateStatus.currentVersion}</Text>
          {" → "}
          <Text bold color={COLORS.SUCCESS}>
            v{updateStatus.latestVersion}
          </Text>
        </Text>
        <Text color={COLORS.MUTED}>
          Run: <Text bold color={COLORS.PRIMARY}>npm install -g branchlet</Text> to update
        </Text>
      </Box>
    </Box>
  )
}

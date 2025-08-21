import { Box, Text, useInput } from "ink"
import { useCallback, useEffect, useState } from "react"
import { StatusIndicator } from "../../components/common/index.js"
import { COLORS, MESSAGES } from "../../constants/index.js"
import type { WorktreeService } from "../../services/index.js"
import type { GitWorktree } from "../../types/index.js"

interface ListWorktreesProps {
  worktreeService: WorktreeService
  onBack: () => void
}

export function ListWorktrees({ worktreeService, onBack }: ListWorktreesProps) {
  const [worktrees, setWorktrees] = useState<GitWorktree[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()

  const loadWorktrees = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      setError(undefined)
      const gitService = worktreeService.getGitService()
      const repoInfo = await gitService.getRepositoryInfo()
      const additionalWorktrees = repoInfo.worktrees.filter((wt) => !wt.isMain)
      setWorktrees(additionalWorktrees)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [worktreeService])

  useEffect(() => {
    loadWorktrees()
  }, [loadWorktrees])

  useInput((input, key) => {
    if (key.escape || key.return || input) {
      onBack()
    }
  })

  if (loading) {
    return <StatusIndicator status="loading" message={MESSAGES.LOADING_WORKTREES} />
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color={COLORS.ERROR}>
          {MESSAGES.GIT_ERROR_LIST}: {error}
        </Text>
        <Box marginTop={1}>
          <Text color={COLORS.MUTED}>Press any key to go back...</Text>
        </Box>
      </Box>
    )
  }

  if (worktrees.length === 0) {
    return (
      <Box flexDirection="column">
        <Text color={COLORS.INFO}>{MESSAGES.LIST_NO_WORKTREES}</Text>
        <Box marginTop={1}>
          <Text color={COLORS.MUTED}>Press any key to go back...</Text>
        </Box>
      </Box>
    )
  }

  const formatPath = (path: string): string => {
    const home = process.env.HOME || ""
    return path.replace(home, "~")
  }

  const _getStatusIndicator = (worktree: GitWorktree): string => {
    let indicator = ""
    if (worktree.isMain) {
      indicator += MESSAGES.LIST_MAIN_INDICATOR
    }
    if (!worktree.isClean) {
      indicator += worktree.isMain ? " " : ""
      indicator += MESSAGES.LIST_DIRTY_INDICATOR
    }
    return indicator
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color={COLORS.PRIMARY}>
          {MESSAGES.LIST_TITLE}
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text bold color={COLORS.MUTED}>
          PATH BRANCH
        </Text>
      </Box>

      {worktrees.map((worktree) => {
        const path = formatPath(worktree.path)

        return (
          <Box key={worktree.path}>
            <Text {...(worktree.isMain ? { color: COLORS.PRIMARY } : {})}>{path.padEnd(43)}</Text>
            <Text color={COLORS.SUCCESS}>{worktree.branch}</Text>
          </Box>
        )
      })}

      <Box marginTop={2}>
        <Text color={COLORS.MUTED} dimColor>
          Press any key to go back
        </Text>
      </Box>
    </Box>
  )
}

import { Box, Text, useInput } from "ink"
import { useCallback, useEffect, useState } from "react"
import { ConfirmDialog, SelectPrompt, StatusIndicator } from "../../components/common/index.js"
import { COLORS, MESSAGES } from "../../constants/index.js"
import type { WorktreeService } from "../../services/index.js"
import type { DeleteWorktreeState, GitWorktree, SelectOption } from "../../types/index.js"

interface DeleteWorktreeProps {
  worktreeService: WorktreeService
  onComplete: () => void
  onCancel: () => void
}

export function DeleteWorktree({ worktreeService, onComplete, onCancel }: DeleteWorktreeProps) {
  const [state, setState] = useState<DeleteWorktreeState>({
    step: "select",
    force: false,
  })
  const [worktrees, setWorktrees] = useState<GitWorktree[]>([])
  const [loading, setLoading] = useState(true)

  const loadWorktrees = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const gitService = worktreeService.getGitService()
      const repoInfo = await gitService.getRepositoryInfo()

      const deletableWorktrees = repoInfo.worktrees.filter((wt) => !wt.isMain)
      setWorktrees(deletableWorktrees)
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: `Failed to load worktrees: ${error}`,
      }))
    } finally {
      setLoading(false)
    }
  }, [worktreeService])

  useEffect(() => {
    loadWorktrees()
  }, [loadWorktrees])

  useInput((input, key) => {
    if (state.error || worktrees.length === 0) {
      if (key.escape || key.return || input) {
        onCancel()
      }
    }
  })

  const handleWorktreeSelect = (path: string): void => {
    setState((prev) => ({
      ...prev,
      selectedWorktree: path,
      step: "confirm",
    }))
  }

  const handleConfirm = async (): Promise<void> => {
    if (!state.selectedWorktree) return

    try {
      setState((prev) => ({ ...prev, step: "deleting" }))

      await worktreeService.deleteWorktree(state.selectedWorktree, state.force)

      setState((prev) => ({ ...prev, step: "success" }))

      setTimeout(() => {
        onComplete()
      }, 1500)
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : String(error),
        step: "select",
      }))
    }
  }

  const getWorktreeOptions = (): SelectOption<string>[] => {
    return worktrees.map((worktree) => {
      const formatPath = (path: string): string => {
        const home = process.env.HOME || ""
        return path.replace(home, "~")
      }

      const statusInfo = worktree.isClean ? "" : " (has changes)"

      return {
        label: `${formatPath(worktree.path)} [${worktree.branch}]`,
        value: worktree.path,
        description: statusInfo,
      }
    })
  }

  const getSelectedWorktree = (): GitWorktree | undefined => {
    return worktrees.find((wt) => wt.path === state.selectedWorktree)
  }

  if (loading) {
    return <StatusIndicator status="loading" message={MESSAGES.LOADING_WORKTREES} />
  }

  if (state.error) {
    return (
      <Box flexDirection="column">
        <Text color={COLORS.ERROR}>{state.error}</Text>
        <Box marginTop={1}>
          <Text color={COLORS.MUTED}>Press any key to try again...</Text>
        </Box>
      </Box>
    )
  }

  if (worktrees.length === 0) {
    return (
      <Box flexDirection="column">
        <Text color={COLORS.INFO}>No additional worktrees to delete.</Text>
        <Box marginTop={1}>
          <Text color={COLORS.MUTED}>Press any key to go back...</Text>
        </Box>
      </Box>
    )
  }

  switch (state.step) {
    case "select":
      return (
        <SelectPrompt
          label={MESSAGES.DELETE_SELECT_PROMPT}
          options={getWorktreeOptions()}
          onSelect={handleWorktreeSelect}
          onCancel={onCancel}
        />
      )

    case "confirm": {
      const selectedWorktree = getSelectedWorktree()
      const hasChanges = selectedWorktree && !selectedWorktree.isClean
      const warningMessage = hasChanges
        ? `${MESSAGES.DELETE_WARNING} This worktree has uncommitted changes.`
        : MESSAGES.DELETE_WARNING

      return (
        <ConfirmDialog
          title={MESSAGES.DELETE_CONFIRM_TITLE}
          message={
            <Box flexDirection="column">
              <Text>
                Delete worktree at <Text bold>'{state.selectedWorktree}'</Text>?
              </Text>
              <Text>{warningMessage}</Text>
            </Box>
          }
          variant={hasChanges ? "danger" : "warning"}
          onConfirm={handleConfirm}
          onCancel={() => setState((prev) => ({ ...prev, step: "select" }))}
        />
      )
    }

    case "deleting":
      return <StatusIndicator status="loading" message={MESSAGES.DELETE_DELETING} />

    case "success":
      return <StatusIndicator status="success" message={MESSAGES.DELETE_SUCCESS} spinner={false} />

    default:
      return <Text>Unknown step</Text>
  }
}

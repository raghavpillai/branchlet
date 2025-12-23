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
  const config = worktreeService.getConfigService().getConfig()

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

  const handleConfirm = async (force = false): Promise<void> => {
    if (!state.selectedWorktree) return

    try {
      setState((prev) => ({ ...prev, step: "deleting" }))

      const result = await worktreeService.deleteWorktree(state.selectedWorktree, force)

      setState((prev) => ({ ...prev, step: "success", deleteResult: result }))

      setTimeout(() => {
        onComplete()
      }, 2500)
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

      const statusParts: string[] = []

      if (!worktree.isClean) {
        statusParts.push("has changes")
      }

      if (worktree.branchStatus) {
        const { ahead, behind, upstreamBranch } = worktree.branchStatus
        if (ahead > 0 || behind > 0) {
          const parts = []
          if (ahead > 0) parts.push(`+${ahead}`)
          if (behind > 0) parts.push(`-${behind}`)
          statusParts.push(`${parts.join(" ")} vs ${upstreamBranch}`)
        }
      }

      const statusInfo = statusParts.join(", ")

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
      const branchName = selectedWorktree?.branch
      const willDeleteBranch =
        config.deleteBranchWithWorktree && branchName && branchName !== "detached"

      const confirmLabel = hasChanges ? "Force Delete" : "Yes"
      const title = hasChanges ? "Force Delete Worktree" : MESSAGES.DELETE_CONFIRM_TITLE

      return (
        <ConfirmDialog
          title={title}
          message={
            <Box flexDirection="column">
              <Text>
                {hasChanges ? "Worktree at" : "Delete worktree at"}{" "}
                <Text bold>'{state.selectedWorktree}'</Text>
                {hasChanges ? " has uncommitted changes." : "?"}
              </Text>
              {willDeleteBranch && (
                <Box flexDirection="column">
                  <Text color={COLORS.WARNING}>
                    This will also {hasChanges ? "force " : ""}delete branch{" "}
                    <Text bold>'{branchName}'</Text>!
                  </Text>
                  {selectedWorktree?.branchStatus && (
                    <Box marginLeft={2}>
                      <Text color={COLORS.MUTED}>
                        {selectedWorktree.branchStatus.ahead > 0 &&
                          `ahead ${selectedWorktree.branchStatus.ahead}`}
                        {selectedWorktree.branchStatus.ahead > 0 &&
                          selectedWorktree.branchStatus.behind > 0 &&
                          "/"}
                        {selectedWorktree.branchStatus.behind > 0 &&
                          `behind ${selectedWorktree.branchStatus.behind}`}
                        {selectedWorktree.branchStatus.ahead === 0 &&
                          selectedWorktree.branchStatus.behind === 0 &&
                          "up to date"}
                        {" vs "}
                        {selectedWorktree.branchStatus.upstreamBranch}
                      </Text>
                    </Box>
                  )}
                </Box>
              )}
              {hasChanges && (
                <Text color={COLORS.WARNING}>
                  Force delete will permanently lose all uncommitted work!
                </Text>
              )}
              {hasChanges && <Text>Are you sure you want to proceed?</Text>}
              {!hasChanges && <Text>{MESSAGES.DELETE_WARNING}</Text>}
            </Box>
          }
          variant={hasChanges || willDeleteBranch ? "danger" : "warning"}
          confirmLabel={confirmLabel}
          onConfirm={() => handleConfirm(hasChanges)}
          onCancel={() => setState((prev) => ({ ...prev, step: "select" }))}
        />
      )
    }

    case "deleting": {
      const selectedWorktree = getSelectedWorktree()
      const branchName = selectedWorktree?.branch || ""
      const message = `${MESSAGES.DELETE_DELETING} (${branchName})`
      return <StatusIndicator status="loading" message={message} />
    }

    case "success": {
      const result = state.deleteResult
      let message: string = MESSAGES.DELETE_SUCCESS

      if (result?.branchDeleted && result.branchName) {
        message = `Worktree and branch '${result.branchName}' deleted successfully`
      } else if (result?.branchName && config.deleteBranchWithWorktree) {
        message = `Worktree deleted. Branch '${result.branchName}' was kept.`
      }

      return <StatusIndicator status="success" message={message} spinner={false} />
    }

    default:
      return <Text>Unknown step</Text>
  }
}

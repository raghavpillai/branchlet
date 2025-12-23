import { Box, Text, useInput } from "ink"
import { useCallback, useEffect, useState } from "react"
import { SelectPrompt, StatusIndicator } from "../../components/common/index.js"
import { COLORS, MESSAGES } from "../../constants/index.js"
import { openTerminal } from "../../services/file-service.js"
import type { WorktreeService } from "../../services/index.js"
import type { GitWorktree, SelectOption } from "../../types/index.js"

interface ListWorktreesProps {
  worktreeService: WorktreeService
  onBack: () => void
  isFromWrapper?: boolean
  onPathSelect?: (path: string) => void
}

type NavigationMode = "list" | "action-menu"

export function ListWorktrees({
  worktreeService,
  onBack,
  isFromWrapper = false,
  onPathSelect,
}: ListWorktreesProps) {
  const [worktrees, setWorktrees] = useState<GitWorktree[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [navigationMode, setNavigationMode] = useState<NavigationMode>("list")
  const [selectedWorktree, setSelectedWorktree] = useState<GitWorktree | null>(null)

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

  const formatPath = (path: string): string => {
    const home = process.env.HOME || ""
    return path.replace(home, "~")
  }

  const handleOpenWithCommand = useCallback(
    async (worktree: GitWorktree) => {
      try {
        const config = worktreeService.getConfigService().getConfig()
        if (config.terminalCommand) {
          await openTerminal(config.terminalCommand, worktree.path)
        }
        onBack()
      } catch (error) {
        console.error("Failed to open with command:", error)
      }
    },
    [worktreeService, onBack]
  )

  const handleActionSelect = useCallback(
    (action: string) => {
      if (!selectedWorktree) return

      switch (action) {
        case "cd":
          if (isFromWrapper && onPathSelect) {
            onPathSelect(selectedWorktree.path)
          }
          break
        case "command":
          handleOpenWithCommand(selectedWorktree)
          break
      }
    },
    [selectedWorktree, isFromWrapper, onPathSelect, handleOpenWithCommand]
  )

  useInput((input, key) => {
    if (navigationMode === "action-menu") return

    if (key.escape) {
      onBack()
      return
    }

    if (worktrees.length === 0) {
      onBack()
      return
    }

    if (key.upArrow) {
      setSelectedIndex((prev) => (prev === 0 ? worktrees.length - 1 : prev - 1))
      return
    }

    if (key.downArrow) {
      setSelectedIndex((prev) => (prev === worktrees.length - 1 ? 0 : prev + 1))
      return
    }

    if (key.return) {
      const worktree = worktrees[selectedIndex]
      if (worktree) {
        setSelectedWorktree(worktree)
        setNavigationMode("action-menu")
      }
      return
    }

    if (input.toLowerCase() === "e") {
      const worktree = worktrees[selectedIndex]
      if (worktree) {
        handleOpenWithCommand(worktree)
      }
      return
    }

    const numericInput = Number.parseInt(input, 10)
    if (!Number.isNaN(numericInput) && numericInput >= 1 && numericInput <= worktrees.length) {
      setSelectedIndex(numericInput - 1)
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

  if (navigationMode === "action-menu" && selectedWorktree) {
    const config = worktreeService.getConfigService().getConfig()
    const actions: SelectOption[] = []

    if (isFromWrapper) {
      actions.push({
        label: "Navigate to Directory",
        value: "cd",
        disabled: false,
      })
    } else {
      actions.push({
        label: "Navigate to Directory",
        value: "cd",
        description: "requires shell integration",
        disabled: true,
      })
    }

    if (config.terminalCommand) {
      actions.push({
        label: "Open with Command",
        value: "command",
        description: "Open using configured terminal command",
      })
    }

    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text>
            Selected: <Text color={COLORS.PRIMARY}>{formatPath(selectedWorktree.path)}</Text>{" "}
            <Text color={COLORS.SUCCESS}>({selectedWorktree.branch})</Text>
          </Text>
        </Box>
        <SelectPrompt
          label="Choose action:"
          options={actions}
          onSelect={handleActionSelect}
          onCancel={() => setNavigationMode("list")}
        />
      </Box>
    )
  }

  return (
    <Box flexDirection="column" width="100%">
      <Box justifyContent="space-between" width="100%">
        <Text bold color={COLORS.MUTED}>
          PATH
        </Text>
        <Text bold color={COLORS.MUTED}>
          BRANCH
        </Text>
      </Box>

      {worktrees.map((worktree, index) => {
        const path = formatPath(worktree.path)
        const isSelected = index === selectedIndex
        const marker = isSelected ? "> " : "  "

        return (
          <Box key={worktree.path} justifyContent="space-between" width="100%">
            <Text
              {...(isSelected
                ? { color: COLORS.PRIMARY }
                : worktree.isMain
                  ? { color: COLORS.PRIMARY }
                  : {})}
            >
              {marker}
              {path}
            </Text>
            <Text color={COLORS.SUCCESS}>{worktree.branch}</Text>
          </Box>
        )
      })}

      <Box marginTop={2}>
        <Text color={COLORS.MUTED} dimColor>
          ↑↓ Navigate • Enter Action Menu • E Command • Esc Back
        </Text>
      </Box>
    </Box>
  )
}

import { Box, Text, useInput } from "ink"
import { useCallback, useEffect, useState } from "react"
import {
  CommandListProgress,
  CommandProgress,
  ConfirmDialog,
  InputPrompt,
  SelectPrompt,
  StatusIndicator,
} from "../../components/common/index.js"
import { COLORS, MESSAGES } from "../../constants/index.js"
import { copyFiles, executePostCreateCommands, openTerminal } from "../../services/file-service.js"
import type { WorktreeService } from "../../services/index.js"
import type { CreateWorktreeState, GitBranch, SelectOption } from "../../types/index.js"
import {
  getRepositoryRoot,
  getWorktreePath,
  validateBranchName,
  validateDirectoryName,
} from "../../utils/index.js"

interface CreateWorktreeProps {
  worktreeService: WorktreeService
  onComplete: () => void
  onCancel: () => void
}

export function CreateWorktree({ worktreeService, onComplete, onCancel }: CreateWorktreeProps) {
  const [state, setState] = useState<CreateWorktreeState>({
    step: "directory",
    directoryName: "",
    sourceBranch: "",
    newBranch: "",
  })
  const [branches, setBranches] = useState<GitBranch[]>([])
  const [loading, setLoading] = useState(false)

  const loadBranches = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const gitService = worktreeService.getGitService()
      const repoInfo = await gitService.getRepositoryInfo()
      setBranches(repoInfo.branches)
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: `Failed to load branches: ${error}`,
      }))
    } finally {
      setLoading(false)
    }
  }, [worktreeService])

  useEffect(() => {
    loadBranches()
  }, [loadBranches])

  useInput((input, key) => {
    if (state.error) {
      if (key.escape || key.return || input) {
        setState((prev) => {
          const { error: _error, ...rest } = prev
          return rest
        })
      }
    }
  })

  const handleDirectorySubmit = (directoryName: string): void => {
    setState((prev) => ({
      ...prev,
      directoryName: directoryName.trim(),
      step: "source-branch",
    }))
  }

  const handleSourceBranchSelect = (sourceBranch: string): void => {
    setState((prev) => ({
      ...prev,
      sourceBranch,
      newBranch: "",
      step: "new-branch",
    }))
  }

  const handleNewBranchSubmit = (newBranch: string): void => {
    setState((prev) => ({
      ...prev,
      newBranch: newBranch.trim(),
      step: "confirm",
    }))
  }

  const validateNewBranchName = (name: string): string | undefined => {
    const formatError = validateBranchName(name)
    if (formatError) {
      return formatError
    }

    const existingBranch = branches.find((branch) => branch.name === name)
    if (existingBranch) {
      return "Branch already exists"
    }

    return undefined
  }

  const handleConfirm = async (): Promise<void> => {
    try {
      setState((prev) => ({ ...prev, step: "creating" }))

      const config = worktreeService.getConfigService().getConfig()
      const gitRoot = getRepositoryRoot()
      const worktreePath = getWorktreePath(
        gitRoot,
        state.directoryName,
        config.worktreePathTemplate
      )
      const parentDir = worktreePath.replace(`/${state.directoryName}`, "")

      const gitService = worktreeService.getGitService()
      await gitService.createWorktree({
        name: state.directoryName,
        sourceBranch: state.sourceBranch,
        newBranch: state.newBranch,
        basePath: parentDir,
      })

      if (config.worktreeCopyPatterns.length > 0) {
        await copyFiles(gitRoot, worktreePath, config)
      }

      if (config.postCreateCmd.length > 0) {
        setState((prev) => ({
          ...prev,
          step: "running-commands",
          commandProgress: { current: 0, total: config.postCreateCmd.length },
          postCreateCommands: config.postCreateCmd,
          currentCommandIndex: 0,
        }))

        const variables = {
          BASE_PATH: gitRoot.split("/").pop() || "",
          WORKTREE_PATH: worktreePath,
          BRANCH_NAME: state.newBranch,
          SOURCE_BRANCH: state.sourceBranch,
        }

        await executePostCreateCommands(
          config.postCreateCmd,
          variables,
          (command, current, total) => {
            setState((prev) => ({
              ...prev,
              currentCommand: command,
              commandProgress: { current, total },
              currentCommandIndex: current - 1,
            }))
          }
        )
      }

      if (config.terminalCommand) {
        await openTerminal(config.terminalCommand, worktreePath)
      }

      setState((prev) => ({ ...prev, step: "success" }))

      setTimeout(() => {
        onComplete()
      }, 2000)
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : String(error),
        step: "directory",
      }))
    }
  }

  const getBranchOptions = (): SelectOption<string>[] => {
    const options: SelectOption<string>[] = []

    for (const branch of branches) {
      const option: SelectOption<string> = {
        label: branch.name,
        value: branch.name,
        isDefault: branch.isCurrent,
      }

      if (branch.isCurrent) {
        option.description = "current"
      } else if (branch.isDefault) {
        option.description = "default"
      }

      options.push(option)
    }

    return options
  }

  if (loading) {
    return <StatusIndicator status="loading" message={MESSAGES.LOADING_BRANCHES} />
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

  switch (state.step) {
    case "directory":
      return (
        <InputPrompt
          label={MESSAGES.CREATE_DIRECTORY_PROMPT}
          placeholder={MESSAGES.CREATE_DIRECTORY_PLACEHOLDER}
          validate={validateDirectoryName}
          onSubmit={handleDirectorySubmit}
          onCancel={onCancel}
        />
      )

    case "source-branch":
      return (
        <SelectPrompt
          label={MESSAGES.CREATE_SOURCE_BRANCH_PROMPT}
          options={getBranchOptions()}
          onSelect={handleSourceBranchSelect}
          onCancel={onCancel}
        />
      )

    case "new-branch":
      return (
        <InputPrompt
          label={MESSAGES.CREATE_NEW_BRANCH_PROMPT}
          placeholder={MESSAGES.CREATE_NEW_BRANCH_PLACEHOLDER}
          validate={validateNewBranchName}
          onSubmit={handleNewBranchSubmit}
          onCancel={onCancel}
        />
      )

    case "confirm":
      return (
        <ConfirmDialog
          title={MESSAGES.CREATE_CONFIRM_TITLE}
          message={`Create worktree '${state.directoryName}' with branch '${state.newBranch}' from '${state.sourceBranch}'?`}
          onConfirm={handleConfirm}
          onCancel={onCancel}
        />
      )

    case "creating":
      return <StatusIndicator status="loading" message={MESSAGES.CREATE_CREATING} />

    case "running-commands":
      return (
        <CommandListProgress
          commands={state.postCreateCommands || []}
          currentIndex={state.currentCommandIndex || 0}
        />
      )

    case "success":
      return <StatusIndicator status="success" message={MESSAGES.CREATE_SUCCESS} spinner={false} />

    default:
      return <Text>Unknown step</Text>
  }
}

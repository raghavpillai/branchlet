import { Box, Text, useInput } from "ink"
import { useCallback, useEffect, useState } from "react"
import {
  CommandListProgress,
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
  const [repoPath, setRepoPath] = useState<string>("")

  const loadBranches = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const gitService = worktreeService.getGitService()
      const allBranches = await gitService.listBranches()
      setBranches(allBranches)
      setRepoPath(gitService.getGitRoot())
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
    if (sourceBranch === "__CUSTOM_REF__") {
      setState((prev) => ({
        ...prev,
        step: "custom-ref",
      }))
      return
    }
    setState((prev) => ({
      ...prev,
      sourceBranch,
      newBranch: "",
      step: "new-branch",
    }))
  }

  const handleCustomRefSubmit = (ref: string): void => {
    setState((prev) => ({
      ...prev,
      sourceBranch: ref.trim(),
      newBranch: "",
      step: "new-branch",
    }))
  }

  const handleNewBranchSubmit = (newBranch: string): void => {
    const trimmedBranch = newBranch.trim()
    if (trimmedBranch) {
      setState((prev) => ({
        ...prev,
        newBranch: trimmedBranch,
        step: "confirm",
      }))
    } else {
      // No new branch name — use source branch directly.
      // For remote branches, derive a local name by stripping the remote prefix.
      setState((prev) => {
        const sourceBranch = prev.sourceBranch
        const remoteEntry = branches.find((b) => b.name === sourceBranch && b.isRemote)
        const derivedName = remoteEntry
          ? sourceBranch.replace(/^[^/]+\//, "")
          : sourceBranch
        return {
          ...prev,
          newBranch: derivedName,
          step: "confirm",
        }
      })
    }
  }

  const validateNewBranchName = (name: string): string | undefined => {
    if (!name.trim()) {
      return undefined
    }

    const formatError = validateBranchName(name)
    if (formatError) {
      return formatError
    }

    const existingBranch = branches.find((branch) => branch.name === name && !branch.isRemote)
    if (existingBranch) {
      return "Branch already exists"
    }

    return undefined
  }

  const handleConfirm = async (): Promise<void> => {
    try {
      setState((prev) => ({ ...prev, step: "creating" }))

      const config = worktreeService.getConfigService().getConfig()
      const gitRoot = repoPath || getRepositoryRoot()
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
      } else if (branch.isRemote) {
        option.description = "remote"
      }

      options.push(option)
    }

    options.push({
      label: "Enter custom ref (SHA, tag, etc.)",
      value: "__CUSTOM_REF__",
    })

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

    case "source-branch": {
      const branchOptions = getBranchOptions()
      const defaultIndex = branchOptions.findIndex((opt) => opt.isDefault)
      return (
        <SelectPrompt
          label={MESSAGES.CREATE_SOURCE_BRANCH_PROMPT}
          options={branchOptions}
          defaultIndex={defaultIndex >= 0 ? defaultIndex : 0}
          onSelect={handleSourceBranchSelect}
          onCancel={onCancel}
          searchable={true}
        />
      )
    }

    case "custom-ref":
      return (
        <InputPrompt
          label="Enter a branch name, tag, or commit SHA:"
          placeholder="origin/feature/foo, v1.0.0, abc123f"
          validate={(v) => (!v.trim() ? "Please enter a ref" : undefined)}
          onSubmit={handleCustomRefSubmit}
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

    case "confirm": {
      const isUsingExistingBranch = state.newBranch === state.sourceBranch
      const message = isUsingExistingBranch
        ? `Create worktree '${state.directoryName}' using existing branch '${state.sourceBranch}'?`
        : `Create worktree '${state.directoryName}' with new branch '${state.newBranch}' from '${state.sourceBranch}'?`

      return (
        <ConfirmDialog
          title={MESSAGES.CREATE_CONFIRM_TITLE}
          message={message}
          onConfirm={handleConfirm}
          onCancel={onCancel}
        />
      )
    }

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

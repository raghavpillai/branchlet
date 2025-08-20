import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { InputPrompt, SelectPrompt, ConfirmDialog, StatusIndicator } from './common/index.js';
import { WorktreeService } from '../services/index.js';
import { validateDirectoryName, validateBranchName, getWorktreePath, getRepositoryRoot } from '../utils/index.js';
import { MESSAGES, COLORS } from '../constants/index.js';
import type { CreateWorktreeState, GitBranch, SelectOption } from '../types/index.js';

interface CreateWorktreeProps {
  worktreeService: WorktreeService;
  onComplete: () => void;
  onCancel: () => void;
}

export function CreateWorktree({ 
  worktreeService, 
  onComplete, 
  onCancel 
}: CreateWorktreeProps): JSX.Element {
  const [state, setState] = useState<CreateWorktreeState>({
    step: 'directory',
    directoryName: '',
    sourceBranch: '',
    newBranch: '',
  });
  const [branches, setBranches] = useState<GitBranch[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async (): Promise<void> => {
    try {
      setLoading(true);
      const gitService = worktreeService.getGitService();
      const repoInfo = await gitService.getRepositoryInfo();
      setBranches(repoInfo.branches);
    } catch (error) {
      setState(prev => ({ ...prev, error: `Failed to load branches: ${error}` }));
    } finally {
      setLoading(false);
    }
  };

  const handleDirectorySubmit = (directoryName: string): void => {
    setState(prev => ({
      ...prev,
      directoryName: directoryName.trim(),
      step: 'source-branch'
    }));
  };

  const handleSourceBranchSelect = (sourceBranch: string): void => {
    const suggestedBranchName = `feature/${state.directoryName}`;
    setState(prev => ({
      ...prev,
      sourceBranch,
      newBranch: suggestedBranchName,
      step: 'new-branch'
    }));
  };

  const handleNewBranchSubmit = (newBranch: string): void => {
    setState(prev => ({
      ...prev,
      newBranch: newBranch.trim(),
      step: 'confirm'
    }));
  };

  const handleConfirm = async (): Promise<void> => {
    try {
      setState(prev => ({ ...prev, step: 'creating' }));
      
      const config = worktreeService.getConfigService().getConfig();
      const gitRoot = getRepositoryRoot();
      const worktreePath = getWorktreePath(
        gitRoot,
        state.directoryName,
        config.worktreePathTemplate
      );
      const parentDir = worktreePath.replace(`/${state.directoryName}`, '');

      await worktreeService.createWorktree({
        name: state.directoryName,
        sourceBranch: state.sourceBranch,
        newBranch: state.newBranch,
        basePath: parentDir
      });

      setState(prev => ({ ...prev, step: 'success' }));
      
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : String(error),
        step: 'directory'
      }));
    }
  };

  const getBranchOptions = (): SelectOption<string>[] => {
    const options: SelectOption<string>[] = [];
    
    for (const branch of branches) {
      options.push({
        label: branch.name,
        value: branch.name,
        description: branch.isCurrent 
          ? 'current' 
          : branch.isDefault 
          ? 'default' 
          : undefined,
        isDefault: branch.isCurrent
      });
    }

    return options;
  };

  if (loading) {
    return <StatusIndicator status="loading" message={MESSAGES.LOADING_BRANCHES} />;
  }

  if (state.error) {
    return (
      <Box flexDirection="column">
        <Text color={COLORS.ERROR}>{state.error}</Text>
        <Box marginTop={1}>
          <Text color={COLORS.MUTED}>Press any key to try again...</Text>
        </Box>
      </Box>
    );
  }

  switch (state.step) {
    case 'directory':
      return (
        <InputPrompt
          label={MESSAGES.CREATE_DIRECTORY_PROMPT}
          placeholder={MESSAGES.CREATE_DIRECTORY_PLACEHOLDER}
          validate={validateDirectoryName}
          onSubmit={handleDirectorySubmit}
          onCancel={onCancel}
        />
      );

    case 'source-branch':
      return (
        <SelectPrompt
          label={MESSAGES.CREATE_SOURCE_BRANCH_PROMPT}
          options={getBranchOptions()}
          onSelect={handleSourceBranchSelect}
          onCancel={onCancel}
        />
      );

    case 'new-branch':
      return (
        <InputPrompt
          label={MESSAGES.CREATE_NEW_BRANCH_PROMPT}
          placeholder={MESSAGES.CREATE_NEW_BRANCH_PLACEHOLDER}
          defaultValue={state.newBranch}
          validate={validateBranchName}
          onSubmit={handleNewBranchSubmit}
          onCancel={onCancel}
        />
      );

    case 'confirm':
      return (
        <ConfirmDialog
          title={MESSAGES.CREATE_CONFIRM_TITLE}
          message={`Create worktree '${state.directoryName}' with branch '${state.newBranch}' from '${state.sourceBranch}'?`}
          onConfirm={handleConfirm}
          onCancel={onCancel}
        />
      );

    case 'creating':
      return <StatusIndicator status="loading" message={MESSAGES.CREATE_CREATING} />;

    case 'success':
      return <StatusIndicator status="success" message={MESSAGES.CREATE_SUCCESS} spinner={false} />;

    default:
      return <Text>Unknown step</Text>;
  }
}
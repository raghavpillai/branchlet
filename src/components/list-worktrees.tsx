import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { StatusIndicator } from './common/index.js';
import { WorktreeService } from '../services/index.js';
import { MESSAGES, COLORS } from '../constants/index.js';
import type { GitWorktree } from '../types/index.js';

interface ListWorktreesProps {
  worktreeService: WorktreeService;
  onBack: () => void;
}

export function ListWorktrees({ 
  worktreeService, 
  onBack 
}: ListWorktreesProps): JSX.Element {
  const [worktrees, setWorktrees] = useState<GitWorktree[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    loadWorktrees();
  }, []);

  const loadWorktrees = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(undefined);
      const gitService = worktreeService.getGitService();
      const repoInfo = await gitService.getRepositoryInfo();
      setWorktrees(repoInfo.worktrees);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <StatusIndicator status="loading" message={MESSAGES.LOADING_WORKTREES} />;
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color={COLORS.ERROR}>{MESSAGES.GIT_ERROR_LIST}: {error}</Text>
        <Box marginTop={1}>
          <Text color={COLORS.MUTED}>Press any key to go back...</Text>
        </Box>
      </Box>
    );
  }

  if (worktrees.length === 0) {
    return (
      <Box flexDirection="column">
        <Text color={COLORS.INFO}>{MESSAGES.LIST_NO_WORKTREES}</Text>
        <Box marginTop={1}>
          <Text color={COLORS.MUTED}>Press any key to go back...</Text>
        </Box>
      </Box>
    );
  }

  const formatPath = (path: string): string => {
    const home = process.env.HOME || '';
    return path.replace(home, '~');
  };

  const getStatusIndicator = (worktree: GitWorktree): string => {
    let indicator = '';
    if (worktree.isMain) {
      indicator += MESSAGES.LIST_MAIN_INDICATOR;
    }
    if (!worktree.isClean) {
      indicator += worktree.isMain ? ' ' : '';
      indicator += MESSAGES.LIST_DIRTY_INDICATOR;
    }
    return indicator;
  };

  const longestPath = Math.max(...worktrees.map(wt => formatPath(wt.path).length));
  const longestBranch = Math.max(...worktrees.map(wt => wt.branch.length));

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color={COLORS.PRIMARY}>
          {MESSAGES.LIST_TITLE}
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text bold color={COLORS.MUTED}>
          {'PATH'.padEnd(longestPath + 2)} {'BRANCH'.padEnd(longestBranch + 2)} STATUS
        </Text>
      </Box>

      {worktrees.map((worktree, index) => {
        const path = formatPath(worktree.path);
        const statusIndicator = getStatusIndicator(worktree);
        
        return (
          <Box key={index}>
            <Text color={worktree.isMain ? COLORS.PRIMARY : undefined}>
              {path.padEnd(longestPath + 2)}
            </Text>
            <Text color={COLORS.SUCCESS}>
              {worktree.branch.padEnd(longestBranch + 2)}
            </Text>
            <Text color={worktree.isClean ? COLORS.SUCCESS : COLORS.WARNING}>
              {statusIndicator}
            </Text>
          </Box>
        );
      })}

      <Box marginTop={2}>
        <Text color={COLORS.MUTED} dimColor>
          Press any key to go back
        </Text>
      </Box>
    </Box>
  );
}
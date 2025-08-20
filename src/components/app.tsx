import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { SelectPrompt, StatusIndicator } from './common/index.js';
import { CreateWorktree } from './create-worktree.js';
import { ListWorktrees } from './list-worktrees.js';
import { DeleteWorktree } from './delete-worktree.js';
import { SettingsMenu } from './settings-menu.js';
import { WorktreeService } from '../services/index.js';
import { getUserFriendlyErrorMessage } from '../utils/index.js';
import { MESSAGES, COLORS } from '../constants/index.js';
import type { AppMode, SelectOption } from '../types/index.js';

interface AppProps {
  initialMode?: AppMode;
  onExit?: () => void;
}

export function App({ initialMode = 'menu', onExit }: AppProps): JSX.Element {
  const [mode, setMode] = useState<AppMode>(initialMode);
  const [worktreeService, setWorktreeService] = useState<WorktreeService | null>(null);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeService();
  }, []);

  const initializeService = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(undefined);
      
      const service = new WorktreeService();
      await service.initialize();
      
      setWorktreeService(service);
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err instanceof Error ? err : new Error(String(err))));
    } finally {
      setLoading(false);
    }
  };

  const handleExit = useCallback((): void => {
    onExit?.();
  }, [onExit]);

  const handleBackToMenu = useCallback((): void => {
    setMode('menu');
  }, []);

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      handleExit();
    }
    
    if (error && !loading) {
      setError(undefined);
      if (mode !== 'menu') {
        setMode('menu');
      }
    }
  });

  const getMenuOptions = (): SelectOption<AppMode | 'exit'>[] => [
    {
      label: MESSAGES.MENU_CREATE,
      value: 'create'
    },
    {
      label: MESSAGES.MENU_LIST,
      value: 'list'
    },
    {
      label: MESSAGES.MENU_DELETE,
      value: 'delete'
    },
    {
      label: MESSAGES.MENU_SETTINGS,
      value: 'settings'
    },
    {
      label: MESSAGES.MENU_EXIT,
      value: 'exit'
    }
  ];

  const handleMenuSelect = (value: AppMode | 'exit'): void => {
    if (value === 'exit') {
      handleExit();
    } else {
      setMode(value);
    }
  };

  if (loading) {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold color={COLORS.PRIMARY}>{MESSAGES.WELCOME}</Text>
        </Box>
        <StatusIndicator status="loading" message={MESSAGES.LOADING_GIT_INFO} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold color={COLORS.PRIMARY}>{MESSAGES.WELCOME}</Text>
        </Box>
        <Text color={COLORS.ERROR}>{error}</Text>
        <Box marginTop={1}>
          <Text color={COLORS.MUTED}>Press any key to retry or Ctrl+C to exit</Text>
        </Box>
      </Box>
    );
  }

  if (!worktreeService) {
    return (
      <Text color={COLORS.ERROR}>Failed to initialize worktree service</Text>
    );
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color={COLORS.PRIMARY}>{MESSAGES.WELCOME}</Text>
      </Box>

      {mode === 'menu' && (
        <SelectPrompt
          label={MESSAGES.MENU_TITLE}
          options={getMenuOptions()}
          onSelect={handleMenuSelect}
          onCancel={handleExit}
        />
      )}

      {mode === 'create' && (
        <CreateWorktree
          worktreeService={worktreeService}
          onComplete={handleBackToMenu}
          onCancel={handleBackToMenu}
        />
      )}

      {mode === 'list' && (
        <ListWorktrees
          worktreeService={worktreeService}
          onBack={handleBackToMenu}
        />
      )}

      {mode === 'delete' && (
        <DeleteWorktree
          worktreeService={worktreeService}
          onComplete={handleBackToMenu}
          onCancel={handleBackToMenu}
        />
      )}

      {mode === 'settings' && (
        <SettingsMenu
          worktreeService={worktreeService}
          onBack={handleBackToMenu}
        />
      )}
    </Box>
  );
}
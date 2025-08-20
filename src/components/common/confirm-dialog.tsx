import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { ConfirmDialogProps } from '../../types/index.js';
import { COLORS } from '../../constants/index.js';

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Yes',
  cancelLabel = 'No',
  onConfirm,
  onCancel,
  variant = 'default'
}: ConfirmDialogProps): JSX.Element {
  const [selectedOption, setSelectedOption] = useState<'confirm' | 'cancel'>('cancel');

  const variantColors = {
    default: COLORS.INFO,
    warning: COLORS.WARNING,
    danger: COLORS.ERROR
  };

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }

    if (key.return) {
      if (selectedOption === 'confirm') {
        onConfirm();
      } else {
        onCancel();
      }
      return;
    }

    if (key.leftArrow || key.rightArrow || key.tab) {
      setSelectedOption(prev => 
        prev === 'confirm' ? 'cancel' : 'confirm'
      );
      return;
    }

    if (input.toLowerCase() === 'y') {
      setSelectedOption('confirm');
    } else if (input.toLowerCase() === 'n') {
      setSelectedOption('cancel');
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={variantColors[variant]} padding={1}>
      <Box marginBottom={1}>
        <Text color={variantColors[variant]} bold>
          {title}
        </Text>
      </Box>

      <Box marginBottom={2}>
        <Text>{message}</Text>
      </Box>

      <Box justifyContent="center" columnGap={4}>
        <Box>
          <Text 
            color={selectedOption === 'confirm' ? COLORS.PRIMARY : undefined}
            inverse={selectedOption === 'confirm'}
          >
            {selectedOption === 'confirm' ? '> ' : '  '}
            {confirmLabel}
          </Text>
        </Box>

        <Box>
          <Text 
            color={selectedOption === 'cancel' ? COLORS.PRIMARY : undefined}
            inverse={selectedOption === 'cancel'}
          >
            {selectedOption === 'cancel' ? '> ' : '  '}
            {cancelLabel}
          </Text>
        </Box>
      </Box>

      <Box marginTop={1} justifyContent="center">
        <Text color={COLORS.MUTED} dimColor>
          Use ←→ or Tab to navigate, Enter to confirm, Esc to cancel
        </Text>
      </Box>
    </Box>
  );
}
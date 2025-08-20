import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { InputPromptProps } from '../../types/index.js';
import { COLORS } from '../../constants/index.js';

export function InputPrompt({
  label,
  placeholder = '',
  defaultValue = '',
  validate,
  onSubmit,
  onCancel
}: InputPromptProps): JSX.Element {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string>();

  useInput((input, key) => {
    if (key.escape) {
      onCancel?.();
      return;
    }

    if (key.return) {
      const validationError = validate?.(value);
      if (validationError) {
        setError(validationError);
        return;
      }
      
      setError(undefined);
      onSubmit(value);
      return;
    }

    if (key.backspace || key.delete) {
      setValue(prev => prev.slice(0, -1));
      setError(undefined);
      return;
    }

    if (input && !key.ctrl && !key.meta) {
      setValue(prev => prev + input);
      setError(undefined);
    }
  });

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text>{label}</Text>
      </Box>
      
      <Box>
        <Text color={COLORS.MUTED}>{'> '}</Text>
        <Text>{value}</Text>
        {!value && placeholder && (
          <Text color={COLORS.MUTED} dimColor>
            {placeholder}
          </Text>
        )}
        <Text>{'|'}</Text>
      </Box>

      {error && (
        <Box marginTop={1}>
          <Text color={COLORS.ERROR}>{error}</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color={COLORS.MUTED} dimColor>
          Press Enter to confirm, Esc to cancel
        </Text>
      </Box>
    </Box>
  );
}
import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import type { SelectPromptProps, SelectOption } from '../../types/index.js';
import { COLORS } from '../../constants/index.js';

export function SelectPrompt<T = string>({
  label,
  options,
  onSelect,
  onCancel,
  defaultIndex = 0
}: SelectPromptProps<T>): JSX.Element {
  const [selectedIndex, setSelectedIndex] = useState(defaultIndex);

  useEffect(() => {
    setSelectedIndex(Math.max(0, Math.min(defaultIndex, options.length - 1)));
  }, [defaultIndex, options.length]);

  useInput((input, key) => {
    if (key.escape) {
      onCancel?.();
      return;
    }

    if (key.return) {
      const selectedOption = options[selectedIndex];
      if (selectedOption) {
        onSelect(selectedOption.value);
      }
      return;
    }

    if (key.upArrow) {
      setSelectedIndex(prev => 
        prev === 0 ? options.length - 1 : prev - 1
      );
      return;
    }

    if (key.downArrow) {
      setSelectedIndex(prev => 
        prev === options.length - 1 ? 0 : prev + 1
      );
      return;
    }

    const numericInput = parseInt(input, 10);
    if (!isNaN(numericInput) && numericInput >= 1 && numericInput <= options.length) {
      setSelectedIndex(numericInput - 1);
    }
  });

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text>{label}</Text>
      </Box>

      {options.map((option, index) => {
        const isSelected = index === selectedIndex;
        const marker = isSelected ? '> ' : '  ';
        
        return (
          <Box key={index} marginLeft={1}>
            <Text {...(isSelected ? { color: COLORS.PRIMARY } : {})}>
              {marker}{option.label}
            </Text>
            {option.description && (
              <Text color={COLORS.MUTED} dimColor>
                {' '}({option.description})
              </Text>
            )}
          </Box>
        );
      })}

      <Box marginTop={1}>
        <Text color={COLORS.MUTED} dimColor>
          Use ↑↓ arrows to navigate, Enter to select, Esc to cancel
        </Text>
      </Box>
    </Box>
  );
}
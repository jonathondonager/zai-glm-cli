import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";

interface ThinkingPanelProps {
  thinkingContent: string;
  modelName: string;
  isVisible: boolean;
  isStreaming: boolean;
}

export default function ThinkingPanel({
  thinkingContent,
  modelName,
  isVisible,
  isStreaming,
}: ThinkingPanelProps) {
  const [dots, setDots] = useState(".");

  // Animation des points pour l'indicateur de streaming
  useEffect(() => {
    if (!isStreaming) {
      setDots(".");
      return;
    }

    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev === "...") return ".";
        return prev + ".";
      });
    }, 400);

    return () => clearInterval(interval);
  }, [isStreaming]);

  // Ensure thinkingContent is a string (defensive check)
  const safeContent = typeof thinkingContent === 'string' ? thinkingContent : '';
  const safeModelName = typeof modelName === 'string' ? modelName : '';

  if (!isVisible || !safeContent) {
    return null;
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="magenta"
      paddingX={1}
      marginBottom={1}
    >
      <Box>
        <Text color="magenta" bold={true}>
          💭 Thinking ({safeModelName})
        </Text>
        <Text color="gray" dimColor={true}>
          {" "}
          [Press T to toggle]
        </Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text color="gray" italic={true}>
          {safeContent}
        </Text>
        {isStreaming && (
          <Box marginTop={1}>
            <Text color="cyan" dimColor={true}>
              ▸ thinking
            </Text>
            <Text color="cyan">{dots}</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}

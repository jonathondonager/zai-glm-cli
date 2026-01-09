/**
 * Utility functions for agent intelligence features
 * Separated from ZaiAgent for testability
 */

export interface ToolResult {
  tool: string;
  success: boolean;
  error?: string;
}

/**
 * Extracts critical information from message content that should be preserved verbatim
 * This includes errors, file paths modified, and important discoveries
 * Note: These are best-effort heuristics and may not catch all patterns
 */
export function extractCriticalInfo(contents: string[]): string[] {
  const criticalInfo: string[] = [];

  for (const content of contents) {
    // Preserve error messages (they often contain important debugging info)
    // Matches: "error:", "error -", "Error:", "ERROR:", "failed:", "Failed to", etc.
    if (content.toLowerCase().includes('error') || content.toLowerCase().includes('failed')) {
      const errorMatch = content.match(/(?:error|failed|failure)[\s:\-]+.{0,100}?(?=\n|$)/gi);
      if (errorMatch) {
        // Take first 3 unique errors, trim to reasonable length
        const uniqueErrors = [...new Set(errorMatch.map(e => e.trim().slice(0, 150)))];
        uniqueErrors.slice(0, 3).forEach(err => {
          criticalInfo.push(`ERROR: ${err}`);
        });
      }
    }

    // Preserve file paths that were modified
    // Matches paths with extensions (case-insensitive) or common extensionless files
    const filePathMatch = content.match(
      /(?:created|modified|edited|updated|deleted|wrote|writing)\s+(?:file\s+)?['"`]?([^\s'"`\n]*(?:\.[a-zA-Z0-9]+|Makefile|Dockerfile|README|LICENSE|CHANGELOG))['"`]?/gi
    );
    if (filePathMatch) {
      criticalInfo.push(`FILE CHANGE: ${filePathMatch.slice(0, 5).join(', ')}`);
    }

    // Preserve search results with file locations
    // Matches: "found in", "found at", "located in", "located at", plus line numbers
    const searchMatch = content.match(
      /(?:found|located|match(?:es)?)\s+(?:in|at)\s+['"`]?([^\s'"`\n]+(?:\.[a-zA-Z0-9]+))['"`]?(?:\s*[:\(]\s*(?:line\s*)?\d+)?/gi
    );
    if (searchMatch) {
      criticalInfo.push(`FOUND: ${searchMatch.slice(0, 5).join(', ')}`);
    }
  }

  return [...new Set(criticalInfo)]; // Remove duplicates
}

/**
 * Finds the most frequently occurring tool in a list of results
 */
export function findMostCommonTool(results: ToolResult[]): { tool: string; count: number } {
  const counts = new Map<string, number>();
  for (const r of results) {
    counts.set(r.tool, (counts.get(r.tool) || 0) + 1);
  }
  let maxTool = '';
  let maxCount = 0;
  for (const [tool, count] of counts) {
    if (count > maxCount) {
      maxTool = tool;
      maxCount = count;
    }
  }
  return { tool: maxTool, count: maxCount };
}

export interface StuckDetectionConfig {
  maxConsecutiveFailures: number;
  stuckDetectionWindow: number;
  currentReflectionCount: number;
  maxReflectionsPerTurn: number;
}

export interface StuckDetectionResult {
  isStuck: boolean;
  reason: 'consecutive_failures' | 'loop_detected' | null;
  reflection: string | null;
  failedTools?: string[];
  errors?: string[];
  loopingTool?: string;
}

/**
 * Detects if the agent is stuck in an unproductive loop
 * Returns detection result with optional reflection prompt
 */
export function detectStuckPattern(
  recentResults: ToolResult[],
  config: StuckDetectionConfig
): StuckDetectionResult {
  const { maxConsecutiveFailures, stuckDetectionWindow, currentReflectionCount, maxReflectionsPerTurn } = config;

  // Respect reflection cooldown
  if (currentReflectionCount >= maxReflectionsPerTurn) {
    return { isStuck: false, reason: null, reflection: null };
  }

  if (recentResults.length < maxConsecutiveFailures) {
    return { isStuck: false, reason: null, reflection: null };
  }

  // Check for consecutive failures
  const lastResults = recentResults.slice(-maxConsecutiveFailures);
  const allFailed = lastResults.every(r => !r.success);

  if (allFailed) {
    const errors = [...new Set(lastResults.map(r => r.error).filter(Boolean))] as string[];
    const tools = [...new Set(lastResults.map(r => r.tool))];

    const reflection = `REFLECTION NEEDED: The last ${maxConsecutiveFailures} tool calls have failed.

Failed tools: ${tools.join(', ')}
Error patterns: ${errors.slice(0, 3).join('; ')}

Before continuing, please:
1. Analyze why these tools are failing
2. Consider if you're using the right tool for the task
3. Check if you need to gather more information first (e.g., view_file, search)
4. Try a completely different approach if the current one isn't working

Do NOT repeat the same failed operation. Adapt your strategy.`;

    return {
      isStuck: true,
      reason: 'consecutive_failures',
      reflection,
      failedTools: tools,
      errors
    };
  }

  // Check for repeated same tool with failures (sign of loop)
  if (recentResults.length >= stuckDetectionWindow) {
    const window = recentResults.slice(-stuckDetectionWindow);
    const { tool: mostCommonTool, count } = findMostCommonTool(window);

    // If one tool dominates the window (4+ out of 5 calls)
    if (count >= stuckDetectionWindow - 1) {
      const sameToolCalls = window.filter(r => r.tool === mostCommonTool);
      const failedSameToolCalls = sameToolCalls.filter(r => !r.success);

      if (failedSameToolCalls.length >= 3) {
        const reflection = `REFLECTION NEEDED: You appear to be stuck in a loop, repeatedly calling '${mostCommonTool}' without success.

Please:
1. Stop and reconsider the approach
2. Try a different tool or method
3. If the file doesn't exist, it may need to be created
4. If the search isn't finding results, try different search terms
5. Ask the user for clarification if the task is unclear

Do NOT continue with the same approach.`;

        return {
          isStuck: true,
          reason: 'loop_detected',
          reflection,
          loopingTool: mostCommonTool
        };
      }
    }
  }

  return { isStuck: false, reason: null, reflection: null };
}

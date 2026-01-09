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
export declare function extractCriticalInfo(contents: string[]): string[];
/**
 * Finds the most frequently occurring tool in a list of results
 */
export declare function findMostCommonTool(results: ToolResult[]): {
    tool: string;
    count: number;
};
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
export declare function detectStuckPattern(recentResults: ToolResult[], config: StuckDetectionConfig): StuckDetectionResult;

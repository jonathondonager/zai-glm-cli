import { ZaiClient, ZaiToolCall } from "../zai/client.js";
import { ToolResult } from "../types/index.js";
import { EventEmitter } from "events";
export interface ChatEntry {
    type: "user" | "assistant" | "tool_result" | "tool_call" | "agent_activity";
    content: string;
    timestamp: Date;
    toolCalls?: ZaiToolCall[];
    toolCall?: ZaiToolCall;
    toolResult?: {
        success: boolean;
        output?: string;
        error?: string;
    };
    isStreaming?: boolean;
    agentInfo?: {
        type: string;
        name: string;
        status: "starting" | "running" | "completed" | "failed";
        taskId?: string;
        duration?: number;
        error?: string;
    };
}
export interface StreamingChunk {
    type: "content" | "tool_calls" | "tool_result" | "done" | "token_count" | "thinking";
    content?: string;
    toolCalls?: ZaiToolCall[];
    toolCall?: ZaiToolCall;
    toolResult?: ToolResult;
    tokenCount?: number;
}
export declare class ZaiAgent extends EventEmitter {
    private zaiClient;
    private textEditor;
    private morphEditor;
    private bash;
    private todoTool;
    private confirmationTool;
    private search;
    private batchEditor;
    private webSearchTool;
    private chatHistory;
    private messages;
    private tokenCounter;
    private abortController;
    private mcpInitialized;
    private maxToolRounds;
    private systemInstructions;
    private readonly MAX_MESSAGES;
    private readonly KEEP_RECENT_MESSAGES;
    private contextSummary;
    private readonly MAX_CONSECUTIVE_FAILURES;
    private readonly STUCK_DETECTION_WINDOW;
    private readonly MAX_REFLECTIONS_PER_TURN;
    private recentToolResults;
    private reflectionCount;
    constructor(apiKey: string, baseURL?: string, model?: string, maxToolRounds?: number);
    /**
     * Estimates the total token count for an array of messages
     * Uses a rough approximation of ~4 characters per token
     */
    private estimateMessageTokens;
    /**
     * Extracts critical information from messages that should be preserved verbatim
     * Delegates to the utility function for testability
     */
    private extractCriticalInfo;
    /**
     * Summarizes a range of conversation messages into a concise summary
     * Focuses on key decisions, file modifications, findings, and state
     * Preserves critical information verbatim while summarizing the rest
     */
    private summarizeContext;
    /**
     * Manages context by compressing old messages when limit is reached
     * Preserves system message, creates summary of old context, keeps recent messages
     */
    private manageContext;
    /**
     * Records a tool result for stuck detection
     */
    private recordToolResult;
    /**
     * Detects if the agent is stuck in an unproductive loop
     * Delegates to the utility function for testability
     * Returns a reflection prompt if stuck, null otherwise
     */
    private detectStuckPattern;
    /**
     * Clears the recent tool results and reflection count (call at the start of a new user message)
     */
    private clearToolResultTracking;
    private initializeMCP;
    processUserMessage(message: string): Promise<ChatEntry[]>;
    private messageReducer;
    processUserMessageStream(message: string): AsyncGenerator<StreamingChunk, void, unknown>;
    private executeTool;
    private executeMCPTool;
    getChatHistory(): ChatEntry[];
    /**
     * Add agent activity notification to chat history
     * Used by sub-agents to show their status in the parent agent's UI
     */
    addAgentActivity(agentType: string, agentName: string, status: "starting" | "running" | "completed" | "failed", taskId?: string, duration?: number, error?: string): void;
    getCurrentDirectory(): string;
    executeBashCommand(command: string): Promise<ToolResult>;
    getCurrentModel(): string;
    setModel(model: string): void;
    getClient(): ZaiClient;
    abortCurrentOperation(): void;
    /**
     * Returns the current context summary if context has been compressed
     */
    getContextSummary(): string;
}

/**
 * Agent System Types
 * Defines specialized agents for different tasks
 */
export type BuiltInAgentType = 'general-purpose' | 'code-reviewer' | 'test-writer' | 'documentation' | 'refactoring' | 'debugging' | 'security-audit' | 'performance-optimizer' | 'explore' | 'plan';
export type AgentType = BuiltInAgentType | string;
export interface AgentCapability {
    name: string;
    description: string;
    tools: string[];
    model?: string;
    systemPrompt: string;
    maxRounds?: number;
}
export interface AgentTask {
    id: string;
    type: AgentType;
    description: string;
    prompt: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    result?: AgentResult;
    error?: string;
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    parentTaskId?: string;
}
export interface AgentResult {
    success: boolean;
    output: string;
    metadata?: {
        tokensUsed?: number;
        toolsUsed?: string[];
        duration?: number;
        filesModified?: string[];
        [key: string]: any;
    };
}
export interface AgentConfig {
    type: AgentType;
    model?: string;
    maxRounds?: number;
    tools?: string[];
    customSystemPrompt?: string;
}
/**
 * Agent capability definitions
 *
 * @deprecated Direct access to AGENT_CAPABILITIES is deprecated.
 * Use getAgentCapability() instead for lazy-loaded, cached capabilities.
 *
 * This object is now empty and kept only for backward compatibility.
 * All capabilities are loaded on-demand from skill files to avoid blocking
 * the event loop at module initialization time.
 */
export declare const AGENT_CAPABILITIES: Partial<Record<BuiltInAgentType, AgentCapability>>;
/**
 * Get agent capability by type (all agents are loaded from skill files)
 * Results are cached automatically by the skill loader for performance
 */
export declare function getAgentCapability(agentType: AgentType): Promise<AgentCapability | undefined>;
/**
 * Synchronous version of getAgentCapability for cases where async is not possible
 */
export declare function getAgentCapabilitySync(agentType: AgentType): AgentCapability | undefined;
/**
 * Check if an agent type is a built-in type
 * Built-in agents are those that ship with the CLI in the skills/ directory
 */
export declare function isBuiltInAgent(agentType: AgentType): boolean;
/**
 * Get all available agent types (all loaded from skill files)
 */
export declare function getAllAgentTypes(): Promise<AgentType[]>;

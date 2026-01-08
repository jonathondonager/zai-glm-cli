/**
 * Agent System Types
 * Defines specialized agents for different tasks
 */

// Built-in agent types
export type BuiltInAgentType =
  | 'general-purpose'
  | 'code-reviewer'
  | 'test-writer'
  | 'documentation'
  | 'refactoring'
  | 'debugging'
  | 'security-audit'
  | 'performance-optimizer'
  | 'explore'
  | 'plan';

// AgentType can be a built-in or any custom skill ID
export type AgentType = BuiltInAgentType | string;

export interface AgentCapability {
  name: string;
  description: string;
  tools: string[]; // Available tools for this agent
  model?: string; // Specific model (or inherit from parent)
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
  parentTaskId?: string; // For sub-tasks
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
export const AGENT_CAPABILITIES: Partial<Record<BuiltInAgentType, AgentCapability>> = {};

/**
 * Get agent capability by type (all agents are loaded from skill files)
 * Results are cached automatically by the skill loader for performance
 */
export async function getAgentCapability(agentType: AgentType): Promise<AgentCapability | undefined> {
  try {
    const { getSkillLoader } = await import('./skill-loader.js');
    const skillLoader = getSkillLoader();

    // Use the skill loader's cached getCapability method
    return skillLoader.getCapability(agentType);
  } catch (error) {
    // Skill loader not available or skill not found
    return undefined;
  }
}

/**
 * Synchronous version of getAgentCapability for cases where async is not possible
 */
export function getAgentCapabilitySync(agentType: AgentType): AgentCapability | undefined {
  // All capabilities are now loaded from skill files, which requires async
  // Caller should use async version
  return undefined;
}

/**
 * Check if an agent type is a built-in type
 * Built-in agents are those that ship with the CLI in the skills/ directory
 */
export function isBuiltInAgent(agentType: AgentType): boolean {
  // List of built-in agent IDs that ship with the CLI
  const builtInAgents: BuiltInAgentType[] = [
    'general-purpose',
    'code-reviewer',
    'test-writer',
    'documentation',
    'refactoring',
    'debugging',
    'security-audit',
    'performance-optimizer',
    'explore',
    'plan',
  ];
  return builtInAgents.includes(agentType as BuiltInAgentType);
}

/**
 * Get all available agent types (all loaded from skill files)
 */
export async function getAllAgentTypes(): Promise<AgentType[]> {
  try {
    const { getSkillLoader } = await import('./skill-loader.js');
    const skillLoader = getSkillLoader();
    const allSkills = skillLoader.getAllSkills().map((s) => s.id);
    return allSkills;
  } catch (error) {
    return [];
  }
}

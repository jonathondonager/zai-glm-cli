/**
 * Agent System Types
 * Defines specialized agents for different tasks
 */
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
export const AGENT_CAPABILITIES = {};
/**
 * Get agent capability by type (all agents are loaded from skill files)
 * Results are cached automatically by the skill loader for performance
 */
export async function getAgentCapability(agentType) {
    try {
        const { getSkillLoader } = await import('./skill-loader.js');
        const skillLoader = getSkillLoader();
        // Use the skill loader's cached getCapability method
        return skillLoader.getCapability(agentType);
    }
    catch (error) {
        // Skill loader not available or skill not found
        return undefined;
    }
}
/**
 * Synchronous version of getAgentCapability for cases where async is not possible
 */
export function getAgentCapabilitySync(agentType) {
    // All capabilities are now loaded from skill files, which requires async
    // Caller should use async version
    return undefined;
}
/**
 * Check if an agent type is a built-in type
 * Built-in agents are those that ship with the CLI in the skills/ directory
 */
export function isBuiltInAgent(agentType) {
    // List of built-in agent IDs that ship with the CLI
    const builtInAgents = [
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
    return builtInAgents.includes(agentType);
}
/**
 * Get all available agent types (all loaded from skill files)
 */
export async function getAllAgentTypes() {
    try {
        const { getSkillLoader } = await import('./skill-loader.js');
        const skillLoader = getSkillLoader();
        const allSkills = skillLoader.getAllSkills().map((s) => s.id);
        return allSkills;
    }
    catch (error) {
        return [];
    }
}
//# sourceMappingURL=agent-types.js.map
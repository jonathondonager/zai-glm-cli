/**
 * Agent System Types
 * Defines specialized agents for different tasks
 */
// Agent capability definitions
// NOTE: Built-in agents are now defined as skill files in the skills/ directory
// This object is kept for backward compatibility but is empty
export const AGENT_CAPABILITIES = {};
/**
 * Get agent capability by type (all agents are now loaded from skill files)
 */
export async function getAgentCapability(agentType) {
    try {
        const { getSkillLoader } = await import('./skill-loader.js');
        const skillLoader = getSkillLoader();
        const skill = skillLoader.getSkill(agentType);
        if (skill) {
            return skillLoader.skillToCapability(skill);
        }
    }
    catch (error) {
        // Skill loader not available or skill not found
    }
    return undefined;
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
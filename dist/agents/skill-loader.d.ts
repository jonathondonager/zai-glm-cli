/**
 * Skill Loader
 * Loads and parses skill definitions from markdown files
 */
import { AgentCapability } from './agent-types.js';
export interface SkillDefinition {
    id: string;
    name: string;
    description: string;
    tools: string[];
    systemPrompt: string;
    triggerKeywords?: string[];
    maxRounds?: number;
    model?: string;
    filePath: string;
}
export declare class SkillLoader {
    private static instance;
    private skills;
    private skillPaths;
    private builtInSkillsPath;
    private loadingPromise;
    private loadErrors;
    constructor(skillPaths?: string[]);
    static getInstance(): SkillLoader;
    /**
     * Reset the singleton instance (useful for testing)
     */
    static resetInstance(): void;
    /**
     * Initialize skill search paths (in order of loading)
     * Later paths override earlier ones, so the order is:
     * built-in → user global → project-local (highest precedence wins)
     */
    private initializeSkillPaths;
    /**
     * Load all skills from configured paths
     * @returns Number of custom skills loaded (excludes built-in)
     *
     * This method is protected by a loading lock to prevent race conditions.
     * Concurrent calls will wait for the in-progress load to complete.
     */
    loadAllSkills(): Promise<number>;
    /**
     * Internal method that does the actual loading
     * Called by loadAllSkills() which provides the locking mechanism
     */
    private doLoadAllSkills;
    /**
     * Get errors that occurred during the last loadAllSkills() call
     * Returns a deep copy to prevent external mutation
     */
    getLoadErrors(): Array<{
        file: string;
        error: string;
    }>;
    /**
     * Load skills from a specific directory
     * @returns Result with count of loaded skills and any errors
     */
    private loadSkillsFromDirectory;
    /**
     * Load and parse a single skill file
     */
    private loadSkillFromFile;
    /**
     * Parse skill markdown content
     */
    private parseSkillMarkdown;
    /**
     * Get a skill by ID
     */
    getSkill(id: string): SkillDefinition | undefined;
    /**
     * Get all loaded skills
     */
    getAllSkills(): SkillDefinition[];
    /**
     * Find skills by trigger keyword
     */
    findSkillsByKeyword(keyword: string): SkillDefinition[];
    /**
     * Check if a skill exists
     */
    hasSkill(id: string): boolean;
    /**
     * Convert skill definition to AgentCapability format
     */
    skillToCapability(skill: SkillDefinition): AgentCapability;
    /**
     * Get capability for an agent type
     * Convenience method that combines getSkill() and skillToCapability()
     */
    getCapability(agentType: string): AgentCapability | undefined;
    /**
     * Reload skills from disk
     */
    reload(): Promise<void>;
    /**
     * Get skill statistics
     */
    getStatistics(): {
        total: number;
        byPath: Record<string, number>;
        withTriggers: number;
    };
}
/**
 * Singleton getter
 */
export declare function getSkillLoader(): SkillLoader;

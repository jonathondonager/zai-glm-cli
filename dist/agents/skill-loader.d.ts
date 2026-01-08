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
    private constructor();
    static getInstance(): SkillLoader;
    /**
     * Initialize skill search paths (in order of precedence)
     */
    private initializeSkillPaths;
    /**
     * Load all skills from configured paths
     */
    loadAllSkills(): Promise<void>;
    /**
     * Load skills from a specific directory
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

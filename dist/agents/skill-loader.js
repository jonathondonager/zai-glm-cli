/**
 * Skill Loader
 * Loads and parses skill definitions from markdown files
 */
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
// Get current directory for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Valid tool names that can be used in skills
const VALID_TOOLS = [
    'view_file',
    'edit_file',
    'str_replace',
    'bash',
    'search',
    'batch_edit',
    'web_search',
    'todo',
];
// Valid model names
const VALID_MODELS = [
    'glm-4.7',
    'glm-4.6',
    'glm-4.5',
    'glm-4.5-air',
];
// Validation constraints
const VALIDATION_RULES = {
    maxRounds: { min: 5, max: 100 },
    descriptionLength: { min: 10, max: 500 },
    systemPromptLength: { min: 50, max: 50000 },
    skillIdPattern: /^[a-z0-9-]+$/,
    maxTools: 10,
    maxLinesPerSection: 1000, // Prevent memory exhaustion from malicious files
};
export class SkillLoader {
    static instance = null;
    skills = new Map();
    skillPaths = [];
    builtInSkillsPath = '';
    loadingPromise = null;
    loadErrors = [];
    constructor(skillPaths) {
        if (skillPaths) {
            this.skillPaths = skillPaths;
            this.builtInSkillsPath = ''; // Not applicable for custom paths
        }
        else {
            this.initializeSkillPaths();
        }
    }
    static getInstance() {
        if (!SkillLoader.instance) {
            SkillLoader.instance = new SkillLoader();
        }
        return SkillLoader.instance;
    }
    /**
     * Reset the singleton instance (useful for testing)
     */
    static resetInstance() {
        SkillLoader.instance = null;
    }
    /**
     * Initialize skill search paths (in order of loading)
     * Later paths override earlier ones, so the order is:
     * built-in → user global → project-local (highest precedence wins)
     */
    initializeSkillPaths() {
        // Built-in skills are in the installation directory (../../skills from dist/agents/)
        this.builtInSkillsPath = path.join(__dirname, '..', '..', 'skills');
        this.skillPaths = [
            // Built-in skills (loaded first, lowest precedence)
            this.builtInSkillsPath,
            // User global skills (override built-in)
            path.join(os.homedir(), '.zai', 'skills'),
            // Project-local skills (loaded last, highest precedence)
            path.join(process.cwd(), '.zai', 'skills'),
        ];
    }
    /**
     * Load all skills from configured paths
     * @returns Number of custom skills loaded (excludes built-in)
     *
     * This method is protected by a loading lock to prevent race conditions.
     * Concurrent calls will wait for the in-progress load to complete.
     */
    async loadAllSkills() {
        // If already loading, return the existing promise (loading lock)
        if (this.loadingPromise) {
            return this.loadingPromise;
        }
        // Create the loading promise and store it
        this.loadingPromise = this.doLoadAllSkills();
        try {
            const result = await this.loadingPromise;
            return result;
        }
        finally {
            // Clear the loading promise when done
            this.loadingPromise = null;
        }
    }
    /**
     * Internal method that does the actual loading
     * Called by loadAllSkills() which provides the locking mechanism
     */
    async doLoadAllSkills() {
        this.skills.clear();
        this.loadErrors = [];
        let customSkillsLoaded = 0;
        // Load from all paths in order (later paths override earlier ones)
        // This means: built-in < user global < project-local (highest precedence)
        for (const skillPath of this.skillPaths) {
            const { loaded, isBuiltIn, errors: pathErrors } = await this.loadSkillsFromDirectory(skillPath);
            if (!isBuiltIn) {
                customSkillsLoaded += loaded;
            }
            this.loadErrors.push(...pathErrors);
        }
        return customSkillsLoaded;
    }
    /**
     * Get errors that occurred during the last loadAllSkills() call
     * Returns a deep copy to prevent external mutation
     */
    getLoadErrors() {
        return this.loadErrors.map(e => ({ ...e }));
    }
    /**
     * Load skills from a specific directory
     * @returns Result with count of loaded skills and any errors
     */
    async loadSkillsFromDirectory(dirPath) {
        const errors = [];
        let loaded = 0;
        // Proper path comparison: resolve both paths and compare
        const resolvedDir = path.resolve(dirPath);
        const resolvedBuiltIn = this.builtInSkillsPath ? path.resolve(this.builtInSkillsPath) : '';
        const isBuiltIn = resolvedDir === resolvedBuiltIn;
        try {
            await fs.access(dirPath);
            const files = await fs.readdir(dirPath);
            const skillFiles = files.filter(f => f.endsWith('.skill.md'));
            if (skillFiles.length === 0) {
                // Empty directory is not an error
                return { loaded, isBuiltIn, errors };
            }
            for (const file of skillFiles) {
                const filePath = path.join(dirPath, file);
                try {
                    const skill = await this.loadSkillFromFile(filePath);
                    this.skills.set(skill.id, skill);
                    loaded++;
                }
                catch (error) {
                    const relPath = filePath.replace(process.cwd(), '.');
                    errors.push({ file: relPath, error: error.message });
                }
            }
        }
        catch (error) {
            // Directory doesn't exist - this is normal for custom skill directories
            if (error.code !== 'ENOENT' && error.code !== 'EACCES') {
                // But other errors should be reported
                errors.push({ file: dirPath, error: error.message });
            }
        }
        return { loaded, isBuiltIn, errors };
    }
    /**
     * Load and parse a single skill file
     */
    async loadSkillFromFile(filePath) {
        const content = await fs.readFile(filePath, 'utf-8');
        return this.parseSkillMarkdown(content, filePath);
    }
    /**
     * Parse skill markdown content
     */
    parseSkillMarkdown(content, filePath) {
        // Handle both Unix (\n) and Windows (\r\n) line endings
        const lines = content.split(/\r?\n/);
        let currentSection = null;
        const sections = {};
        let idFound = false;
        // Parse sections
        for (const line of lines) {
            // Check for section headers (## Header)
            const sectionMatch = line.match(/^##\s+(.+)$/);
            if (sectionMatch) {
                currentSection = sectionMatch[1].trim().toLowerCase();
                sections[currentSection] = [];
                continue;
            }
            // Check for skill ID (# skill-id) - only accept the first one
            if (!idFound) {
                const idMatch = line.match(/^#\s+([a-z0-9-]+)$/);
                if (idMatch) {
                    sections['id'] = [idMatch[1]];
                    idFound = true;
                    continue;
                }
            }
            // Accumulate section content
            if (currentSection && line.trim()) {
                sections[currentSection].push(line.trim());
            }
        }
        // Validate required fields with helpful error messages
        if (!sections['id'] || sections['id'].length === 0) {
            throw new Error(`${filePath}: Missing skill ID. Expected '# skill-id' as first heading.`);
        }
        if (!sections['description']) {
            throw new Error(`${filePath}: Missing '## Description' section. This section is required.`);
        }
        if (!sections['tools']) {
            throw new Error(`${filePath}: Missing '## Tools' section. This section is required.`);
        }
        if (!sections['system prompt']) {
            throw new Error(`${filePath}: Missing '## System Prompt' section. This section is required.`);
        }
        // Extract skill ID
        const id = sections['id'][0];
        // Validate skill ID format
        if (!VALIDATION_RULES.skillIdPattern.test(id)) {
            throw new Error(`${filePath}: Invalid skill ID '${id}'. Must contain only lowercase letters, numbers, and hyphens.`);
        }
        // Extract description
        const description = sections['description'].join(' ').trim();
        // Validate description length
        if (description.length < VALIDATION_RULES.descriptionLength.min) {
            throw new Error(`${filePath}: Description too short (${description.length} chars). Minimum: ${VALIDATION_RULES.descriptionLength.min} characters.`);
        }
        if (description.length > VALIDATION_RULES.descriptionLength.max) {
            throw new Error(`${filePath}: Description too long (${description.length} chars). Maximum: ${VALIDATION_RULES.descriptionLength.max} characters.`);
        }
        // Validate tools section size to prevent resource exhaustion
        if (sections['tools'].length > VALIDATION_RULES.maxLinesPerSection) {
            throw new Error(`${filePath}: Too many lines in Tools section (${sections['tools'].length}). Maximum: ${VALIDATION_RULES.maxLinesPerSection} lines.`);
        }
        // Extract tools (remove bullet points and dashes)
        const tools = sections['tools']
            .map((line) => line.replace(/^[-*]\s*/, '').trim())
            .filter((tool) => tool.length > 0);
        // Validate tools
        if (tools.length === 0) {
            throw new Error(`${filePath}: No tools specified. At least one tool is required.`);
        }
        if (tools.length > VALIDATION_RULES.maxTools) {
            throw new Error(`${filePath}: Too many tools (${tools.length}). Maximum: ${VALIDATION_RULES.maxTools} tools.`);
        }
        const validToolSet = new Set(VALID_TOOLS);
        const invalidTools = tools.filter(tool => !validToolSet.has(tool));
        if (invalidTools.length > 0) {
            throw new Error(`${filePath}: Invalid tool name(s): ${invalidTools.join(', ')}. Valid tools: ${VALID_TOOLS.join(', ')}`);
        }
        // Validate system prompt section size
        if (sections['system prompt'].length > VALIDATION_RULES.maxLinesPerSection) {
            throw new Error(`${filePath}: Too many lines in System Prompt section (${sections['system prompt'].length}). Maximum: ${VALIDATION_RULES.maxLinesPerSection} lines.`);
        }
        // Extract system prompt
        const systemPrompt = sections['system prompt'].join('\n').trim();
        // Validate system prompt length
        if (systemPrompt.length < VALIDATION_RULES.systemPromptLength.min) {
            throw new Error(`${filePath}: System prompt too short (${systemPrompt.length} chars). Minimum: ${VALIDATION_RULES.systemPromptLength.min} characters.`);
        }
        if (systemPrompt.length > VALIDATION_RULES.systemPromptLength.max) {
            throw new Error(`${filePath}: System prompt too long (${systemPrompt.length} chars). Maximum: ${VALIDATION_RULES.systemPromptLength.max} characters.`);
        }
        // Extract optional fields
        const triggerKeywords = sections['trigger keywords']
            ? sections['trigger keywords']
                .join(',')
                .split(',')
                .map((k) => k.trim().toLowerCase())
                .filter((k) => k.length > 0)
            : undefined;
        const maxRounds = sections['max rounds']
            ? parseInt(sections['max rounds'][0], 10)
            : undefined;
        // Validate maxRounds
        if (maxRounds !== undefined) {
            if (isNaN(maxRounds)) {
                throw new Error(`${filePath}: Invalid maxRounds value: '${sections['max rounds'][0]}'. Must be a number.`);
            }
            if (maxRounds < VALIDATION_RULES.maxRounds.min || maxRounds > VALIDATION_RULES.maxRounds.max) {
                throw new Error(`${filePath}: maxRounds out of range (${maxRounds}). Must be between ${VALIDATION_RULES.maxRounds.min} and ${VALIDATION_RULES.maxRounds.max}.`);
            }
        }
        const model = sections['model']
            ? sections['model'][0].trim()
            : undefined;
        // Validate model if specified
        if (model && !VALID_MODELS.includes(model)) {
            throw new Error(`${filePath}: Invalid model '${model}'. Valid models: ${VALID_MODELS.join(', ')}`);
        }
        // Create readable name from ID
        const name = id
            .split('-')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        return {
            id,
            name,
            description,
            tools,
            systemPrompt,
            triggerKeywords,
            maxRounds,
            model,
            filePath,
        };
    }
    /**
     * Get a skill by ID
     */
    getSkill(id) {
        return this.skills.get(id);
    }
    /**
     * Get all loaded skills
     */
    getAllSkills() {
        return Array.from(this.skills.values());
    }
    /**
     * Find skills by trigger keyword
     */
    findSkillsByKeyword(keyword) {
        const normalizedKeyword = keyword.toLowerCase();
        return this.getAllSkills().filter((skill) => skill.triggerKeywords?.some((k) => k.includes(normalizedKeyword)));
    }
    /**
     * Check if a skill exists
     */
    hasSkill(id) {
        return this.skills.has(id);
    }
    /**
     * Convert skill definition to AgentCapability format
     */
    skillToCapability(skill) {
        return {
            name: skill.name,
            description: skill.description,
            tools: skill.tools,
            systemPrompt: skill.systemPrompt,
            maxRounds: skill.maxRounds,
            model: skill.model,
        };
    }
    /**
     * Get capability for an agent type
     * Convenience method that combines getSkill() and skillToCapability()
     */
    getCapability(agentType) {
        const skill = this.getSkill(agentType);
        if (skill) {
            return this.skillToCapability(skill);
        }
        return undefined;
    }
    /**
     * Reload skills from disk
     */
    async reload() {
        await this.loadAllSkills();
    }
    /**
     * Get skill statistics
     */
    getStatistics() {
        const byPath = {};
        let withTriggers = 0;
        for (const skill of this.skills.values()) {
            const dir = path.dirname(skill.filePath);
            byPath[dir] = (byPath[dir] || 0) + 1;
            if (skill.triggerKeywords && skill.triggerKeywords.length > 0) {
                withTriggers++;
            }
        }
        return {
            total: this.skills.size,
            byPath,
            withTriggers,
        };
    }
}
/**
 * Singleton getter
 */
export function getSkillLoader() {
    return SkillLoader.getInstance();
}
//# sourceMappingURL=skill-loader.js.map
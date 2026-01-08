/**
 * Skill Loader
 * Loads and parses skill definitions from markdown files
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { AgentCapability } from './agent-types.js';

// Get current directory for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

export class SkillLoader {
  private static instance: SkillLoader;
  private skills: Map<string, SkillDefinition> = new Map();
  private skillPaths: string[] = [];

  private constructor() {
    this.initializeSkillPaths();
  }

  static getInstance(): SkillLoader {
    if (!SkillLoader.instance) {
      SkillLoader.instance = new SkillLoader();
    }
    return SkillLoader.instance;
  }

  /**
   * Initialize skill search paths (in order of precedence)
   */
  private initializeSkillPaths(): void {
    // Built-in skills are in the installation directory (../../skills from dist/agents/)
    const builtInSkillsPath = path.join(__dirname, '..', '..', 'skills');

    this.skillPaths = [
      // Project-local skills (highest precedence)
      path.join(process.cwd(), '.zai', 'skills'),
      // User global skills
      path.join(os.homedir(), '.zai', 'skills'),
      // Built-in skills (lowest precedence)
      builtInSkillsPath,
    ];
  }

  /**
   * Load all skills from configured paths
   */
  async loadAllSkills(): Promise<void> {
    this.skills.clear();

    // Load from all paths (reverse order so higher precedence overwrites)
    for (const skillPath of this.skillPaths.reverse()) {
      await this.loadSkillsFromDirectory(skillPath);
    }
  }

  /**
   * Load skills from a specific directory
   */
  private async loadSkillsFromDirectory(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
      const files = await fs.readdir(dirPath);

      for (const file of files) {
        if (file.endsWith('.skill.md')) {
          const filePath = path.join(dirPath, file);
          try {
            const skill = await this.loadSkillFromFile(filePath);
            this.skills.set(skill.id, skill);
          } catch (error: any) {
            console.warn(`Failed to load skill from ${filePath}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist or not accessible, skip silently
    }
  }

  /**
   * Load and parse a single skill file
   */
  private async loadSkillFromFile(filePath: string): Promise<SkillDefinition> {
    const content = await fs.readFile(filePath, 'utf-8');
    return this.parseSkillMarkdown(content, filePath);
  }

  /**
   * Parse skill markdown content
   */
  private parseSkillMarkdown(content: string, filePath: string): SkillDefinition {
    const lines = content.split('\n');
    let currentSection: string | null = null;
    const sections: Record<string, string[]> = {};
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

    // Validate required fields
    if (!sections['id'] || sections['id'].length === 0) {
      throw new Error('Missing skill ID (# skill-id)');
    }
    if (!sections['description']) {
      throw new Error('Missing Description section');
    }
    if (!sections['tools']) {
      throw new Error('Missing Tools section');
    }
    if (!sections['system prompt']) {
      throw new Error('Missing System Prompt section');
    }

    // Extract skill ID
    const id = sections['id'][0];

    // Extract description
    const description = sections['description'].join(' ').trim();

    // Extract tools (remove bullet points and dashes)
    const tools = sections['tools']
      .map((line) => line.replace(/^[-*]\s*/, '').trim())
      .filter((tool) => tool.length > 0);

    // Extract system prompt
    const systemPrompt = sections['system prompt'].join('\n').trim();

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

    const model = sections['model']
      ? sections['model'][0].trim()
      : undefined;

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
  getSkill(id: string): SkillDefinition | undefined {
    return this.skills.get(id);
  }

  /**
   * Get all loaded skills
   */
  getAllSkills(): SkillDefinition[] {
    return Array.from(this.skills.values());
  }

  /**
   * Find skills by trigger keyword
   */
  findSkillsByKeyword(keyword: string): SkillDefinition[] {
    const normalizedKeyword = keyword.toLowerCase();
    return this.getAllSkills().filter((skill) =>
      skill.triggerKeywords?.some((k) => k.includes(normalizedKeyword))
    );
  }

  /**
   * Check if a skill exists
   */
  hasSkill(id: string): boolean {
    return this.skills.has(id);
  }

  /**
   * Convert skill definition to AgentCapability format
   */
  skillToCapability(skill: SkillDefinition): AgentCapability {
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
   * Reload skills from disk
   */
  async reload(): Promise<void> {
    await this.loadAllSkills();
  }

  /**
   * Get skill statistics
   */
  getStatistics(): {
    total: number;
    byPath: Record<string, number>;
    withTriggers: number;
  } {
    const byPath: Record<string, number> = {};
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
export function getSkillLoader(): SkillLoader {
  return SkillLoader.getInstance();
}

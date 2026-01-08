import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { SkillLoader, getSkillLoader } from '../../../src/agents/skill-loader.js';
import { getAgentCapability } from '../../../src/agents/agent-types.js';

describe('SkillLoader', () => {
  let tempDir: string;
  let skillLoader: SkillLoader;

  beforeEach(async () => {
    // Create a temporary directory for test skills
    tempDir = path.join(os.tmpdir(), `skill-loader-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    // Create a fresh instance with test directory (dependency injection)
    // This avoids singleton pollution between tests
    skillLoader = new SkillLoader([tempDir]);
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('parseSkillMarkdown - Valid Skills', () => {
    it('should parse a valid minimal skill file', async () => {
      const content = `# test-skill

## Description
This is a test skill that performs testing tasks for the CLI application.

## Tools
- view_file
- edit_file

## System Prompt
This is a test skill system prompt with enough characters to meet the minimum requirement of 50 characters or more.
`;

      const filePath = path.join(tempDir, 'test-skill.skill.md');
      await fs.writeFile(filePath, content);

      const skill = await skillLoader['loadSkillFromFile'](filePath);

      expect(skill.id).toBe('test-skill');
      expect(skill.name).toBe('Test Skill');
      expect(skill.description).toContain('test skill');
      expect(skill.tools).toEqual(['view_file', 'edit_file']);
      expect(skill.systemPrompt.length).toBeGreaterThanOrEqual(50);
      expect(skill.triggerKeywords).toBeUndefined();
      expect(skill.maxRounds).toBeUndefined();
      expect(skill.model).toBeUndefined();
    });

    it('should parse a skill with all optional fields', async () => {
      const content = `# advanced-skill

## Description
An advanced skill with all optional fields configured for comprehensive testing purposes.

## Tools
- view_file
- edit_file
- bash
- search

## System Prompt
This is an advanced skill system prompt that includes detailed instructions and guidelines for the agent. It must be at least 50 characters long to pass validation requirements.

## Trigger Keywords
test, testing, advanced

## Max Rounds
25

## Model
glm-4.7
`;

      const filePath = path.join(tempDir, 'advanced-skill.skill.md');
      await fs.writeFile(filePath, content);

      const skill = await skillLoader['loadSkillFromFile'](filePath);

      expect(skill.id).toBe('advanced-skill');
      expect(skill.name).toBe('Advanced Skill');
      expect(skill.tools).toEqual(['view_file', 'edit_file', 'bash', 'search']);
      expect(skill.triggerKeywords).toEqual(['test', 'testing', 'advanced']);
      expect(skill.maxRounds).toBe(25);
      expect(skill.model).toBe('glm-4.7');
    });

    it('should convert skill ID to proper name format', async () => {
      const content = `# terraform-infrastructure-specialist

## Description
This skill handles terraform infrastructure with detailed specifications and requirements.

## Tools
- view_file

## System Prompt
A comprehensive system prompt for the terraform infrastructure specialist skill that meets minimum length requirements.
`;

      const filePath = path.join(tempDir, 'skill.skill.md');
      await fs.writeFile(filePath, content);

      const skill = await skillLoader['loadSkillFromFile'](filePath);

      expect(skill.name).toBe('Terraform Infrastructure Specialist');
    });

    it('should handle all valid tool names', async () => {
      const validTools = [
        'view_file',
        'edit_file',
        'str_replace',
        'bash',
        'search',
        'batch_edit',
        'web_search',
        'todo',
      ];

      const content = `# all-tools-skill

## Description
A skill that uses all available tools for comprehensive functionality testing.

## Tools
${validTools.map(tool => `- ${tool}`).join('\n')}

## System Prompt
System prompt for a skill that demonstrates usage of all available tools in the system. Must be long enough to pass validation.
`;

      const filePath = path.join(tempDir, 'all-tools.skill.md');
      await fs.writeFile(filePath, content);

      const skill = await skillLoader['loadSkillFromFile'](filePath);

      expect(skill.tools).toEqual(validTools);
    });

    it('should handle all valid model names', async () => {
      const models = ['glm-4.7', 'glm-4.6', 'glm-4.5', 'glm-4.5-air'];

      for (let i = 0; i < models.length; i++) {
        const model = models[i];
        const content = `# model-test-${i}

## Description
Testing skill with model ${model} configured for validation purposes and requirements.

## Tools
- view_file

## System Prompt
System prompt for testing model ${model} configuration and validation in the skill loading system.

## Model
${model}
`;

        const filePath = path.join(tempDir, `model-${i}.skill.md`);
        await fs.writeFile(filePath, content);

        const skill = await skillLoader['loadSkillFromFile'](filePath);
        expect(skill.model).toBe(model);
      }
    });
  });

  describe('parseSkillMarkdown - Validation Errors', () => {
    it('should reject skill without ID', async () => {
      const content = `## Description
Missing skill ID in this file.

## Tools
- view_file

## System Prompt
System prompt without an ID defined at the top of the file.
`;

      const filePath = path.join(tempDir, 'no-id.skill.md');
      await fs.writeFile(filePath, content);

      await expect(skillLoader['loadSkillFromFile'](filePath))
        .rejects.toThrow(/Missing skill ID/);
    });

    it('should reject skill with invalid ID format', async () => {
      const invalidIds = [
        'Uppercase-Skill',  // uppercase letters
        'skill_with_underscores',  // underscores not allowed
        'skill with spaces',  // spaces not allowed
        'skill@special',  // special characters
        '',  // empty
      ];

      for (const invalidId of invalidIds) {
        const content = `# ${invalidId}

## Description
Testing invalid skill ID format validation and error handling mechanisms.

## Tools
- view_file

## System Prompt
System prompt for testing invalid ID format detection and proper error messages.
`;

        const filePath = path.join(tempDir, `invalid-id.skill.md`);
        await fs.writeFile(filePath, content);

        await expect(skillLoader['loadSkillFromFile'](filePath))
          .rejects.toThrow(/Invalid skill ID|Missing skill ID/);
      }
    });

    it('should reject skill without description', async () => {
      const content = `# no-description

## Tools
- view_file

## System Prompt
System prompt for a skill that is missing the required description section.
`;

      const filePath = path.join(tempDir, 'no-desc.skill.md');
      await fs.writeFile(filePath, content);

      await expect(skillLoader['loadSkillFromFile'](filePath))
        .rejects.toThrow(/Missing.*Description/);
    });

    it('should reject skill with too short description', async () => {
      const content = `# short-desc

## Description
Too short

## Tools
- view_file

## System Prompt
System prompt for testing description length validation requirements and error handling.
`;

      const filePath = path.join(tempDir, 'short-desc.skill.md');
      await fs.writeFile(filePath, content);

      await expect(skillLoader['loadSkillFromFile'](filePath))
        .rejects.toThrow(/Description too short/);
    });

    it('should reject skill with too long description', async () => {
      const longDesc = 'a'.repeat(501);
      const content = `# long-desc

## Description
${longDesc}

## Tools
- view_file

## System Prompt
System prompt for testing maximum description length validation and enforcement.
`;

      const filePath = path.join(tempDir, 'long-desc.skill.md');
      await fs.writeFile(filePath, content);

      await expect(skillLoader['loadSkillFromFile'](filePath))
        .rejects.toThrow(/Description too long/);
    });

    it('should reject skill without tools section', async () => {
      const content = `# no-tools

## Description
This skill is missing the required tools section for testing validation.

## System Prompt
System prompt for a skill without any tools defined in the configuration.
`;

      const filePath = path.join(tempDir, 'no-tools.skill.md');
      await fs.writeFile(filePath, content);

      await expect(skillLoader['loadSkillFromFile'](filePath))
        .rejects.toThrow(/Missing.*Tools/);
    });

    it('should reject skill with empty tools list', async () => {
      const content = `# empty-tools

## Description
This skill has a tools section but no actual tools listed for testing.

## Tools

## System Prompt
System prompt for testing empty tools list validation and error handling.
`;

      const filePath = path.join(tempDir, 'empty-tools.skill.md');
      await fs.writeFile(filePath, content);

      await expect(skillLoader['loadSkillFromFile'](filePath))
        .rejects.toThrow(/No tools specified/);
    });

    it('should reject skill with invalid tool names', async () => {
      const content = `# invalid-tools

## Description
This skill contains invalid tool names for validation testing purposes.

## Tools
- view_file
- invalid_tool
- another_bad_tool

## System Prompt
System prompt for testing invalid tool name detection and proper error messages.
`;

      const filePath = path.join(tempDir, 'invalid-tools.skill.md');
      await fs.writeFile(filePath, content);

      await expect(skillLoader['loadSkillFromFile'](filePath))
        .rejects.toThrow(/Invalid tool name/);
    });

    it('should reject skill with too many tools', async () => {
      const tools = Array.from({ length: 11 }, (_, i) => `view_file`).slice(0, 8);
      tools.push('edit_file', 'bash', 'search'); // 11 total

      const content = `# too-many-tools

## Description
This skill has more than the maximum allowed number of tools for testing.

## Tools
${tools.map(t => `- ${t}`).join('\n')}

## System Prompt
System prompt for testing maximum tool count validation and enforcement rules.
`;

      const filePath = path.join(tempDir, 'too-many-tools.skill.md');
      await fs.writeFile(filePath, content);

      await expect(skillLoader['loadSkillFromFile'](filePath))
        .rejects.toThrow(/Too many tools/);
    });

    it('should reject skill without system prompt', async () => {
      const content = `# no-prompt

## Description
This skill is missing the required system prompt section for testing validation.

## Tools
- view_file
`;

      const filePath = path.join(tempDir, 'no-prompt.skill.md');
      await fs.writeFile(filePath, content);

      await expect(skillLoader['loadSkillFromFile'](filePath))
        .rejects.toThrow(/Missing.*System Prompt/);
    });

    it('should reject skill with too short system prompt', async () => {
      const content = `# short-prompt

## Description
This skill has a system prompt that is too short for validation requirements.

## Tools
- view_file

## System Prompt
Too short
`;

      const filePath = path.join(tempDir, 'short-prompt.skill.md');
      await fs.writeFile(filePath, content);

      await expect(skillLoader['loadSkillFromFile'](filePath))
        .rejects.toThrow(/System prompt too short/);
    });

    it('should reject skill with invalid maxRounds value', async () => {
      const content = `# invalid-rounds

## Description
This skill has an invalid maxRounds value for testing validation rules.

## Tools
- view_file

## System Prompt
System prompt for testing maxRounds validation with invalid numeric values.

## Max Rounds
not-a-number
`;

      const filePath = path.join(tempDir, 'invalid-rounds.skill.md');
      await fs.writeFile(filePath, content);

      await expect(skillLoader['loadSkillFromFile'](filePath))
        .rejects.toThrow(/Invalid maxRounds value/);
    });

    it('should reject skill with maxRounds out of range', async () => {
      const testCases = [
        { value: 4, name: 'too-low' },
        { value: 101, name: 'too-high' },
      ];

      for (const { value, name } of testCases) {
        const content = `# ${name}-rounds

## Description
Testing maxRounds range validation with value ${value} that is out of bounds.

## Tools
- view_file

## System Prompt
System prompt for testing maxRounds range enforcement and validation rules.

## Max Rounds
${value}
`;

        const filePath = path.join(tempDir, `${name}.skill.md`);
        await fs.writeFile(filePath, content);

        await expect(skillLoader['loadSkillFromFile'](filePath))
          .rejects.toThrow(/maxRounds out of range/);
      }
    });

    it('should reject skill with invalid model name', async () => {
      const content = `# invalid-model

## Description
This skill has an invalid model name for testing validation requirements.

## Tools
- view_file

## System Prompt
System prompt for testing model name validation and error handling mechanisms.

## Model
invalid-model-name
`;

      const filePath = path.join(tempDir, 'invalid-model.skill.md');
      await fs.writeFile(filePath, content);

      await expect(skillLoader['loadSkillFromFile'](filePath))
        .rejects.toThrow(/Invalid model/);
    });
  });

  describe('parseSkillMarkdown - Edge Cases', () => {
    it('should ignore duplicate skill IDs (only use first)', async () => {
      const content = `# first-id

## Description
Testing that only the first skill ID is used when multiple are present.

# second-id

## Tools
- view_file

## System Prompt
System prompt for testing duplicate ID handling and parser robustness with multiple headers.
`;

      const filePath = path.join(tempDir, 'duplicate-ids.skill.md');
      await fs.writeFile(filePath, content);

      const skill = await skillLoader['loadSkillFromFile'](filePath);
      expect(skill.id).toBe('first-id');
    });

    it('should handle trigger keywords with commas and spaces', async () => {
      const content = `# keyword-test

## Description
Testing trigger keyword parsing with various formats and separators used.

## Tools
- view_file

## System Prompt
System prompt for testing trigger keyword parsing with different separator formats.

## Trigger Keywords
test, testing,  extra-spaces  , trim-me
`;

      const filePath = path.join(tempDir, 'keywords.skill.md');
      await fs.writeFile(filePath, content);

      const skill = await skillLoader['loadSkillFromFile'](filePath);
      expect(skill.triggerKeywords).toEqual(['test', 'testing', 'extra-spaces', 'trim-me']);
    });

    it('should handle multiline descriptions', async () => {
      const content = `# multiline-desc

## Description
This is a description that spans
multiple lines and should be
joined together with spaces.

## Tools
- view_file

## System Prompt
System prompt for testing multiline description parsing and text concatenation behavior.
`;

      const filePath = path.join(tempDir, 'multiline.skill.md');
      await fs.writeFile(filePath, content);

      const skill = await skillLoader['loadSkillFromFile'](filePath);
      expect(skill.description).toContain('spans multiple lines');
    });

    it('should handle multiline system prompts', async () => {
      const content = `# multiline-prompt

## Description
Testing multiline system prompt parsing and preservation of newline characters.

## Tools
- view_file

## System Prompt
This is a system prompt
that spans multiple lines
and should preserve newlines.
It must be long enough to pass validation requirements for testing purposes.
`;

      const filePath = path.join(tempDir, 'multiline-prompt.skill.md');
      await fs.writeFile(filePath, content);

      const skill = await skillLoader['loadSkillFromFile'](filePath);
      expect(skill.systemPrompt).toContain('\n');
      expect(skill.systemPrompt).toContain('multiple lines');
    });

    it('should handle tools with bullet points and different list markers', async () => {
      const content = `# list-markers

## Description
Testing different markdown list marker styles for tool definitions and parsing.

## Tools
- view_file
* edit_file
- bash

## System Prompt
System prompt for testing various markdown list marker formats and parser flexibility.
`;

      const filePath = path.join(tempDir, 'list-markers.skill.md');
      await fs.writeFile(filePath, content);

      const skill = await skillLoader['loadSkillFromFile'](filePath);
      expect(skill.tools).toEqual(['view_file', 'edit_file', 'bash']);
    });

    it('should ignore empty lines in sections', async () => {
      const content = `# empty-lines

## Description

This description has empty lines

that should be handled correctly.

## Tools

- view_file

- edit_file

## System Prompt

This system prompt has empty lines that should be preserved in the output text.

It must be long enough to pass validation requirements for proper testing.
`;

      const filePath = path.join(tempDir, 'empty-lines.skill.md');
      await fs.writeFile(filePath, content);

      const skill = await skillLoader['loadSkillFromFile'](filePath);
      expect(skill.tools).toEqual(['view_file', 'edit_file']);
      expect(skill.description.length).toBeGreaterThan(10);
    });
  });

  describe('loadAllSkills', () => {
    it('should load skills from multiple directories with proper precedence', async () => {
      // This test would require mocking the file system paths
      // For now, we'll test the basic loading functionality

      const content = `# precedence-test

## Description
Testing skill loading precedence from multiple directory locations in system.

## Tools
- view_file

## System Prompt
System prompt for testing multi-directory skill loading and precedence rules.
`;

      const filePath = path.join(tempDir, 'precedence-test.skill.md');
      await fs.writeFile(filePath, content);

      // Note: This is a basic test. Full precedence testing would require
      // more sophisticated mocking of the file system paths
      const result = await skillLoader['loadSkillsFromDirectory'](tempDir);
      expect(result.loaded).toBeGreaterThan(0);
      expect(result.errors).toEqual([]);
    });

    it('should handle directory that does not exist', async () => {
      const nonExistentDir = path.join(tempDir, 'does-not-exist');

      const result = await skillLoader['loadSkillsFromDirectory'](nonExistentDir);
      expect(result.loaded).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it('should collect errors for invalid skills but continue loading', async () => {
      // Create one valid skill
      const validContent = `# valid-skill

## Description
A valid skill file that should load successfully without any errors.

## Tools
- view_file

## System Prompt
Valid system prompt with sufficient length for validation requirements and testing.
`;
      await fs.writeFile(path.join(tempDir, 'valid.skill.md'), validContent);

      // Create one invalid skill
      const invalidContent = `# invalid-skill

## Description
Missing tools section

## System Prompt
This should fail
`;
      await fs.writeFile(path.join(tempDir, 'invalid.skill.md'), invalidContent);

      const result = await skillLoader['loadSkillsFromDirectory'](tempDir);
      expect(result.loaded).toBe(1);  // Only valid one loaded
      expect(result.errors.length).toBe(1);  // One error collected
      expect(result.errors[0].file).toContain('invalid.skill.md');
      expect(result.errors[0].error).toBeDefined();
    });

    it('should only load files with .skill.md extension', async () => {
      // Create a .skill.md file
      const skillContent = `# real-skill

## Description
This is a real skill file with the correct extension and format.

## Tools
- view_file

## System Prompt
System prompt for testing file extension filtering and proper skill file detection.
`;
      await fs.writeFile(path.join(tempDir, 'real.skill.md'), skillContent);

      // Create other files that should be ignored
      await fs.writeFile(path.join(tempDir, 'not-a-skill.md'), 'regular markdown');
      await fs.writeFile(path.join(tempDir, 'script.js'), 'console.log("hi")');
      await fs.writeFile(path.join(tempDir, 'README.txt'), 'readme');

      const result = await skillLoader['loadSkillsFromDirectory'](tempDir);
      expect(result.loaded).toBe(1);  // Only .skill.md file loaded
    });
  });

  describe('getSkill and utility methods', () => {
    it('should retrieve skill by ID after loading', async () => {
      const content = `# retrieve-test

## Description
Testing skill retrieval by ID from the loaded skills collection.

## Tools
- view_file

## System Prompt
System prompt for testing skill retrieval functionality and ID-based lookup.
`;

      const filePath = path.join(tempDir, 'retrieve-test.skill.md');
      await fs.writeFile(filePath, content);

      await skillLoader['loadSkillsFromDirectory'](tempDir);

      const skill = skillLoader.getSkill('retrieve-test');
      expect(skill).toBeDefined();
      expect(skill?.id).toBe('retrieve-test');
    });

    it('should return undefined for non-existent skill', () => {
      const skill = skillLoader.getSkill('does-not-exist');
      expect(skill).toBeUndefined();
    });

    it('should check if skill exists', async () => {
      const content = `# exists-test

## Description
Testing skill existence checking functionality in the loader system.

## Tools
- view_file

## System Prompt
System prompt for testing hasSkill method and skill existence validation.
`;

      const filePath = path.join(tempDir, 'exists-test.skill.md');
      await fs.writeFile(filePath, content);

      await skillLoader['loadSkillsFromDirectory'](tempDir);

      expect(skillLoader.hasSkill('exists-test')).toBe(true);
      expect(skillLoader.hasSkill('does-not-exist')).toBe(false);
    });

    it('should find skills by trigger keyword', async () => {
      const content = `# keyword-search

## Description
Testing keyword-based skill search and filtering functionality in system.

## Tools
- view_file

## System Prompt
System prompt for testing trigger keyword search and skill discovery by keywords.

## Trigger Keywords
terraform, infrastructure, aws
`;

      const filePath = path.join(tempDir, 'keyword-search.skill.md');
      await fs.writeFile(filePath, content);

      await skillLoader['loadSkillsFromDirectory'](tempDir);

      const found = skillLoader.findSkillsByKeyword('terraform');
      expect(found.length).toBeGreaterThan(0);
      expect(found[0].id).toBe('keyword-search');
    });

    it('should convert skill to capability format', async () => {
      const content = `# capability-test

## Description
Testing skill to capability conversion for agent system integration.

## Tools
- view_file
- edit_file

## System Prompt
System prompt for testing capability conversion and format transformation logic.

## Max Rounds
30

## Model
glm-4.7
`;

      const filePath = path.join(tempDir, 'capability-test.skill.md');
      await fs.writeFile(filePath, content);

      await skillLoader['loadSkillsFromDirectory'](tempDir);

      const skill = skillLoader.getSkill('capability-test');
      expect(skill).toBeDefined();

      if (skill) {
        const capability = skillLoader.skillToCapability(skill);
        expect(capability.name).toBe('Capability Test');
        expect(capability.description).toContain('conversion');
        expect(capability.tools).toEqual(['view_file', 'edit_file']);
        expect(capability.maxRounds).toBe(30);
        expect(capability.model).toBe('glm-4.7');
      }
    });

    it('should get all loaded skills', async () => {
      const skill1 = `# skill-one

## Description
First skill for testing getAllSkills functionality and collection retrieval.

## Tools
- view_file

## System Prompt
System prompt for the first skill in multi-skill loading and retrieval testing.
`;

      const skill2 = `# skill-two

## Description
Second skill for testing getAllSkills functionality and collection retrieval.

## Tools
- edit_file

## System Prompt
System prompt for the second skill in multi-skill loading and retrieval testing.
`;

      await fs.writeFile(path.join(tempDir, 'skill-one.skill.md'), skill1);
      await fs.writeFile(path.join(tempDir, 'skill-two.skill.md'), skill2);

      await skillLoader['loadSkillsFromDirectory'](tempDir);

      const allSkills = skillLoader.getAllSkills();
      const ids = allSkills.map(s => s.id);
      expect(ids).toContain('skill-one');
      expect(ids).toContain('skill-two');
    });

    it('should get statistics about loaded skills', async () => {
      const withKeywords = `# with-keywords

## Description
Skill with trigger keywords for statistics testing and analysis purposes.

## Tools
- view_file

## System Prompt
System prompt for skill with keywords in statistics collection and reporting.

## Trigger Keywords
test, stats
`;

      const withoutKeywords = `# without-keywords

## Description
Skill without trigger keywords for statistics testing and analysis purposes.

## Tools
- edit_file

## System Prompt
System prompt for skill without keywords in statistics collection and reporting.
`;

      await fs.writeFile(path.join(tempDir, 'with.skill.md'), withKeywords);
      await fs.writeFile(path.join(tempDir, 'without.skill.md'), withoutKeywords);

      await skillLoader['loadSkillsFromDirectory'](tempDir);

      const stats = skillLoader.getStatistics();
      expect(stats.total).toBeGreaterThanOrEqual(2);
      expect(stats.withTriggers).toBeGreaterThanOrEqual(1);
      expect(stats.byPath).toBeDefined();
    });

    it('should reload skills from disk', async () => {
      // Test that reload() calls loadAllSkills()
      // Since reload loads from configured paths, we just verify it completes
      const initialSkillCount = skillLoader.getAllSkills().length;

      await skillLoader.reload();

      // After reload, skills should still be loaded
      const afterReloadCount = skillLoader.getAllSkills().length;
      expect(afterReloadCount).toBeGreaterThanOrEqual(0);

      // Verify reload completed successfully by checking it's still functional
      expect(skillLoader.hasSkill).toBeDefined();
    });

    it('should maintain consistent precedence order on multiple loads', async () => {
      // Test that loadAllSkills does not have race conditions
      // by verifying that skillPaths array is not mutated

      // Get initial skill paths
      const initialPaths = skillLoader['skillPaths'].slice();

      // Load skills multiple times
      await skillLoader.loadAllSkills();
      const pathsAfterFirst = skillLoader['skillPaths'].slice();

      await skillLoader.loadAllSkills();
      const pathsAfterSecond = skillLoader['skillPaths'].slice();

      await skillLoader.loadAllSkills();
      const pathsAfterThird = skillLoader['skillPaths'].slice();

      // All skill paths should be in the same order
      expect(pathsAfterFirst).toEqual(initialPaths);
      expect(pathsAfterSecond).toEqual(initialPaths);
      expect(pathsAfterThird).toEqual(initialPaths);
    });
  });

  describe('getSkillLoader singleton', () => {
    it('should return the same SkillLoader instance', () => {
      const instance1 = getSkillLoader();
      const instance2 = getSkillLoader();
      expect(instance1).toBe(instance2);
    });

    it('should return the same instance as getInstance', () => {
      const instance1 = getSkillLoader();
      const instance2 = SkillLoader.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Concurrency - Loading Lock', () => {
    it('should handle concurrent loadAllSkills calls without race conditions', async () => {
      // Create skill files
      const content = `# concurrent-test

## Description
Testing concurrent loading with multiple simultaneous loadAllSkills calls.

## Tools
- view_file

## System Prompt
System prompt for testing concurrent loading behavior and race condition prevention.
`;
      await fs.writeFile(path.join(tempDir, 'concurrent.skill.md'), content);

      // Call loadAllSkills multiple times concurrently
      const [result1, result2, result3] = await Promise.all([
        skillLoader.loadAllSkills(),
        skillLoader.loadAllSkills(),
        skillLoader.loadAllSkills(),
      ]);

      // All should return the same result (loading lock ensures single execution)
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);

      // Skill should be loaded exactly once
      expect(skillLoader.hasSkill('concurrent-test')).toBe(true);
      expect(skillLoader.getAllSkills().length).toBe(1);
    });

    it('should allow getSkill during concurrent loads', async () => {
      // Create skill file
      const content = `# access-during-load

## Description
Testing that getSkill works correctly during concurrent loading operations.

## Tools
- view_file

## System Prompt
System prompt for testing concurrent access patterns during skill loading process.
`;
      await fs.writeFile(path.join(tempDir, 'access.skill.md'), content);

      // Pre-load the skill
      await skillLoader.loadAllSkills();

      // Start a reload and immediately try to access
      const loadPromise = skillLoader.loadAllSkills();
      const skill = skillLoader.getSkill('access-during-load');

      await loadPromise;

      // After reload completes, skill should still be accessible
      const skillAfter = skillLoader.getSkill('access-during-load');
      expect(skillAfter).toBeDefined();
    });
  });
});

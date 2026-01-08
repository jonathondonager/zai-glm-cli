import { Command } from 'commander';
import { getSkillLoader } from '../agents/skill-loader.js';
import { getAllAgentTypes, isBuiltInAgent, getAgentCapability } from '../agents/agent-types.js';
import chalk from 'chalk';
import path from 'path';
import os from 'os';
export function createSkillCommand() {
    const skillCommand = new Command('skill');
    skillCommand.description('Manage custom skills (specialized agents)');
    // List skills command
    skillCommand
        .command('list')
        .description('List all available skills (built-in and custom)')
        .option('-c, --custom-only', 'Show only custom skills', false)
        .option('-b, --builtin-only', 'Show only built-in agents', false)
        .action(async (options) => {
        try {
            const skillLoader = getSkillLoader();
            await skillLoader.loadAllSkills();
            const allTypes = await getAllAgentTypes();
            if (allTypes.length === 0) {
                console.log(chalk.yellow('No skills available'));
                return;
            }
            const builtIn = [];
            const custom = [];
            for (const type of allTypes) {
                if (isBuiltInAgent(type)) {
                    builtIn.push(type);
                }
                else {
                    custom.push(type);
                }
            }
            // Display built-in agents
            if (!options.customOnly && builtIn.length > 0) {
                console.log(chalk.bold('Built-in Agents:'));
                console.log();
                for (const type of builtIn) {
                    const capability = await getAgentCapability(type);
                    if (capability) {
                        console.log(`${chalk.cyan(type)}`);
                        console.log(`  ${capability.description}`);
                        console.log(`  Tools: ${chalk.dim(capability.tools.join(', '))}`);
                        console.log();
                    }
                }
            }
            // Display custom skills
            if (!options.builtinOnly && custom.length > 0) {
                console.log(chalk.bold('Custom Skills:'));
                console.log();
                for (const type of custom) {
                    const skill = skillLoader.getSkill(type);
                    if (skill) {
                        console.log(`${chalk.green(type)} ${chalk.dim(`(${skill.name})`)}`);
                        console.log(`  ${skill.description}`);
                        console.log(`  Tools: ${chalk.dim(skill.tools.join(', '))}`);
                        if (skill.triggerKeywords && skill.triggerKeywords.length > 0) {
                            console.log(`  Triggers: ${chalk.yellow(skill.triggerKeywords.join(', '))}`);
                        }
                        if (skill.model) {
                            console.log(`  Preferred Model: ${chalk.blue(skill.model)}`);
                        }
                        console.log(`  Source: ${chalk.dim(skill.filePath)}`);
                        console.log();
                    }
                }
            }
            // Summary
            const stats = skillLoader.getStatistics();
            console.log(chalk.bold('Summary:'));
            console.log(`  Built-in agents: ${builtIn.length}`);
            console.log(`  Custom skills: ${custom.length}`);
            console.log(`  Total: ${allTypes.length}`);
            console.log(`  Skills with triggers: ${stats.withTriggers}`);
        }
        catch (error) {
            console.error(chalk.red(`Error listing skills: ${error.message}`));
            process.exit(1);
        }
    });
    // Show skill details command
    skillCommand
        .command('show <skill-id>')
        .description('Show detailed information about a skill')
        .action(async (skillId) => {
        try {
            const skillLoader = getSkillLoader();
            await skillLoader.loadAllSkills();
            const capability = await getAgentCapability(skillId);
            if (!capability) {
                console.error(chalk.red(`Skill not found: ${skillId}`));
                process.exit(1);
            }
            const builtIn = isBuiltInAgent(skillId);
            const skill = builtIn ? null : skillLoader.getSkill(skillId);
            console.log(chalk.bold(`Skill: ${skillId}`));
            console.log();
            console.log(chalk.bold('Type:'), builtIn ? chalk.cyan('Built-in Agent') : chalk.green('Custom Skill'));
            console.log(chalk.bold('Name:'), capability.name);
            console.log(chalk.bold('Description:'), capability.description);
            console.log();
            console.log(chalk.bold('Available Tools:'));
            for (const tool of capability.tools) {
                console.log(`  - ${tool}`);
            }
            console.log();
            if (capability.maxRounds) {
                console.log(chalk.bold('Max Rounds:'), capability.maxRounds);
            }
            if (capability.model) {
                console.log(chalk.bold('Preferred Model:'), capability.model);
            }
            if (skill) {
                if (skill.triggerKeywords && skill.triggerKeywords.length > 0) {
                    console.log();
                    console.log(chalk.bold('Trigger Keywords:'));
                    console.log(`  ${skill.triggerKeywords.join(', ')}`);
                }
                console.log();
                console.log(chalk.bold('Source File:'));
                console.log(`  ${skill.filePath}`);
            }
            console.log();
            console.log(chalk.bold('System Prompt:'));
            console.log(chalk.dim('─'.repeat(60)));
            console.log(capability.systemPrompt);
            console.log(chalk.dim('─'.repeat(60)));
        }
        catch (error) {
            console.error(chalk.red(`Error showing skill: ${error.message}`));
            process.exit(1);
        }
    });
    // Reload skills command
    skillCommand
        .command('reload')
        .description('Reload skills from disk')
        .action(async () => {
        try {
            const skillLoader = getSkillLoader();
            await skillLoader.reload();
            const stats = skillLoader.getStatistics();
            console.log(chalk.green(`✓ Skills reloaded successfully`));
            console.log(`  Total custom skills: ${stats.total}`);
            console.log(`  Skills with triggers: ${stats.withTriggers}`);
            if (Object.keys(stats.byPath).length > 0) {
                console.log();
                console.log(chalk.bold('Skills by path:'));
                for (const [path, count] of Object.entries(stats.byPath)) {
                    console.log(`  ${path}: ${count} skill(s)`);
                }
            }
        }
        catch (error) {
            console.error(chalk.red(`Error reloading skills: ${error.message}`));
            process.exit(1);
        }
    });
    // Show skill paths command
    skillCommand
        .command('paths')
        .description('Show skill search paths')
        .action(() => {
        const paths = [
            path.join(process.cwd(), '.zai', 'skills'),
            path.join(os.homedir(), '.zai', 'skills'),
            path.join(process.cwd(), 'skills'),
        ];
        console.log(chalk.bold('Skill Search Paths (in order of precedence):'));
        console.log();
        paths.forEach((p, index) => {
            const label = index === 0 ? 'Project-local' : index === 1 ? 'User global' : 'Built-in';
            console.log(`${index + 1}. ${chalk.cyan(label)}`);
            console.log(`   ${p}`);
            console.log();
        });
        console.log(chalk.dim('Skills in higher precedence paths override those in lower paths.'));
        console.log();
        console.log(chalk.bold('To create a custom skill:'));
        console.log(`  1. Create a file: ${chalk.cyan('<skill-name>.skill.md')}`);
        console.log(`  2. Place it in one of the search paths above`);
        console.log(`  3. Run: ${chalk.cyan('zai skill reload')}`);
        console.log();
        console.log(`See the skill format documentation at:`);
        console.log(`  ${path.join(process.cwd(), 'skills', 'SKILL_FORMAT.md')}`);
    });
    // Create skill template command
    skillCommand
        .command('create <skill-id>')
        .description('Create a new skill template file')
        .option('-d, --dir <directory>', 'Directory to create the skill file (default: .zai/skills)', '.zai/skills')
        .action(async (skillId, options) => {
        try {
            const fs = await import('fs/promises');
            const targetDir = path.resolve(process.cwd(), options.dir);
            const skillFile = path.join(targetDir, `${skillId}.skill.md`);
            // Check if file already exists
            try {
                await fs.access(skillFile);
                console.error(chalk.red(`Skill file already exists: ${skillFile}`));
                process.exit(1);
            }
            catch {
                // File doesn't exist, continue
            }
            // Create directory if it doesn't exist
            await fs.mkdir(targetDir, { recursive: true });
            // Create skill template
            const template = `# ${skillId}

## Description
Brief description of what this skill does (1-2 sentences).

## Tools
- view_file
- edit_file
- str_replace
- bash
- search

## System Prompt
You are a specialized assistant with expertise in [domain].

**Core Competencies:**
- [Competency 1]
- [Competency 2]
- [Competency 3]

**When Working on Tasks:**

1. **[Phase 1 Name]:**
   - [Guidance point 1]
   - [Guidance point 2]

2. **[Phase 2 Name]:**
   - [Guidance point 1]
   - [Guidance point 2]

**Best Practices:**
- [Best practice 1]
- [Best practice 2]
- [Best practice 3]

**Approach:**
- [Approach guideline 1]
- [Approach guideline 2]

Be thorough, methodical, and always explain your reasoning.

## Trigger Keywords
keyword1, keyword2, keyword3

## Max Rounds
30

## Model
glm-4.7
`;
            await fs.writeFile(skillFile, template, 'utf-8');
            console.log(chalk.green(`✓ Created skill template: ${skillFile}`));
            console.log();
            console.log(chalk.bold('Next steps:'));
            console.log(`  1. Edit the file to customize your skill`);
            console.log(`  2. Run: ${chalk.cyan('zai skill reload')}`);
            console.log(`  3. Test: ${chalk.cyan(`zai skill show ${skillId}`)}`);
            console.log();
            console.log(`See ${chalk.cyan('skills/SKILL_FORMAT.md')} for detailed format documentation.`);
        }
        catch (error) {
            console.error(chalk.red(`Error creating skill template: ${error.message}`));
            process.exit(1);
        }
    });
    return skillCommand;
}
//# sourceMappingURL=skill.js.map
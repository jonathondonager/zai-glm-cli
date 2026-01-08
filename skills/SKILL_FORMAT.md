# Skill Definition Format

Skills are specialized agents defined in markdown files. Each skill file follows this structured format:

## File Structure

```markdown
# skill-id

## Description
Brief description of what this skill does (1-2 sentences).

## Tools
- tool_name_1
- tool_name_2
- tool_name_3

## System Prompt
The detailed system prompt that defines the agent's behavior, expertise, and approach.
This can be multiple paragraphs and should include:
- What the agent specializes in
- How it should approach tasks
- Best practices to follow
- What to focus on

## Trigger Keywords (optional)
keyword1, keyword2, keyword3

## Max Rounds (optional)
30

## Model (optional)
glm-4.7
```

## Field Definitions

### `# skill-id` (Required)
- The skill identifier (kebab-case recommended)
- Used to invoke the skill: `/task skill-id "do something"`
- Must be unique across all skills

### `## Description` (Required)
- Short description of the skill's purpose
- Displayed when listing available skills
- Should be 1-2 sentences

### `## Tools` (Required)
- List of tools this skill has access to
- Each tool on its own line with a `-` prefix
- Available tools:
  - `view_file` - Read file contents
  - `edit_file` - Interactive file editing
  - `str_replace` - String replacement in files
  - `bash` - Execute bash commands
  - `search` - Search codebase with ripgrep
  - `batch_edit` - Multi-file edits
  - `web_search` - Web search capability

### `## System Prompt` (Required)
- The core prompt that defines the agent's behavior
- Can be multiple paragraphs
- Should include:
  - Domain expertise description
  - Approach to problem-solving
  - Best practices to follow
  - What to prioritize

### `## Trigger Keywords` (Optional)
- Comma-separated list of keywords
- Used for auto-spawning the skill when user mentions these terms
- Case-insensitive matching

### `## Max Rounds` (Optional)
- Maximum conversation rounds for this skill
- Defaults to 30 if not specified
- Range: 10-50

### `## Model` (Optional)
- Preferred model for this skill
- Options: `glm-4.7`, `glm-4.6`, `glm-4.5`, `glm-4.5-air`
- Defaults to parent agent's model if not specified

## Example

See `terraform-specialist.skill.md` and `aws-infrastructure-planner.skill.md` for complete examples.

## File Naming Convention

- Use `.skill.md` extension
- Filename should match the skill-id
- Example: `terraform-specialist.skill.md`

## Loading Skills

Skills are loaded from:
1. Built-in skills: `skills/` directory in the CLI installation
2. User global skills: `~/.zai/skills/`
3. Project-local skills: `.zai/skills/` in your project

Skills in directories with higher precedence override those with the same skill-id in lower precedence directories.

# Custom Skills for ZAI CLI

Custom skills allow you to extend ZAI CLI with specialized agents tailored to specific domains or tasks. Skills are defined using a simple markdown format and can be loaded from multiple locations.

## What are Skills?

Skills are specialized AI agents with:
- **Domain expertise** - Focused knowledge in a specific area (e.g., Terraform, AWS, SQL)
- **Custom tools** - Selected subset of available tools
- **Specialized prompts** - Tailored system prompts for specific workflows
- **Trigger keywords** - Auto-spawn based on user queries

## Quick Start

### 1. View Available Skills

```bash
# List all skills (built-in + custom)
zai skill list

# Show details of a specific skill
zai skill show terraform-specialist
```

### 2. Create a Custom Skill

```bash
# Create a skill template
zai skill create my-sql-expert

# Edit the generated file
code .zai/skills/my-sql-expert.skill.md

# Reload skills to activate
zai skill reload
```

### 3. Use a Skill

```bash
# Start ZAI and use /task command
zai

# In the interactive session:
/task terraform-specialist "review my terraform configs for best practices"
/task aws-infrastructure-planner "design a highly available web application architecture"
```

## Skill Locations

Skills are loaded from three locations (in order of precedence):

1. **Project-local** - `.zai/skills/` (highest priority)
   - Project-specific skills
   - Override built-in or global skills

2. **User global** - `~/.zai/skills/`
   - Personal skills shared across projects
   - Available in all your projects

3. **Built-in** - `skills/` (in CLI installation)
   - Shipped with ZAI CLI
   - Example skills and templates

## Included Skills

### Terraform Specialist
**ID:** `terraform-specialist`

Expert in Infrastructure as Code with Terraform:
- Writing and refactoring `.tf` files
- Module development and organization
- State management and troubleshooting
- Provider configuration (AWS, Azure, GCP, etc.)
- Best practices and security

**Trigger keywords:** terraform, tf, infrastructure as code, iac, hcl

**Usage:**
```bash
zai
> /task terraform-specialist "create a module for an AWS VPC with public and private subnets"
```

### AWS Infrastructure Planner
**ID:** `aws-infrastructure-planner`

AWS cloud architect for infrastructure design:
- Service selection and architecture design
- Multi-tier application architectures
- Cost optimization and estimation
- High availability and disaster recovery
- Security best practices
- Migration planning

**Trigger keywords:** aws, cloud architecture, vpc, ec2, lambda, infrastructure planning

**Usage:**
```bash
zai
> /task aws-infrastructure-planner "design a serverless API backend with DynamoDB"
```

## Skill Format

Skills are defined using markdown files with a specific structure:

```markdown
# skill-id

## Description
Brief description (1-2 sentences)

## Tools
- view_file
- edit_file
- bash
- search

## System Prompt
Detailed system prompt with:
- Domain expertise
- Best practices
- Approach guidelines
- Common workflows

## Trigger Keywords (optional)
keyword1, keyword2, keyword3

## Max Rounds (optional)
30

## Model (optional)
glm-4.7
```

See `SKILL_FORMAT.md` for complete specification.

## Creating Custom Skills

### Example: Python Testing Expert

```markdown
# python-test-expert

## Description
Python testing specialist focusing on pytest, unittest, and test coverage optimization.

## Tools
- view_file
- edit_file
- str_replace
- bash
- search

## System Prompt
You are a Python testing expert specializing in pytest and test automation.

**Core Competencies:**
- Writing comprehensive pytest test suites
- Mocking and fixtures
- Test coverage analysis and improvement
- Integration and unit test design
- CI/CD test pipeline configuration

**When Writing Tests:**
1. Analyze existing code structure
2. Identify edge cases and error conditions
3. Use appropriate fixtures and parametrization
4. Ensure tests are isolated and repeatable
5. Run tests and verify coverage

**Best Practices:**
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Mock external dependencies
- Aim for high coverage but focus on critical paths
- Keep tests fast and maintainable

## Trigger Keywords
pytest, python test, unit test, test coverage, mock

## Max Rounds
40

## Model
glm-4.7
```

Save as `.zai/skills/python-test-expert.skill.md` and run `zai skill reload`.

## CLI Commands

```bash
# List all skills
zai skill list

# Show only custom skills
zai skill list --custom-only

# Show only built-in agents
zai skill list --builtin-only

# Show detailed information about a skill
zai skill show terraform-specialist

# Reload skills from disk
zai skill reload

# Show skill search paths
zai skill paths

# Create a new skill template
zai skill create my-custom-skill
zai skill create my-custom-skill --dir ~/.zai/skills
```

## Best Practices

### 1. Focused Domain Expertise
Make skills highly specialized rather than general-purpose:
- ✅ `terraform-specialist` - Narrow, focused domain
- ❌ `devops-expert` - Too broad

### 2. Clear Tool Selection
Only include tools the skill actually needs:
- Infrastructure planning: `view_file`, `search`, `web_search`
- Code modification: `view_file`, `edit_file`, `str_replace`, `batch_edit`
- Debugging: `view_file`, `bash`, `search`

### 3. Detailed System Prompts
Provide comprehensive guidance:
- What the agent specializes in
- Step-by-step approach
- Best practices and pitfalls
- Common workflows
- Examples when helpful

### 4. Meaningful Trigger Keywords
Use terms users naturally mention:
- Technical terms: `terraform`, `kubernetes`, `postgresql`
- Task descriptions: `infrastructure planning`, `api design`
- Tools and technologies: `aws`, `docker`, `react`

### 5. Appropriate Max Rounds
Consider task complexity:
- Simple tasks: 15-20 rounds
- Medium tasks: 30-40 rounds
- Complex tasks: 50 rounds

## Skill vs Built-in Agent

Use a custom skill when:
- You need domain-specific expertise repeatedly
- The domain has specific best practices and patterns
- You want consistent behavior across tasks
- You want to share expertise across team/projects

Use built-in agents when:
- Task is general-purpose
- One-off or ad-hoc task
- No specialized domain knowledge needed

## Troubleshooting

### Skill not loading

```bash
# Check skill search paths
zai skill paths

# Verify file exists in one of the paths
ls -la .zai/skills/
ls -la ~/.zai/skills/

# Check syntax by viewing the skill
zai skill show my-skill-id

# Reload skills
zai skill reload
```

### Skill not found when using /task

```bash
# List available skills to get correct ID
zai skill list

# Use exact skill ID (case-sensitive)
/task terraform-specialist "..."  # ✅
/task Terraform-Specialist "..."  # ❌
```

### Skill file syntax error

Check that your `.skill.md` file has:
- `# skill-id` as first heading (single `#`)
- `## Description`, `## Tools`, `## System Prompt` sections (double `##`)
- Tool names match available tools
- Valid markdown format

```bash
# View skill details to see if it parsed correctly
zai skill show my-skill-id
```

## Advanced Usage

### Project-Specific Skills

Create `.zai/skills/` in your project for domain-specific needs:

```bash
# In a web project
.zai/skills/
  ├── api-designer.skill.md
  ├── db-schema-expert.skill.md
  └── frontend-optimizer.skill.md
```

### Overriding Built-in Skills

Place a skill with the same ID in a higher-precedence location:

```bash
# Override built-in terraform-specialist
~/.zai/skills/terraform-specialist.skill.md  # Your customized version
```

### Sharing Skills

Share skill files with your team via git:

```bash
# Commit project skills
git add .zai/skills/
git commit -m "Add custom project skills"
```

## Examples

### Infrastructure as Code Review

```bash
zai
> /task terraform-specialist "review all terraform files and suggest improvements for security and cost optimization"
```

### AWS Architecture Design

```bash
zai
> /task aws-infrastructure-planner "I need to design infrastructure for a SaaS application with 100k users. Requirements: high availability, auto-scaling, cost-effective, secure. Provide architecture diagram and service recommendations."
```

### Custom Skill Usage

```bash
# After creating a kubernetes-expert skill
zai
> /task kubernetes-expert "help me debug this pod that keeps crashing"
```

## Resources

- **Format Specification**: `SKILL_FORMAT.md`
- **Example Skills**: `terraform-specialist.skill.md`, `aws-infrastructure-planner.skill.md`
- **CLI Help**: `zai skill --help`

## Contributing

Have a great skill to share? Consider:
1. Creating well-documented skill files
2. Sharing with the community
3. Contributing to the built-in skills collection

---

**Happy skill building! 🚀**

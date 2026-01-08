# Agent Orchestration System

The ZAI CLI includes a powerful agent orchestration system that allows the main agent to spawn and manage specialized sub-agents for complex tasks.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Main Agent (GLM)                        │
│  - Receives user request                                     │
│  - Decides when to delegate to specialized agents            │
│  - Has access to Task tool                                   │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ Uses Task Tool
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                   Task Orchestrator                          │
│  - Manages agent lifecycle                                   │
│  - Creates isolated sub-agent contexts                       │
│  - Tracks task execution and results                         │
│  - Supports parallel execution (max 3 concurrent)            │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ Spawns
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              Specialized Sub-Agents                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Code Reviewer│  │ Test Writer  │  │ Terraform    │      │
│  │              │  │              │  │ Specialist   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  Each has:                                                   │
│  - Specialized system prompt from skill file                 │
│  - Selected subset of tools                                  │
│  - Independent context (doesn't pollute main agent)          │
│  - Configurable max rounds                                   │
└─────────────────────────────────────────────────────────────┘
```

## How It Works

### 1. Main Agent Delegation

The main agent has access to a **Task tool** that allows it to delegate work:

```javascript
// Main agent decides to delegate
{
  "tool": "task",
  "parameters": {
    "agent_type": "code-reviewer",
    "task_description": "Review the authentication module for security issues",
    "thoroughness": "thorough"
  }
}
```

### 2. Sub-Agent Creation

The **TaskOrchestrator**:
1. Loads the skill definition from the skill system
2. Creates a new isolated ZaiAgent instance
3. Applies the specialized system prompt
4. Restricts available tools based on skill definition
5. Executes the task with the sub-agent

### 3. Context Isolation

**Key benefit**: Sub-agents run in isolated contexts:
- Main agent's conversation history is NOT passed to sub-agents
- Sub-agent's detailed work doesn't pollute main context
- Only the summarized result returns to main agent
- Each sub-agent starts fresh with only the task description

### 4. Result Summarization

When a sub-agent completes:
- The full output is summarized
- Only relevant findings return to main agent
- Main agent receives:
  - Success/failure status
  - Summary of what was done
  - Key findings or recommendations
  - Metadata (duration, tools used, etc.)

## Available Agents/Skills

### Built-in Agents (Always Available)

1. **general-purpose** - Versatile coding tasks
2. **code-reviewer** - Code quality and security review
3. **test-writer** - Comprehensive test creation
4. **documentation** - Technical documentation
5. **refactoring** - Code restructuring
6. **debugging** - Bug diagnosis and fixing
7. **security-audit** - Security vulnerability scanning
8. **performance-optimizer** - Performance analysis
9. **explore** - Codebase exploration
10. **plan** - Implementation planning

### Infrastructure Specialists

11. **terraform-specialist** - Terraform IaC expert
12. **aws-infrastructure-planner** - AWS architecture design

### Custom Skills

Users can add custom skills by creating `.skill.md` files in:
- `.zai/skills/` (project-local)
- `~/.zai/skills/` (user global)
- `skills/` (CLI built-in)

## Usage Examples

### Example 1: Security Review Workflow

```
User: "I need to review my application for security issues"

Main Agent decides to delegate:
  ↓
Task Tool: agent_type="security-audit"
  ↓
TaskOrchestrator creates security-audit sub-agent
  ↓
Sub-agent:
  - Reads code files
  - Searches for vulnerability patterns
  - Checks dependencies
  - Tests for common issues
  ↓
Returns summary to main agent:
  "Found 3 critical issues:
   1. SQL injection vulnerability in user.js:45
   2. Hardcoded API key in config.js:12
   3. Missing input validation in api/users.js

   Recommend immediate remediation."
  ↓
Main agent presents findings to user
```

### Example 2: Multi-Agent Workflow

```
User: "Add a new API endpoint for user registration with tests"

Main Agent orchestrates:
  ↓
1. Uses 'plan' agent
   → Creates implementation plan
   ↓
2. Uses 'general-purpose' agent
   → Implements the endpoint
   ↓
3. Uses 'test-writer' agent
   → Writes comprehensive tests
   ↓
4. Uses 'security-audit' agent
   → Checks for vulnerabilities
   ↓
Main agent summarizes all work to user
```

### Example 3: Infrastructure Planning

```
User: "Design a scalable AWS architecture for my SaaS app"

Main Agent delegates:
  ↓
Task Tool: agent_type="aws-infrastructure-planner"
  ↓
Sub-agent:
  - Analyzes requirements
  - Designs multi-tier architecture
  - Considers HA and DR
  - Estimates costs
  - Provides terraform recommendations
  ↓
Returns detailed architecture plan
  ↓
Main agent can then delegate to 'terraform-specialist'
to implement the infrastructure as code
```

## Configuration Options

### Thoroughness Levels

Control how comprehensive the sub-agent's work should be:

- **quick** - Fast, high-level analysis (2-3 key points)
- **medium** - Balanced coverage (default)
- **thorough** - Comprehensive, detailed analysis

```javascript
{
  "agent_type": "code-reviewer",
  "task_description": "Review auth module",
  "thoroughness": "thorough"  // More detailed review
}
```

### Max Rounds

Each skill defines a `maxRounds` limit:
- Prevents infinite loops
- Ensures sub-agents complete work efficiently
- Can be customized per skill

Example from terraform-specialist.skill.md:
```markdown
## Max Rounds
50
```

### Tool Restrictions

Each skill specifies which tools it can use:

```markdown
## Tools
- view_file
- edit_file
- bash
- search
```

This ensures:
- Security (limited capabilities)
- Focus (only relevant tools)
- Efficiency (no tool exploration)

## Parallel Execution

The TaskOrchestrator supports running multiple agents in parallel:

```javascript
// Maximum 3 concurrent sub-agents
orchestrator.setMaxParallelTasks(3);

// Execute multiple tasks
await orchestrator.executeParallel(
  [taskId1, taskId2, taskId3],
  agent
);
```

**Use case**: Code review of multiple modules simultaneously

## Monitoring and Tracking

### Task Status Tracking

```javascript
const orchestrator = getTaskOrchestrator();

// Get task status
const task = orchestrator.getTask(taskId);
console.log(task.status); // pending | running | completed | failed

// Get statistics
const stats = orchestrator.getStatistics();
console.log(stats);
// {
//   total: 15,
//   completed: 12,
//   failed: 1,
//   running: 2,
//   byType: { 'code-reviewer': 5, 'test-writer': 7, ... }
// }
```

### Agent Activity Logging

Main agent tracks sub-agent activities:

```javascript
// Logged automatically:
// - Agent started
// - Agent running
// - Agent completed (with duration)
// - Agent failed (with error)
```

## Best Practices

### When to Use Sub-Agents

✅ **DO delegate when**:
- Task requires specialized expertise
- Task is self-contained
- Context isolation benefits the workflow
- Task would pollute main agent's context

❌ **DON'T delegate when**:
- Task requires main agent's full context
- Task is trivial or quick
- Coordination overhead > benefit
- Task requires back-and-forth with user

### Skill Selection Guidelines

Choose the right skill for the task:

| Task | Recommended Skill |
|------|------------------|
| Review code quality | code-reviewer |
| Write tests | test-writer |
| Fix a bug | debugging |
| Optimize slow code | performance-optimizer |
| Understand new codebase | explore |
| Plan new feature | plan |
| Create Terraform modules | terraform-specialist |
| Design AWS architecture | aws-infrastructure-planner |

### Task Description Best Practices

**Good task descriptions**:
- Specific about files/scope: "Review authentication in src/auth/"
- Clear objectives: "Find security vulnerabilities"
- Context when needed: "This is a production API with 10k+ users"

**Poor task descriptions**:
- Too vague: "Look at the code"
- No scope: "Review everything"
- Missing context: "Make it better"

## Extending the System

### Creating Custom Skills

1. Create a `.skill.md` file:
```markdown
# kubernetes-expert

## Description
Kubernetes specialist for cluster management and troubleshooting

## Tools
- view_file
- bash
- search

## System Prompt
You are a Kubernetes expert...
[detailed expertise and guidelines]

## Trigger Keywords
kubernetes, k8s, kubectl, pod, deployment

## Max Rounds
30
```

2. Place in skill directory:
```bash
# Project-level
.zai/skills/kubernetes-expert.skill.md

# User-level
~/.zai/skills/kubernetes-expert.skill.md
```

3. Reload skills:
```bash
zai skill reload
```

4. Use in orchestration:
```javascript
{
  "agent_type": "kubernetes-expert",
  "task_description": "Debug pod crash loop"
}
```

## Debugging Orchestration

### View Task History

```bash
# In zai interactive mode
/tasks

# Shows:
# - Task ID
# - Agent type
# - Status
# - Duration
# - Created/completed times
```

### Check Skill Availability

```bash
zai skill list

# Shows all available skills that can be orchestrated
```

### Troubleshooting

**Problem**: Sub-agent fails immediately
- Check if skill exists: `zai skill show <skill-id>`
- Verify skill file syntax
- Check logs for errors

**Problem**: Sub-agent takes too long
- Reduce thoroughness level to "quick" or "medium"
- Adjust maxRounds in skill file
- Simplify task description

**Problem**: Results not useful
- Make task description more specific
- Choose more appropriate skill
- Increase thoroughness level

## Performance Considerations

### Context Size

- Sub-agents don't inherit main context
- Saves tokens and reduces costs
- Faster execution (less context to process)

### Parallel Execution

- Max 3 concurrent sub-agents (configurable)
- Balance between speed and resource usage
- Consider rate limits from API

### Token Budget

- Each sub-agent has independent token usage
- Main agent's budget not affected by sub-agents
- Sub-agents use thoroughness-based round limits

## Security Considerations

### Tool Access Restrictions

Sub-agents only have access to tools specified in their skill:
- Can't execute arbitrary code if bash not listed
- Can't modify files if edit tools not included
- Principle of least privilege

### Context Isolation

- Sub-agents can't access main agent's conversation
- No data leakage between sub-agents
- Each task is independent

### Skill Validation

- Skill files are parsed and validated
- Invalid skills fail to load
- Error messages prevent skill use

## Summary

The ZAI CLI orchestration system provides:

✅ **Delegation** - Main agent can spawn specialized sub-agents
✅ **Isolation** - Sub-agents run in separate contexts
✅ **Specialization** - Each skill has domain expertise
✅ **Flexibility** - Support for custom skills
✅ **Efficiency** - Parallel execution and result summarization
✅ **Control** - Thoroughness levels and tool restrictions
✅ **Extensibility** - Easy to add new skills

This architecture enables complex, multi-step workflows while maintaining efficiency and clarity.

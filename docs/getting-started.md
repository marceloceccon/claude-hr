# Getting Started with Claude HR

Welcome to Claude HR! This guide will help you get up and running with managing your Claude agent teams.

## What is Claude HR?

Claude HR is a CLI tool that helps you organize and manage teams of specialized Claude agents. Instead of trying to remember which agents you need for different projects, you can create teams of agents that work together and activate them as needed.

## Installation

### Prerequisites
- Node.js 16.0.0 or higher
- npm, yarn, or pnpm package manager

### Install Claude HR

```bash
# Using npm
npm install -g claude-hr

# Using yarn
yarn global add claude-hr

# Using pnpm
pnpm add -g claude-hr
```

### Verify Installation

```bash
claude-hr --version
claude-hr --help
```

## Initial Setup

### 1. Initialize Global Configuration

```bash
claude-hr init
```

This will:
- Create the global configuration directory (`~/.claude-hr/`)
- Set up default configuration
- Ask for your preferences (default editor)

### 2. Initialize Your First Workspace

Navigate to your project directory and initialize a workspace:

```bash
cd your-project-directory
claude-hr workspace init
```

This creates workspace-specific configuration in `.claude-hr/workspace.json`.

## Understanding Teams and Agents

### What are Agents?

Agents are specialized Claude assistants with expertise in specific domains:

- **Backend Agents**: C# architects, database experts, API designers
- **Frontend Agents**: React experts, UI designers, accessibility specialists
- **Mobile Agents**: React Native experts, iOS/Android developers
- **DevOps Agents**: Kubernetes experts, AWS architects, CI/CD specialists
- **Testing Agents**: Test automation experts, QA engineers
- **Security Agents**: Security auditors, compliance experts

### What are Teams?

Teams are collections of agents that work well together for specific project types. For example:
- A **web development team** might include a React expert, C# architect, and database expert
- A **mobile team** might include React Native, iOS, and Android specialists

## Your First Team

### Option 1: Use a Template (Recommended)

Claude HR comes with pre-built team templates:

```bash
# List available templates
claude-hr teams list --templates

# Create a team from template
claude-hr teams create my-web-team --template web-development
```

### Option 2: Create a Custom Team

```bash
# Create a team interactively
claude-hr teams create my-custom-team
```

This will prompt you to:
1. Enter a description
2. Select agents from the available list
3. Add tags and metadata

### Activate Your Team

```bash
# Activate locally (for this project only)
claude-hr teams activate my-web-team

# Or activate globally (for all projects)
claude-hr teams activate my-web-team --global
```

## Working with Teams

### View Your Teams

```bash
# List all teams
claude-hr teams list

# Show detailed team information
claude-hr teams show my-web-team

# Check current status
claude-hr status
```

### Managing Team Members

```bash
# Add an agent to a team
claude-hr agents add my-web-team database-expert

# Remove an agent from a team
claude-hr agents remove my-web-team database-expert

# List all available agents
claude-hr agents list
```

### Team Validation

```bash
# Validate a specific team
claude-hr teams validate my-web-team

# Validate all teams
claude-hr teams validate --all
```

## Exploring Agents

### Discover Agents

```bash
# List all agents
claude-hr agents list

# Search for agents
claude-hr agents search "database"

# Filter by role
claude-hr agents list --role backend

# Filter by tag
claude-hr agents list --tag react
```

### Agent Details

```bash
# View detailed agent information
claude-hr agents show csharp-architect

# Validate an agent
claude-hr agents validate react-expert
```

## Workspace Management

### Multiple Projects

Claude HR supports both global and workspace-specific teams:

```bash
# Set a global default team
claude-hr teams activate full-stack --global

# In a specific project, use a different team
cd my-mobile-project
claude-hr workspace init
claude-hr teams activate mobile-development

# The mobile team is now active only for this project
```

### Workspace Configuration

```bash
# View workspace status
claude-hr workspace status

# Reset workspace configuration
claude-hr workspace reset

# Sync workspace with global settings
claude-hr sync
```

## Common Workflows

### Scenario 1: New Web Project

```bash
cd my-new-web-project
claude-hr workspace init --type web-application --framework react
claude-hr teams activate web-development
claude-hr status
```

### Scenario 2: Mobile Project

```bash
cd my-mobile-app
claude-hr workspace init --type mobile-app
claude-hr teams create mobile-team --template mobile-development
claude-hr teams activate mobile-team
```

### Scenario 3: Specialized Project

```bash
cd my-special-project
claude-hr workspace init
claude-hr teams create custom-team
# Select specific agents during interactive creation
claude-hr teams activate custom-team
```

## Configuration Files

### Global Configuration

Located at `~/.claude-hr/config.json`:

```json
{
  "version": "1.0.0",
  "globalTeam": "web-development",
  "defaultEditor": "code",
  "agentsPaths": [
    "~/.claude-hr/agents",
    "./agents"
  ]
}
```

### Workspace Configuration

Located at `.claude-hr/workspace.json` in your project:

```json
{
  "activeTeam": "my-web-team",
  "workspace": {
    "name": "my-project",
    "type": "web-application",
    "framework": "react"
  }
}
```

## Tips and Best Practices

### 1. Start with Templates
Use built-in templates as starting points, then customize as needed.

### 2. Use Global Teams for Consistency
Set up a global team for your most common project type.

### 3. Create Project-Specific Teams
Use workspace-specific teams for specialized projects.

### 4. Validate Regularly
Run `claude-hr teams validate` to ensure your teams are properly configured.

### 5. Document Your Teams
Add descriptive names and tags to make teams easy to find later.

### 6. Share Team Configurations
Use `claude-hr teams export` to share successful team configurations with your team.

## Next Steps

- Read the [Team Management Guide](team-management.md)
- Learn about [Creating Custom Agents](agent-creation.md)
- Explore [Configuration Options](configuration.md)
- Check out [Advanced Examples](examples/)

## Getting Help

```bash
# General help
claude-hr --help

# Command-specific help
claude-hr teams --help
claude-hr agents --help

# Version information
claude-hr --version
```

If you encounter issues or have questions:
- Check the [documentation](../README.md)
- Search [existing issues](https://github.com/marceloceccon/claude-hr/issues)
- Create a [new issue](https://github.com/marceloceccon/claude-hr/issues/new)

Welcome to more organized and efficient Claude development! 🚀
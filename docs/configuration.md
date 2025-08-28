# Configuration Reference

This document provides a comprehensive reference for all Claude HR configuration options.

## Configuration Hierarchy

Claude HR uses a hierarchical configuration system:

1. **Global Configuration** (`~/.claude-hr/config.json`) - applies to all workspaces
2. **Workspace Configuration** (`.claude-hr/workspace.json`) - project-specific settings
3. **Command-line Options** - override other settings for individual commands

## Global Configuration

### File Location
- **macOS/Linux**: `~/.claude-hr/config.json`
- **Windows**: `%USERPROFILE%\.claude-hr\config.json`

### Configuration Schema

```json
{
  "version": "1.0.0",
  "globalTeam": "web-development",
  "defaultEditor": "code",
  "agentsPaths": [
    "~/.claude-hr/agents",
    "./agents"
  ],
  "templatesPaths": [
    "~/.claude-hr/templates"
  ]
}
```

### Configuration Options

#### `version` (string, required)
The configuration format version. Used for migration compatibility.

```json
{
  "version": "1.0.0"
}
```

#### `globalTeam` (string, optional)
The default team to activate when no workspace-specific team is set.

```json
{
  "globalTeam": "web-development"
}
```

Set to `null` to have no global default team.

#### `defaultEditor` (string, optional)
Default editor command for opening agent files and configurations.

```json
{
  "defaultEditor": "code"
}
```

Common values:
- `"code"` - Visual Studio Code
- `"vim"` - Vim editor  
- `"nano"` - Nano editor
- `"subl"` - Sublime Text

#### `agentsPaths` (array, required)
List of directories to search for agent files. Paths are searched in order.

```json
{
  "agentsPaths": [
    "~/.claude-hr/agents",
    "./agents",
    "/shared/claude-agents"
  ]
}
```

Path formats:
- `~` expands to user home directory
- `./` relative to current working directory
- `/absolute/path` for absolute paths

#### `templatesPaths` (array, required)
List of directories to search for team templates.

```json
{
  "templatesPaths": [
    "~/.claude-hr/templates",
    "./templates"
  ]
}
```


## Workspace Configuration

### File Location
`.claude-hr/workspace.json` in your project root

### Configuration Schema

```json
{
  "activeTeam": "my-web-team",
  "localAgents": ["custom-agent"],
  "overrides": {
    "agents": {
      "csharp-architect": {
        "enabled": false
      },
      "react-expert": {
        "priority": 1
      }
    }
  },
  "workspace": {
    "name": "my-project",
    "type": "web-application",
    "framework": "react"
  }
}
```

### Configuration Options

#### `activeTeam` (string, optional)
The team currently active for this workspace.

```json
{
  "activeTeam": "my-web-team"
}
```

Set to `null` to use the global team or no team.

#### `localAgents` (array, optional)
List of workspace-specific agent names.

```json
{
  "localAgents": ["project-specific-agent", "custom-domain-expert"]
}
```

#### `overrides` (object, optional)
Workspace-specific overrides for team configurations.

```json
{
  "overrides": {
    "agents": {
      "agent-name": {
        "enabled": false,
        "priority": 5
      }
    }
  }
}
```

Override options per agent:
- `enabled` (boolean) - Enable/disable the agent
- `priority` (number) - Agent priority within the team

#### `workspace` (object, required)
Information about the workspace/project.

```json
{
  "workspace": {
    "name": "my-project",
    "type": "web-application", 
    "framework": "react",
    "description": "My awesome project",
    "tags": ["web", "frontend"]
  }
}
```

Properties:
- `name` (string, required) - Project name
- `type` (string, optional) - Project type
- `framework` (string, optional) - Primary framework
- `description` (string, optional) - Project description
- `tags` (array, optional) - Project tags

Common `type` values:
- `"web-application"`
- `"mobile-app"`
- `"api-service"`
- `"desktop-app"`
- `"library"`
- `"data-analysis"`
- `"machine-learning"`

## Team Configuration

Teams are stored as JSON files in the teams directory.

### File Location
- Global: `~/.claude-hr/teams/team-name.json`
- Templates: Various template paths

### Configuration Schema

```json
{
  "name": "web-development",
  "description": "Full-stack web development team",
  "version": "1.0.0",
  "created": "2024-01-01T00:00:00Z",
  "updated": "2024-01-01T00:00:00Z",
  "agents": [
    {
      "name": "react-expert",
      "role": "frontend",
      "priority": 1,
      "enabled": true
    },
    {
      "name": "csharp-architect", 
      "role": "backend",
      "priority": 2,
      "enabled": true
    }
  ],
  "metadata": {
    "tags": ["web", "fullstack"],
    "author": "user@example.com",
    "license": "MIT",
    "useCase": "Enterprise web applications"
  }
}
```

### Configuration Options

#### Basic Properties
- `name` (string, required) - Unique team identifier
- `description` (string, required) - Human-readable description
- `version` (string, required) - Semantic version
- `created` (string, auto-generated) - ISO timestamp
- `updated` (string, auto-generated) - ISO timestamp

#### `agents` (array, required)
List of agents in the team.

```json
{
  "agents": [
    {
      "name": "react-expert",
      "role": "frontend", 
      "priority": 1,
      "enabled": true
    }
  ]
}
```

Agent properties:
- `name` (string, required) - Agent identifier
- `role` (string, optional) - Agent's role in the team
- `priority` (number, required) - Execution/consultation priority
- `enabled` (boolean, required) - Whether agent is active

#### `metadata` (object, optional)
Additional team information.

```json
{
  "metadata": {
    "tags": ["web", "enterprise"],
    "author": "team-lead@company.com",
    "license": "MIT",
    "useCase": "Enterprise web applications",
    "documentation": "https://wiki.company.com/teams/web-dev"
  }
}
```

## Agent Configuration

Agents are markdown files with YAML frontmatter.

### File Structure

```markdown
---
name: "react-expert"
version: "1.0.0"
description: "React ecosystem specialist"
role: "frontend"
tags: ["react", "javascript", "frontend"]
capabilities: ["component-design", "state-management"]
dependencies: []
conflicts: ["vue-specialist"]
author: "agent-author"
created: "2024-01-01"
updated: "2024-01-01"
---

# React Expert

Agent prompt content goes here...
```

### Frontmatter Options

#### Required Fields
- `name` (string) - Unique agent identifier
- `version` (string) - Semantic version
- `description` (string) - Brief description
- `role` (string) - Agent's primary role

#### Optional Fields
- `tags` (array) - Categorization tags
- `capabilities` (array) - Specific capabilities
- `dependencies` (array) - Required other agents
- `conflicts` (array) - Conflicting agents
- `author` (string) - Agent creator
- `created` (string) - Creation date
- `updated` (string) - Last update date

## Configuration Management Commands

### View Configuration

```bash
# View current merged configuration
claude-hr status

# Get specific configuration value
claude-hr config get globalTeam
claude-hr config get agentsPaths
```

### Modify Configuration

```bash
# Set global configuration
claude-hr config set globalTeam web-development --global

# Set workspace configuration  
claude-hr config set workspace.framework vue

# Set nested values
claude-hr config set defaultEditor vim --global
```

### Reset Configuration

```bash
# Reset workspace to defaults
claude-hr workspace reset

# Re-initialize global configuration
claude-hr init --force
```

## Environment Variables

You can override configuration with environment variables:

```bash
# Set default editor
export CLAUDE_HR_EDITOR=vim

# Set log level
export CLAUDE_HR_LOG_LEVEL=debug

# Disable colors
export NO_COLOR=1

# Set custom config directory
export CLAUDE_HR_CONFIG_DIR=/custom/path
```

## Configuration Validation

Claude HR automatically validates configuration files. Common validation errors:

### Invalid Team Configuration
```bash
claude-hr teams validate my-team
```

Common issues:
- Missing required fields
- Invalid semantic versions
- Unknown agent references
- Circular dependencies

### Invalid Agent Configuration
```bash
claude-hr agents validate my-agent
```

Common issues:
- Missing frontmatter
- Invalid YAML syntax
- Missing required fields
- Invalid capability or tag format

## Migration

When upgrading Claude HR, configuration files may need migration:

```bash
# Check for needed migrations
claude-hr status

# Force configuration regeneration
claude-hr init --force
claude-hr workspace reset --force
```

## Best Practices

### 1. Version Control
- Include workspace configuration in version control
- Exclude global configuration (contains personal preferences)
- Use `.gitignore` for `.claude-hr/cache/` if present

### 2. Team Management
- Use semantic versioning for team configurations
- Document team purposes and use cases
- Tag teams consistently for discoverability

### 3. Path Management
- Use relative paths for project-specific agents
- Use absolute paths for shared/organizational agents
- Order paths by priority (most specific first)

### 4. Security
- Don't commit authentication tokens
- Use environment variables for sensitive configuration

### 5. Organization
- Create organization-wide agent libraries
- Standardize team templates across projects
- Document configuration decisions

## Troubleshooting

### Common Issues

#### Configuration File Not Found
```bash
claude-hr init  # Recreate global configuration
claude-hr workspace init  # Recreate workspace configuration
```

#### Invalid JSON
- Check for trailing commas
- Validate JSON syntax with a JSON validator
- Use `claude-hr config validate` to check

#### Path Resolution Issues
- Use absolute paths when relative paths don't work
- Check file permissions
- Verify directory existence

#### Agent Loading Issues
- Check agent file syntax
- Validate YAML frontmatter
- Ensure files have `.md` extension

For more help, run `claude-hr --help` or visit the [troubleshooting guide](troubleshooting.md).
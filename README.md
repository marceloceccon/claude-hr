# Claude HR - Claude Agent Team Manager

[![npm version](https://badge.fury.io/js/claude-hr.svg)](https://badge.fury.io/js/claude-hr)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful CLI tool for managing teams of specialized Claude agents with local and global scopes. Organize, activate, and deploy different teams of AI agents for various development scenarios and project types.

## 🚀 Features

- **Team Management**: Create, organize, and activate teams of specialized Claude agents
- **Local & Global Scopes**: Manage teams globally or per-workspace
- **Built-in Agents**: Comprehensive collection of pre-built specialist agents
- **Team Templates**: Quick-start templates for common development scenarios
- **Agent Dependencies**: Automatic dependency resolution and conflict detection
- **Interactive CLI**: User-friendly commands with interactive prompts
- **Extensible**: Create custom agents and teams for your specific needs

## 📦 Installation

```bash
# Install globally via npm
npm install -g claude-hr

# Or using yarn
yarn global add claude-hr

# Or using pnpm
pnpm add -g claude-hr
```

## 🏁 Quick Start

1. **Initialize claude-hr**:
   ```bash
   claude-hr init
   ```

2. **Initialize your workspace**:
   ```bash
   cd your-project
   claude-hr workspace init
   ```

3. **Create a team**:
   ```bash
   claude-hr teams create my-web-team
   ```

4. **Activate the team**:
   ```bash
   claude-hr teams activate my-web-team
   ```

5. **Check status**:
   ```bash
   claude-hr status
   ```

## 📚 Core Concepts

### Teams
Teams are collections of specialized agents working together on specific types of projects. Each team has:
- A name and description
- A list of agents with roles and priorities
- Metadata like tags and version information

### Agents
Agents are specialized AI assistants with expertise in specific domains:
- **Backend**: C# architects, database experts, API designers
- **Frontend**: React experts, UI designers, accessibility specialists  
- **Mobile**: React Native, iOS, and Android developers
- **DevOps**: Kubernetes experts, AWS architects, CI/CD specialists
- **Testing**: Test automation experts, QA engineers, performance testers
- **Security**: Security auditors, penetration testers, compliance experts

### Scopes
- **Global**: Teams available across all your projects
- **Local**: Teams specific to the current workspace/project

## 🛠️ Commands

### Global Commands
```bash
claude-hr init                    # Initialize global configuration
claude-hr status                  # Show current status
claude-hr config get <key>        # Get configuration value
claude-hr config set <key> <value> # Set configuration value
```

### Team Management
```bash
claude-hr teams list              # List all teams
claude-hr teams create <name>     # Create a new team
claude-hr teams show <name>       # Show team details
claude-hr teams activate <name>   # Activate a team locally
claude-hr teams activate <name> -g # Activate a team globally
claude-hr teams deactivate        # Deactivate current team
claude-hr teams export <name>     # Export team configuration
claude-hr teams import <file>     # Import team configuration
claude-hr teams delete <name>     # Delete a team
```

### Agent Management
```bash
claude-hr agents list             # List all available agents
claude-hr agents show <name>      # Show agent details
claude-hr agents search <query>   # Search agents
claude-hr agents add <team> <agent> # Add agent to team
claude-hr agents remove <team> <agent> # Remove agent from team
claude-hr agents create <name>    # Create a custom agent
claude-hr agents validate <name>  # Validate agent configuration
```

### Workspace Operations
```bash
claude-hr workspace init          # Initialize workspace configuration
claude-hr workspace status        # Show workspace status
claude-hr workspace reset         # Reset workspace configuration
claude-hr sync                    # Sync local with global configuration
```

## 🎯 Built-in Team Templates

Claude HR comes with several pre-configured team templates:

- **web-development**: Full-stack web development with React and C#
- **frontend-focused**: Frontend-heavy team with UI/UX specialists
- **backend-focused**: Backend-heavy team with API and database experts
- **mobile-development**: Cross-platform mobile development team
- **devops**: Infrastructure and deployment automation team
- **full-stack**: Comprehensive team covering all development aspects

Use templates with:
```bash
claude-hr teams create my-team --template web-development
```

## 🔧 Configuration

### Global Configuration (`~/.claude-hr/config.json`)
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

### Workspace Configuration (`.claude-hr/workspace.json`)
```json
{
  "activeTeam": "my-web-team",
  "localAgents": [],
  "overrides": {
    "agents": {
      "csharp-architect": {
        "enabled": false
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

## 🎨 Creating Custom Agents

Create custom agents by adding markdown files with frontmatter:

```markdown
---
name: "my-custom-agent"
version: "1.0.0"
description: "Custom agent for specific domain expertise"
role: "backend"
tags: ["custom", "specialized"]
capabilities: ["domain-specific", "custom-logic"]
dependencies: []
conflicts: []
author: "your-name"
---

# My Custom Agent

You are a specialized agent with expertise in...

[Agent prompt content]
```

## 🔍 Examples

### Creating a Web Development Team
```bash
# Create a new web development team
claude-hr teams create web-team

# Add agents interactively (select React expert, C# architect, etc.)

# Activate the team
claude-hr teams activate web-team

# Check the active configuration
claude-hr status
```

### Managing Multiple Projects
```bash
# Set up a global team for most projects
claude-hr teams activate full-stack --global

# Override with project-specific team
cd my-special-project
claude-hr workspace init
claude-hr teams activate devops

# The devops team is now active only for this project
```

### Custom Agent Creation
```bash
# Create a new custom agent
claude-hr agents create domain-expert

# Add it to your team
claude-hr agents add my-team domain-expert
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📚 [Documentation](docs/)
- 🐛 [Issue Tracker](https://github.com/marceloceccon/claude-hr/issues)
- 💬 [Discussions](https://github.com/marceloceccon/claude-hr/discussions)

## 🙏 Acknowledgments

- Built with ❤️ for the Claude development community
- Inspired by the need for organized, specialized AI assistance
- Thanks to all contributors and users

---

**Made with ❤️ by the Claude HR Team**
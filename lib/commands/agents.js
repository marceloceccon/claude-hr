import inquirer from 'inquirer';
import chalk from 'chalk';
import { AgentLoader } from '../core/agent-loader.js';
import { TeamManager } from '../core/team-manager.js';
import { Config } from '../core/config.js';
import { logger } from '../utils/logger.js';
import { writeTextFile, joinPaths } from '../utils/file-utils.js';

const config = new Config();
const agentLoader = new AgentLoader(config);
const teamManager = new TeamManager();

export const agentsCommand = {
  async list(options) {
    try {
      let agents;
      
      if (options.role) {
        agents = await agentLoader.getAgentsByRole(options.role);
      } else if (options.tag) {
        agents = await agentLoader.getAgentsByTag(options.tag);
      } else {
        agents = await agentLoader.getAllAgents();
      }

      if (agents.size === 0) {
        const filter = options.role ? ` with role '${options.role}'` : 
          options.tag ? ` with tag '${options.tag}'` : '';
        logger.info(`No agents found${filter}`);
        return;
      }

      console.log(chalk.blue('\nAvailable agents:\n'));

      for (const [name, agent] of agents) {
        const roleColor = agentsCommand.getRoleColor(agent.frontmatter.role);
        const statusIndicator = agent.validationErrors ? chalk.yellow('⚠') : chalk.green('✓');
        
        console.log(`${statusIndicator} ${chalk.white(name)} ${roleColor(`[${agent.frontmatter.role}]`)}`);
        console.log(`  ${chalk.gray(agent.frontmatter.description)}`);
        
        if (options.detailed) {
          console.log(`  ${chalk.cyan('Version:')} ${agent.frontmatter.version}`);
          console.log(`  ${chalk.cyan('File:')} ${agent.filePath}`);
          
          if (agent.frontmatter.tags && agent.frontmatter.tags.length > 0) {
            console.log(`  ${chalk.cyan('Tags:')} ${agent.frontmatter.tags.join(', ')}`);
          }
          
          if (agent.frontmatter.capabilities && agent.frontmatter.capabilities.length > 0) {
            console.log(`  ${chalk.cyan('Capabilities:')} ${agent.frontmatter.capabilities.join(', ')}`);
          }

          if (agent.frontmatter.dependencies && agent.frontmatter.dependencies.length > 0) {
            console.log(`  ${chalk.cyan('Dependencies:')} ${agent.frontmatter.dependencies.join(', ')}`);
          }

          if (agent.frontmatter.conflicts && agent.frontmatter.conflicts.length > 0) {
            console.log(`  ${chalk.red('Conflicts:')} ${agent.frontmatter.conflicts.join(', ')}`);
          }

          if (agent.validationErrors && agent.validationErrors.length > 0) {
            console.log(`  ${chalk.yellow('Issues:')} ${agent.validationErrors.join(', ')}`);
          }
        }
        
        console.log();
      }

      console.log(chalk.gray(`Total: ${agents.size} agents`));

    } catch (error) {
      logger.error('Failed to list agents:', error);
      process.exit(1);
    }
  },

  async show(name) {
    try {
      const agent = await agentLoader.getAgent(name);
      
      if (!agent) {
        logger.error(`Agent '${name}' not found`);
        process.exit(1);
      }

      const { frontmatter, content, filePath, stats } = agent;

      console.log(chalk.blue(`\nAgent: ${frontmatter.name}\n`));
      console.log(`${chalk.cyan('Description:')} ${frontmatter.description}`);
      console.log(`${chalk.cyan('Role:')} ${frontmatter.role}`);
      console.log(`${chalk.cyan('Version:')} ${frontmatter.version}`);
      console.log(`${chalk.cyan('File:')} ${filePath}`);

      if (frontmatter.tags && frontmatter.tags.length > 0) {
        console.log(`${chalk.cyan('Tags:')} ${frontmatter.tags.join(', ')}`);
      }

      if (frontmatter.capabilities && frontmatter.capabilities.length > 0) {
        console.log(`${chalk.cyan('Capabilities:')} ${frontmatter.capabilities.join(', ')}`);
      }

      if (frontmatter.dependencies && frontmatter.dependencies.length > 0) {
        console.log(`${chalk.cyan('Dependencies:')} ${frontmatter.dependencies.join(', ')}`);
      }

      if (frontmatter.conflicts && frontmatter.conflicts.length > 0) {
        console.log(`${chalk.red('Conflicts:')} ${frontmatter.conflicts.join(', ')}`);
      }

      if (frontmatter.author) {
        console.log(`${chalk.cyan('Author:')} ${frontmatter.author}`);
      }

      if (frontmatter.created) {
        console.log(`${chalk.cyan('Created:')} ${frontmatter.created}`);
      }

      if (stats) {
        console.log(`${chalk.cyan('Modified:')} ${stats.modified.toLocaleDateString()}`);
        console.log(`${chalk.cyan('Size:')} ${agentsCommand.formatBytes(stats.size)}`);
      }

      if (agent.validationErrors && agent.validationErrors.length > 0) {
        console.log(chalk.yellow('\nValidation Issues:'));
        agent.validationErrors.forEach(error => {
          console.log(`  ${chalk.yellow('⚠')} ${error}`);
        });
      }

      console.log(chalk.blue('\nContent Preview:\n'));
      const previewLines = content.split('\n').slice(0, 10);
      console.log(chalk.gray(previewLines.join('\n')));
      
      if (content.split('\n').length > 10) {
        console.log(chalk.gray('\n... (truncated)'));
      }

      console.log();

    } catch (error) {
      logger.error('Failed to show agent:', error);
      process.exit(1);
    }
  },

  async search(query) {
    try {
      const results = await agentLoader.searchAgents(query);

      if (results.size === 0) {
        logger.info(`No agents found matching '${query}'`);
        return;
      }

      console.log(chalk.blue(`\nSearch results for '${query}':\n`));

      for (const [name, { agent, matches }] of results) {
        const roleColor = agentsCommand.getRoleColor(agent.frontmatter.role);
        
        console.log(`${chalk.green('✓')} ${chalk.white(name)} ${roleColor(`[${agent.frontmatter.role}]`)}`);
        console.log(`  ${chalk.gray(agent.frontmatter.description)}`);
        
        console.log(`  ${chalk.cyan('Matches:')}`);
        matches.forEach(match => {
          console.log(`    ${chalk.gray(`${match.field}:`)} ${match.value}`);
        });
        
        console.log();
      }

      console.log(chalk.gray(`Found ${results.size} agents`));

    } catch (error) {
      logger.error('Failed to search agents:', error);
      process.exit(1);
    }
  },

  async add(teamName, agentName, options) {
    try {
      await teamManager.addAgentToTeam(teamName, agentName, {
        role: options.role,
        priority: options.priority,
        enabled: !options.disabled,
        overwrite: options.overwrite,
        ignoreDependencies: options.ignoreDeps,
        ignoreConflicts: options.ignoreConflicts
      });

      logger.success(`Agent '${agentName}' added to team '${teamName}'`);

    } catch (error) {
      logger.error('Failed to add agent to team:', error);
      process.exit(1);
    }
  },

  async remove(teamName, agentName) {
    try {
      await teamManager.removeAgentFromTeam(teamName, agentName);
      logger.success(`Agent '${agentName}' removed from team '${teamName}'`);

    } catch (error) {
      logger.error('Failed to remove agent from team:', error);
      process.exit(1);
    }
  },

  async create(name) {
    try {
      const roles = await agentLoader.getAgentRoles();
      const tags = await agentLoader.getAgentTags();

      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'description',
          message: 'Agent description:',
          validate: input => input.trim() ? true : 'Description is required'
        },
        {
          type: 'list',
          name: 'role',
          message: 'Agent role:',
          choices: [
            ...roles,
            { name: 'Other (specify)', value: 'custom' }
          ]
        },
        {
          type: 'input',
          name: 'customRole',
          message: 'Specify role:',
          when: answers => answers.role === 'custom',
          validate: input => input.trim() ? true : 'Role is required'
        },
        {
          type: 'checkbox',
          name: 'tags',
          message: 'Select tags:',
          choices: tags.map(tag => ({ name: tag, value: tag }))
        },
        {
          type: 'input',
          name: 'customTags',
          message: 'Additional tags (comma-separated):',
          filter: input => input.split(',').map(tag => tag.trim()).filter(Boolean)
        },
        {
          type: 'input',
          name: 'capabilities',
          message: 'Capabilities (comma-separated):',
          filter: input => input.split(',').map(cap => cap.trim()).filter(Boolean)
        },
        {
          type: 'input',
          name: 'dependencies',
          message: 'Dependencies (comma-separated agent names):',
          filter: input => input.split(',').map(dep => dep.trim()).filter(Boolean)
        },
        {
          type: 'input',
          name: 'conflicts',
          message: 'Conflicts (comma-separated agent names):',
          filter: input => input.split(',').map(conflict => conflict.trim()).filter(Boolean)
        },
        {
          type: 'editor',
          name: 'content',
          message: 'Agent prompt content:',
          validate: input => input.trim().length >= 100 ? true : 'Content must be at least 100 characters'
        }
      ]);

      const role = answers.customRole || answers.role;
      const allTags = [...answers.tags, ...answers.customTags];

      const frontmatter = {
        name,
        version: '1.0.0',
        description: answers.description,
        role,
        tags: allTags,
        capabilities: answers.capabilities,
        dependencies: answers.dependencies,
        conflicts: answers.conflicts,
        author: process.env.USER || process.env.USERNAME || 'unknown',
        created: new Date().toISOString().split('T')[0],
        updated: new Date().toISOString().split('T')[0]
      };

      // Create agent file content
      const agentContent = this.createAgentFileContent(frontmatter, answers.content);

      // Save to user's local agents directory
      const globalConfig = await config.getGlobalConfig();
      const userAgentsDir = globalConfig.agentsPaths.find(p => p.includes('.claude-hr'));
      const agentPath = joinPaths(userAgentsDir, `${name}.md`);

      await writeTextFile(agentPath, agentContent);

      logger.success(`Agent '${name}' created at ${agentPath}`);

      // Ask if user wants to add to a team
      const { addToTeam } = await inquirer.prompt([{
        type: 'confirm',
        name: 'addToTeam',
        message: 'Do you want to add this agent to a team?',
        default: false
      }]);

      if (addToTeam) {
        const teams = await teamManager.listTeams();
        
        if (teams.length === 0) {
          logger.info('No teams available. Create a team first with "claude-hr teams create <name>"');
        } else {
          const { selectedTeam } = await inquirer.prompt([{
            type: 'list',
            name: 'selectedTeam',
            message: 'Select team:',
            choices: teams.map(team => ({ name: team.name, value: team.name }))
          }]);

          await teamManager.addAgentToTeam(selectedTeam, name);
          logger.success(`Agent '${name}' added to team '${selectedTeam}'`);
        }
      }

    } catch (error) {
      logger.error('Failed to create agent:', error);
      process.exit(1);
    }
  },

  async validate(name) {
    try {
      const validation = await agentLoader.validateAgent(name);
      
      console.log(chalk.blue(`\nValidation results for agent '${name}':\n`));
      
      if (validation.valid) {
        console.log(chalk.green('✓ Agent is valid'));
      } else {
        validation.errors.forEach(error => {
          console.log(`${chalk.red('Error:')} ${error}`);
        });
      }

      if (!validation.valid) {
        process.exit(1);
      }

    } catch (error) {
      logger.error('Failed to validate agent:', error);
      process.exit(1);
    }
  },

  async roles() {
    try {
      const roles = await agentLoader.getAgentRoles();
      
      if (roles.length === 0) {
        logger.info('No agent roles found');
        return;
      }

      console.log(chalk.blue('\nAvailable agent roles:\n'));
      
      roles.forEach(role => {
        console.log(`• ${chalk.cyan(role)}`);
      });

      console.log();

    } catch (error) {
      logger.error('Failed to list agent roles:', error);
      process.exit(1);
    }
  },

  async tags() {
    try {
      const tags = await agentLoader.getAgentTags();
      
      if (tags.length === 0) {
        logger.info('No agent tags found');
        return;
      }

      console.log(chalk.blue('\nAvailable agent tags:\n'));
      
      tags.forEach(tag => {
        console.log(`• ${chalk.cyan(tag)}`);
      });

      console.log();

    } catch (error) {
      logger.error('Failed to list agent tags:', error);
      process.exit(1);
    }
  },

  getRoleColor(role) {
    const colors = {
      backend: chalk.red,
      frontend: chalk.blue,
      mobile: chalk.magenta,
      data: chalk.yellow,
      devops: chalk.green,
      testing: chalk.cyan,
      security: chalk.red.bold,
      general: chalk.gray
    };
    
    return colors[role] || chalk.white;
  },

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  },

  createAgentFileContent(frontmatter, content) {
    const yamlFrontmatter = Object.entries(frontmatter)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          if (value.length === 0) return null;
          return `${key}: [${value.map(v => `"${v}"`).join(', ')}]`;
        }
        return `${key}: "${value}"`;
      })
      .filter(Boolean)
      .join('\n');

    return `---
${yamlFrontmatter}
---

# ${frontmatter.name}

${content}`;
  }
};

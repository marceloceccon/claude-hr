import inquirer from 'inquirer';
import chalk from 'chalk';
import { TeamManager } from '../core/team-manager.js';
import { AgentLoader } from '../core/agent-loader.js';
import { Config } from '../core/config.js';
import { logger } from '../utils/logger.js';

const teamManager = new TeamManager();

export const teamsCommand = {
  async list(options) {
    try {
      const teams = await teamManager.listTeams({ detailed: options.detailed });
      
      if (options.active) {
        const activeTeams = teams.filter(team => team.active);
        if (activeTeams.length === 0) {
          logger.info('No active team');
          return;
        }
        teams.splice(0, teams.length, ...activeTeams);
      }

      if (teams.length === 0) {
        logger.info('No teams found. Create one with "claude-hr teams create <name>"');
        return;
      }

      console.log(chalk.blue('\nAvailable teams:\n'));

      teams.forEach(team => {
        const activeIndicator = team.active ? chalk.green('●') : ' ';
        const nameColor = team.active ? chalk.green : chalk.white;
        
        console.log(`${activeIndicator} ${nameColor(team.name)} ${chalk.gray(`(v${team.version})`)}`);
        console.log(`  ${chalk.gray(team.description)}`);
        
        if (options.detailed) {
          console.log(`  ${chalk.cyan('Agents:')} ${team.agentCount}`);
          console.log(`  ${chalk.cyan('Created:')} ${new Date(team.created).toLocaleDateString()}`);
          console.log(`  ${chalk.cyan('Updated:')} ${new Date(team.updated).toLocaleDateString()}`);
          
          if (team.agents && team.agents.length > 0) {
            console.log(`  ${chalk.cyan('Team members:')}`);
            team.agents.forEach(agent => {
              const enabledStatus = agent.enabled ? chalk.green('✓') : chalk.red('✗');
              console.log(`    ${enabledStatus} ${agent.name} ${chalk.gray(`(${agent.role}, priority: ${agent.priority})`)}`);
            });
          }
        } else {
          console.log(`  ${chalk.cyan('Agents:')} ${team.agentCount}`);
        }
        
        console.log();
      });

    } catch (error) {
      logger.error('Failed to list teams:', error);
      process.exit(1);
    }
  },

  async create(name, options) {
    try {
      const config = new Config();
      const agentLoader = new AgentLoader(config);
      
      // Interactive creation
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'description',
          message: 'Team description:',
          default: options.description,
          validate: input => input.trim() ? true : 'Description is required'
        },
        {
          type: 'checkbox',
          name: 'agents',
          message: 'Select agents for this team:',
          choices: async () => {
            const allAgents = await agentLoader.getAllAgents();
            return Array.from(allAgents.values()).map(agent => ({
              name: `${agent.name} - ${agent.frontmatter.description} (${agent.frontmatter.role})`,
              value: agent.name,
              short: agent.name
            }));
          }
        },
        {
          type: 'input',
          name: 'tags',
          message: 'Tags (comma-separated):',
          filter: input => input.split(',').map(tag => tag.trim()).filter(Boolean)
        }
      ]);

      const teamData = {
        name,
        description: answers.description,
        agents: answers.agents.map(agentName => ({ name: agentName })),
        metadata: {
          tags: answers.tags
        }
      };

      const _team = await teamManager.createTeam(teamData, {
        overwrite: options.overwrite,
        ignoreDependencies: options.ignoreDeps,
        ignoreConflicts: options.ignoreConflicts
      });

      logger.success(`Team '${name}' created successfully`);

      // Ask if user wants to activate the team
      const { activate } = await inquirer.prompt([{
        type: 'confirm',
        name: 'activate',
        message: 'Do you want to activate this team now?',
        default: false
      }]);

      if (activate) {
        const { scope } = await inquirer.prompt([{
          type: 'list',
          name: 'scope',
          message: 'Activation scope:',
          choices: [
            { name: 'Locally (current workspace)', value: 'local' },
            { name: 'Globally (all workspaces)', value: 'global' }
          ],
          default: 'local'
        }]);

        await teamManager.activateTeam(name, scope === 'global');
      }

    } catch (error) {
      logger.error('Failed to create team:', error);
      process.exit(1);
    }
  },

  async delete(name, options) {
    try {
      if (!options.force) {
        const { confirm } = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirm',
          message: `Are you sure you want to delete team '${name}'?`,
          default: false
        }]);

        if (!confirm) {
          logger.info('Team deletion cancelled');
          return;
        }
      }

      await teamManager.deleteTeam(name, options);
      
    } catch (error) {
      logger.error('Failed to delete team:', error);
      process.exit(1);
    }
  },

  async show(name, options) {
    try {
      const team = await teamManager.getTeam(name, {
        includeAgentDetails: options.agents,
        validateAgents: options.validate
      });

      console.log(chalk.blue(`\nTeam: ${team.name}\n`));
      console.log(`${chalk.cyan('Description:')} ${team.description}`);
      console.log(`${chalk.cyan('Version:')} ${team.version}`);
      console.log(`${chalk.cyan('Created:')} ${new Date(team.created).toLocaleDateString()}`);
      console.log(`${chalk.cyan('Updated:')} ${new Date(team.updated).toLocaleDateString()}`);

      if (team.metadata) {
        if (team.metadata.tags && team.metadata.tags.length > 0) {
          console.log(`${chalk.cyan('Tags:')} ${team.metadata.tags.join(', ')}`);
        }
        if (team.metadata.author) {
          console.log(`${chalk.cyan('Author:')} ${team.metadata.author}`);
        }
        if (team.metadata.license) {
          console.log(`${chalk.cyan('License:')} ${team.metadata.license}`);
        }
      }

      console.log(chalk.blue('\nAgents:\n'));
      
      if (team.agents.length === 0) {
        console.log(chalk.gray('No agents in this team'));
      } else {
        team.agents.forEach((agent, index) => {
          const enabledStatus = agent.enabled ? chalk.green('✓') : chalk.red('✗');
          const priorityBadge = chalk.gray(`#${agent.priority}`);
          
          console.log(`${enabledStatus} ${priorityBadge} ${chalk.white(agent.name)} ${chalk.gray(`(${agent.role})`)}`);
          
          if (options.agents && team.agentsWithDetails) {
            const details = team.agentsWithDetails[index]?.details;
            if (details) {
              console.log(`    ${chalk.gray(details.frontmatter.description)}`);
              if (details.frontmatter.tags) {
                console.log(`    ${chalk.gray('Tags:')} ${details.frontmatter.tags.join(', ')}`);
              }
            }
          }
        });
      }

      if (options.validate && team.validation) {
        console.log(chalk.blue('\nValidation:\n'));
        
        if (team.validation.unmetDependencies.length > 0) {
          console.log(chalk.red('Unmet Dependencies:'));
          team.validation.unmetDependencies.forEach(dep => {
            console.log(`  ${chalk.red('×')} ${dep.dependency} ${chalk.gray(`(required by ${dep.dependents.join(', ')})`)}`);
          });
        }

        if (team.validation.foundConflicts.length > 0) {
          console.log(chalk.red('Conflicts:'));
          team.validation.foundConflicts.forEach(conflict => {
            console.log(`  ${chalk.red('×')} ${conflict.conflicting} ${chalk.gray(`(conflicts with ${conflict.conflictors.join(', ')})`)}`);
          });
        }

        if (team.validation.unmetDependencies.length === 0 && team.validation.foundConflicts.length === 0) {
          console.log(chalk.green('✓ No validation issues found'));
        }
      }

      console.log();

    } catch (error) {
      logger.error('Failed to show team:', error);
      process.exit(1);
    }
  },

  async activate(name, options) {
    try {
      await teamManager.activateTeam(name, options.global);
    } catch (error) {
      logger.error('Failed to activate team:', error);
      process.exit(1);
    }
  },

  async deactivate(options) {
    try {
      await teamManager.deactivateTeam(options.global);
    } catch (error) {
      logger.error('Failed to deactivate team:', error);
      process.exit(1);
    }
  },

  async export(name, file, _options) {
    try {
      const exportPath = await teamManager.exportTeam(name, file);
      logger.success(`Team '${name}' exported to ${exportPath}`);
    } catch (error) {
      logger.error('Failed to export team:', error);
      process.exit(1);
    }
  },

  async import(file, options) {
    try {
      const team = await teamManager.importTeam(file, options.overwrite);
      logger.success(`Team '${team.name}' imported successfully`);
    } catch (error) {
      logger.error('Failed to import team:', error);
      process.exit(1);
    }
  },

  async validate(name, options) {
    try {
      if (options.all || !name) {
        const teams = await teamManager.listTeams();
        let hasErrors = false;

        console.log(chalk.blue('\nTeam Validation Results:\n'));

        for (const team of teams) {
          const validation = await teamManager.validateTeam(team.name);
          const status = validation.valid ? chalk.green('✓') : chalk.red('✗');
          
          console.log(`${status} ${team.name}`);
          
          if (!validation.valid) {
            hasErrors = true;
            validation.errors.forEach(error => {
              console.log(`    ${chalk.red('Error:')} ${error}`);
            });
          }

          if (validation.warnings.length > 0) {
            validation.warnings.forEach(warning => {
              console.log(`    ${chalk.yellow('Warning:')} ${warning}`);
            });
          }
        }

        if (hasErrors) {
          process.exit(1);
        }

      } else {
        const validation = await teamManager.validateTeam(name);
        
        console.log(chalk.blue(`\nValidation results for team '${name}':\n`));
        
        if (validation.valid) {
          console.log(chalk.green('✓ Team is valid'));
        } else {
          validation.errors.forEach(error => {
            console.log(`${chalk.red('Error:')} ${error}`);
          });
        }

        if (validation.warnings.length > 0) {
          validation.warnings.forEach(warning => {
            console.log(`${chalk.yellow('Warning:')} ${warning}`);
          });
        }

        if (!validation.valid) {
          process.exit(1);
        }
      }

    } catch (error) {
      logger.error('Failed to validate team(s):', error);
      process.exit(1);
    }
  }
};

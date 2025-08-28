import inquirer from 'inquirer';
import chalk from 'chalk';
import path from 'path';
import { Config } from '../core/config.js';
import { TeamManager } from '../core/team-manager.js';
import { logger } from '../utils/logger.js';

const config = new Config();
const teamManager = new TeamManager();

export const workspaceCommand = {
  async init(options) {
    try {
      const isAlreadyInitialized = await config.isWorkspaceInitialized();
      
      if (isAlreadyInitialized) {
        const { proceed } = await inquirer.prompt([{
          type: 'confirm',
          name: 'proceed',
          message: 'Workspace is already initialized. Do you want to reconfigure?',
          default: false
        }]);
        
        if (!proceed) {
          logger.info('Workspace initialization cancelled');
          return;
        }
      }

      logger.info('Initializing claude-hr workspace...');

      const workspaceTypes = [
        'web-application',
        'mobile-app',
        'api-service',
        'desktop-app',
        'library',
        'data-analysis',
        'machine-learning',
        'devops',
        'other'
      ];

      const frameworks = [
        'react',
        'vue',
        'angular',
        'svelte',
        'next.js',
        'nuxt.js',
        'express',
        'fastapi',
        'django',
        'spring',
        'laravel',
        'rails',
        'flutter',
        'react-native',
        'electron',
        'other',
        'none'
      ];

      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Workspace name:',
          default: options.name || path.basename(process.cwd()),
          validate: input => input.trim() ? true : 'Workspace name is required'
        },
        {
          type: 'list',
          name: 'type',
          message: 'Workspace type:',
          choices: [
            ...workspaceTypes,
            { name: 'Other (specify)', value: 'custom' }
          ],
          default: options.type
        },
        {
          type: 'input',
          name: 'customType',
          message: 'Specify workspace type:',
          when: answers => answers.type === 'custom',
          validate: input => input.trim() ? true : 'Workspace type is required'
        },
        {
          type: 'list',
          name: 'framework',
          message: 'Primary framework:',
          choices: [
            ...frameworks,
            { name: 'Other (specify)', value: 'custom' }
          ],
          default: options.framework
        },
        {
          type: 'input',
          name: 'customFramework',
          message: 'Specify framework:',
          when: answers => answers.framework === 'custom'
        }
      ]);

      const workspaceConfig = {
        activeTeam: null,
        localAgents: [],
        overrides: {
          agents: {}
        },
        workspace: {
          name: answers.name,
          type: answers.customType || answers.type,
          framework: answers.customFramework || answers.framework
        }
      };

      await config.setWorkspaceConfig(workspaceConfig);

      logger.success('Workspace initialized successfully!');

      // Ask if user wants to activate a team
      const teams = await teamManager.listTeams();
      
      if (teams.length > 0) {
        const { activateTeam } = await inquirer.prompt([{
          type: 'confirm',
          name: 'activateTeam',
          message: 'Do you want to activate a team for this workspace?',
          default: true
        }]);

        if (activateTeam) {
          const { selectedTeam } = await inquirer.prompt([{
            type: 'list',
            name: 'selectedTeam',
            message: 'Select team to activate:',
            choices: [
              { name: 'None', value: null },
              ...teams.map(team => ({ 
                name: `${team.name} - ${team.description}`, 
                value: team.name 
              }))
            ]
          }]);

          if (selectedTeam) {
            await teamManager.activateTeam(selectedTeam, false);
          }
        }
      } else {
        console.log(chalk.blue('\nNext steps:'));
        console.log('  • Create a team with "claude-hr teams create <name>"');
        console.log('  • Or activate a global team with "claude-hr teams activate <name>"');
      }

    } catch (error) {
      logger.error('Failed to initialize workspace:', error);
      process.exit(1);
    }
  },

  async status() {
    try {
      const mergedConfig = await config.getMergedConfig();
      const isWorkspace = await config.isWorkspaceInitialized();

      console.log(chalk.blue('\nClaude-HR Status:\n'));

      // Global configuration
      console.log(`${chalk.cyan('Global Config:')} ${config.globalConfigFile}`);
      console.log(`${chalk.cyan('Version:')} ${mergedConfig.version}`);
      console.log(`${chalk.cyan('Default Editor:')} ${mergedConfig.defaultEditor}`);

      if (mergedConfig.globalTeam) {
        console.log(`${chalk.cyan('Global Team:')} ${chalk.green(mergedConfig.globalTeam)}`);
      } else {
        console.log(`${chalk.cyan('Global Team:')} ${chalk.gray('None')}`);
      }

      console.log();

      // Workspace configuration
      if (isWorkspace) {
        console.log(`${chalk.cyan('Workspace:')} ${chalk.green('Initialized')}`);
        console.log(`${chalk.cyan('Workspace Name:')} ${mergedConfig.workspace.name}`);
        
        if (mergedConfig.workspace.type) {
          console.log(`${chalk.cyan('Workspace Type:')} ${mergedConfig.workspace.type}`);
        }
        
        if (mergedConfig.workspace.framework) {
          console.log(`${chalk.cyan('Framework:')} ${mergedConfig.workspace.framework}`);
        }

        if (mergedConfig.activeTeam) {
          console.log(`${chalk.cyan('Active Team:')} ${chalk.green(mergedConfig.activeTeam)}`);
          
          // Show team details
          try {
            const team = await teamManager.getTeam(mergedConfig.activeTeam);
            console.log(`${chalk.cyan('Team Description:')} ${team.description}`);
            console.log(`${chalk.cyan('Team Agents:')} ${team.agents.length}`);
          } catch {
            console.log(`${chalk.red('Warning:')} Active team not found`);
          }
        } else {
          console.log(`${chalk.cyan('Active Team:')} ${chalk.gray('None')}`);
        }

        if (mergedConfig.localAgents.length > 0) {
          console.log(`${chalk.cyan('Local Agents:')} ${mergedConfig.localAgents.join(', ')}`);
        }

      } else {
        console.log(`${chalk.cyan('Workspace:')} ${chalk.red('Not initialized')}`);
        console.log(`${chalk.gray('Run "claude-hr workspace init" to initialize')}`);
      }

      console.log();

      // Paths
      console.log(chalk.blue('Paths:\n'));
      console.log(`${chalk.cyan('Agents Paths:')}`);
      mergedConfig.agentsPaths.forEach(path => {
        console.log(`  • ${path}`);
      });

      console.log(`${chalk.cyan('Templates Paths:')}`);
      mergedConfig.templatesPaths.forEach(path => {
        console.log(`  • ${path}`);
      });

      console.log();

      // Quick stats
      const stats = await teamManager.getTeamStats();
      console.log(chalk.blue('Quick Stats:\n'));
      console.log(`${chalk.cyan('Total Teams:')} ${stats.total}`);
      console.log(`${chalk.cyan('Total Agents in Teams:')} ${stats.totalAgents}`);

      if (stats.total > 0) {
        console.log(`${chalk.cyan('Average Agents per Team:')} ${stats.averageAgentsPerTeam}`);
      }

      console.log();

    } catch (error) {
      logger.error('Failed to show status:', error);
      process.exit(1);
    }
  },

  async reset(options) {
    try {
      if (!(await config.isWorkspaceInitialized())) {
        logger.info('No workspace configuration found');
        return;
      }

      if (!options.force) {
        const { confirm } = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirm',
          message: 'Are you sure you want to reset the workspace configuration?',
          default: false
        }]);

        if (!confirm) {
          logger.info('Workspace reset cancelled');
          return;
        }
      }

      await config.initWorkspace();
      logger.success('Workspace configuration reset to defaults');

    } catch (error) {
      logger.error('Failed to reset workspace:', error);
      process.exit(1);
    }
  }
};

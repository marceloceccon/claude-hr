import inquirer from 'inquirer';
import chalk from 'chalk';
import { Config } from '../core/config.js';
import { TeamManager } from '../core/team-manager.js';
import { logger } from '../utils/logger.js';

export async function syncCommand(options) {
  const config = new Config();
  const _teamManager = new TeamManager();

  try {
    if (!(await config.isWorkspaceInitialized())) {
      logger.error('No workspace found. Initialize with "claude-hr workspace init" first.');
      process.exit(1);
    }

    const globalConfig = await config.getGlobalConfig();
    const workspaceConfig = await config.getWorkspaceConfig();

    console.log(chalk.blue('Sync Configuration:\n'));

    const syncOptions = [];

    // Check global team vs workspace active team
    if (globalConfig.globalTeam && workspaceConfig.activeTeam !== globalConfig.globalTeam) {
      syncOptions.push({
        type: 'global-team',
        description: `Set workspace team to global team: ${globalConfig.globalTeam}`,
        action: () => {
          workspaceConfig.activeTeam = globalConfig.globalTeam;
        }
      });
    }

    // Check if workspace team exists but no global team
    if (workspaceConfig.activeTeam && !globalConfig.globalTeam) {
      syncOptions.push({
        type: 'workspace-team',
        description: `Set global team to workspace team: ${workspaceConfig.activeTeam}`,
        action: () => {
          globalConfig.globalTeam = workspaceConfig.activeTeam;
        }
      });
    }

    if (syncOptions.length === 0) {
      logger.info('Configuration is already in sync');
      return;
    }

    if (!options.force) {
      console.log('Available sync operations:\n');
      syncOptions.forEach((option, index) => {
        console.log(`${index + 1}. ${option.description}`);
      });

      const { selectedOptions } = await inquirer.prompt([{
        type: 'checkbox',
        name: 'selectedOptions',
        message: 'Select sync operations to perform:',
        choices: syncOptions.map((option, index) => ({
          name: option.description,
          value: index,
          checked: false
        }))
      }]);

      if (selectedOptions.length === 0) {
        logger.info('No sync operations selected');
        return;
      }

      // Apply selected changes
      selectedOptions.forEach(index => {
        syncOptions[index].action();
      });

    } else {
      // Apply all changes when forced
      syncOptions.forEach(option => {
        option.action();
        logger.info(`Applied: ${option.description}`);
      });
    }

    // Save configurations
    await config.setGlobalConfig(globalConfig);
    await config.setWorkspaceConfig(workspaceConfig);

    logger.success('Configuration synced successfully');

  } catch (error) {
    logger.error('Failed to sync configuration:', error);
    process.exit(1);
  }
}

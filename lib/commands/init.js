import inquirer from 'inquirer';
import { Config } from '../core/config.js';
import { logger } from '../utils/logger.js';
import chalk from 'chalk';

export async function initCommand(options) {
  const config = new Config();
  
  try {
    // Check if config already exists
    const configExists = await config.getGlobalConfig().then(() => true).catch(() => false);
    
    if (configExists && !options.force) {
      const { proceed } = await inquirer.prompt([{
        type: 'confirm',
        name: 'proceed',
        message: 'Global configuration already exists. Do you want to reconfigure?',
        default: false
      }]);
      
      if (!proceed) {
        logger.info('Initialization cancelled');
        return;
      }
    }

    logger.info('Initializing claude-hr global configuration...');

    // Get user preferences
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'defaultEditor',
        message: 'Default editor command:',
        default: 'code',
        validate: input => input.trim() ? true : 'Editor command is required'
      }
    ]);

    // Create configuration
    await config.ensureGlobalConfig();
    
    const globalConfig = await config.getGlobalConfig();
    globalConfig.defaultEditor = answers.defaultEditor;

    await config.setGlobalConfig(globalConfig);

    logger.success('Claude-HR has been initialized successfully!');
    
    console.log(chalk.blue('\nNext steps:'));
    console.log('  • Run "claude-hr workspace init" in your project directory');
    console.log('  • Run "claude-hr teams list" to see available teams');
    console.log('  • Run "claude-hr agents list" to see available agents');
    console.log('  • Run "claude-hr --help" for all available commands');

  } catch (error) {
    logger.error('Initialization failed:', error);
    process.exit(1);
  }
}

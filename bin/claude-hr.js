#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

// Import command modules
import { initCommand } from '../lib/commands/init.js';
import { teamsCommand } from '../lib/commands/teams.js';
import { agentsCommand } from '../lib/commands/agents.js';
import { workspaceCommand } from '../lib/commands/workspace.js';
import { syncCommand } from '../lib/commands/sync.js';

// Get package info
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf8')
);

// Global error handler
process.on('unhandledRejection', (reason, _promise) => {
  console.error(chalk.red('Unhandled Promise Rejection:'), reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error);
  process.exit(1);
});

// Configure program
program
  .name('claude-hr')
  .version(packageJson.version)
  .description(packageJson.description)
  .option('-v, --verbose', 'verbose output')
  .option('-q, --quiet', 'suppress non-essential output')
  .option('--no-color', 'disable colors')
  .hook('preAction', (thisCommand) => {
    // Set global options
    if (thisCommand.opts().noColor) {
      process.env.NO_COLOR = '1';
    }
    
    // Set log level based on options
    const opts = thisCommand.opts();
    if (opts.quiet) {
      process.env.CLAUDE_HR_LOG_LEVEL = 'error';
    } else if (opts.verbose) {
      process.env.CLAUDE_HR_LOG_LEVEL = 'debug';
    }
  });

// Global init command
program
  .command('init')
  .description('Initialize global claude-hr configuration')
  .option('-f, --force', 'force initialization even if config exists')
  .action(initCommand);

// Teams commands
const teams = program
  .command('teams')
  .description('Manage teams');

teams
  .command('list')
  .description('List all available teams')
  .option('-d, --detailed', 'show detailed team information')
  .option('-a, --active', 'show only active team')
  .action(teamsCommand.list);

teams
  .command('create <name>')
  .description('Create a new team interactively')
  .option('-d, --description <desc>', 'team description')
  .option('--overwrite', 'overwrite existing team')
  .option('--ignore-deps', 'ignore dependency warnings')
  .option('--ignore-conflicts', 'ignore conflict warnings')
  .action(teamsCommand.create);

teams
  .command('delete <name>')
  .description('Delete a team')
  .option('-f, --force', 'force delete even if team is active')
  .action(teamsCommand.delete);

teams
  .command('show <name>')
  .description('Show team details')
  .option('--validate', 'include validation information')
  .option('--agents', 'include agent details')
  .action(teamsCommand.show);

teams
  .command('activate <name>')
  .description('Activate a team')
  .option('-g, --global', 'activate globally instead of locally')
  .action(teamsCommand.activate);

teams
  .command('deactivate')
  .description('Deactivate current team')
  .option('-g, --global', 'deactivate globally instead of locally')
  .action(teamsCommand.deactivate);

teams
  .command('export <name> [file]')
  .description('Export team configuration')
  .action(teamsCommand.export);

teams
  .command('import <file>')
  .description('Import team configuration')
  .option('--overwrite', 'overwrite existing team')
  .action(teamsCommand.import);

teams
  .command('validate [name]')
  .description('Validate team(s)')
  .option('-a, --all', 'validate all teams')
  .action(teamsCommand.validate);

// Agents commands
const agents = program
  .command('agents')
  .description('Manage agents');

agents
  .command('list')
  .description('List all available agents')
  .option('-r, --role <role>', 'filter by role')
  .option('-t, --tag <tag>', 'filter by tag')
  .option('-d, --detailed', 'show detailed agent information')
  .action(agentsCommand.list);

agents
  .command('show <name>')
  .description('Show agent details')
  .action(agentsCommand.show);

agents
  .command('search <query>')
  .description('Search agents')
  .action(agentsCommand.search);

agents
  .command('add <team> <agent>')
  .description('Add agent to team')
  .option('-r, --role <role>', 'specify agent role')
  .option('-p, --priority <priority>', 'specify agent priority', parseInt)
  .option('--disabled', 'add agent as disabled')
  .option('--overwrite', 'overwrite if agent already exists in team')
  .option('--ignore-deps', 'ignore dependency warnings')
  .option('--ignore-conflicts', 'ignore conflict warnings')
  .action(agentsCommand.add);

agents
  .command('remove <team> <agent>')
  .description('Remove agent from team')
  .action(agentsCommand.remove);

agents
  .command('create <name>')
  .description('Create a new agent interactively')
  .action(agentsCommand.create);

agents
  .command('validate <name>')
  .description('Validate agent configuration')
  .action(agentsCommand.validate);

agents
  .command('roles')
  .description('List all available agent roles')
  .action(agentsCommand.roles);

agents
  .command('tags')
  .description('List all available agent tags')
  .action(agentsCommand.tags);

// Workspace commands
const workspace = program
  .command('workspace')
  .description('Workspace operations');

workspace
  .command('init')
  .description('Initialize workspace-specific configuration')
  .option('-n, --name <name>', 'workspace name')
  .option('-t, --type <type>', 'workspace type')
  .option('-f, --framework <framework>', 'workspace framework')
  .action(workspaceCommand.init);

workspace
  .command('status')
  .description('Show workspace status')
  .action(workspaceCommand.status);

workspace
  .command('reset')
  .description('Reset workspace to default configuration')
  .option('-f, --force', 'force reset without confirmation')
  .action(workspaceCommand.reset);

// Other commands
program
  .command('status')
  .description('Show current configuration status')
  .action(workspaceCommand.status);

program
  .command('sync')
  .description('Sync local with global configuration')
  .option('-f, --force', 'force sync without confirmation')
  .action(syncCommand);

program
  .command('config')
  .description('Manage configuration')
  .argument('<action>', 'get or set')
  .argument('<key>', 'configuration key')
  .argument('[value]', 'configuration value (for set action)')
  .option('-g, --global', 'modify global configuration')
  .action(async (action, key, value, options) => {
    const { Config } = await import('../lib/core/config.js');
    const { logger } = await import('../lib/utils/logger.js');
    
    try {
      const config = new Config();
      
      if (action === 'get') {
        const result = await config.getConfigValue(key);
        if (result !== undefined) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          logger.error(`Configuration key '${key}' not found`);
          process.exit(1);
        }
      } else if (action === 'set') {
        if (value === undefined) {
          logger.error('Value is required for set action');
          process.exit(1);
        }
        
        // Try to parse as JSON, fallback to string
        let parsedValue = value;
        try {
          parsedValue = JSON.parse(value);
        } catch {
          // Keep as string
        }
        
        await config.setConfigValue(key, parsedValue, options.global);
        logger.success(`Configuration '${key}' updated`);
      } else {
        logger.error(`Unknown action '${action}'. Use 'get' or 'set'`);
        process.exit(1);
      }
    } catch (error) {
      logger.error('Configuration error:', error);
      process.exit(1);
    }
  });

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

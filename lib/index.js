// Main library exports
export { Config } from './core/config.js';
export { Storage } from './core/storage.js';
export { AgentLoader } from './core/agent-loader.js';
export { TeamManager } from './core/team-manager.js';

// Utility exports
export * from './utils/file-utils.js';
export * from './utils/validation.js';
export { logger, createLogger } from './utils/logger.js';

// Command exports
export { initCommand } from './commands/init.js';
export { teamsCommand } from './commands/teams.js';
export { agentsCommand } from './commands/agents.js';
export { workspaceCommand } from './commands/workspace.js';
export { syncCommand } from './commands/sync.js';

import path from 'path';
import { Config } from './config.js';
import { 
  ensureDir, 
  pathExists, 
  readJsonFile, 
  writeJsonFile, 
  createBackup, 
  deleteFile,
  listFiles
} from '../utils/file-utils.js';
import { validateTeamConfig } from '../utils/validation.js';
import { logger } from '../utils/logger.js';

/**
 * Storage management class for Claude HR
 * Handles team configurations, persistence, and validation
 */
export class Storage {
  /**
   * Initialize storage instance with configuration
   */
  constructor() {
    this.config = new Config();
  }

  async getTeamsDir() {
    const _globalConfig = await this.config.getGlobalConfig();
    return path.join(this.config.globalConfigDir, 'teams');
  }

  async ensureTeamsDir() {
    const teamsDir = await this.getTeamsDir();
    await ensureDir(teamsDir);
    return teamsDir;
  }

  async getAllTeams() {
    const teamsDir = await this.ensureTeamsDir();
    const teamFiles = await listFiles(teamsDir, '*.json');
    const teams = new Map();

    for (const teamFile of teamFiles) {
      try {
        const teamConfig = await readJsonFile(teamFile);
        const teamName = path.basename(teamFile, '.json');
        
        if (teamConfig.name !== teamName) {
          logger.warn(`Team file name mismatch: ${teamFile} contains team '${teamConfig.name}'`);
        }

        teams.set(teamName, teamConfig);
      } catch (error) {
        logger.warn(`Failed to load team from ${teamFile}: ${error.message}`);
      }
    }

    return teams;
  }

  async getTeam(name) {
    const teamsDir = await this.getTeamsDir();
    const teamFile = path.join(teamsDir, `${name}.json`);
    
    if (!(await pathExists(teamFile))) {
      return null;
    }

    try {
      return await readJsonFile(teamFile);
    } catch (error) {
      logger.error(`Failed to load team '${name}': ${error.message}`);
      return null;
    }
  }

  async saveTeam(teamConfig, overwrite = false) {
    const errors = validateTeamConfig(teamConfig);
    if (errors.length > 0) {
      throw new Error(`Invalid team configuration: ${errors.join(', ')}`);
    }

    const teamsDir = await this.ensureTeamsDir();
    const teamFile = path.join(teamsDir, `${teamConfig.name}.json`);

    if (!overwrite && await pathExists(teamFile)) {
      throw new Error(`Team '${teamConfig.name}' already exists`);
    }

    // Create backup if updating existing team
    if (await pathExists(teamFile)) {
      await createBackup(teamFile);
    }

    // Add timestamps
    const now = new Date().toISOString();
    if (!teamConfig.created) {
      teamConfig.created = now;
    }
    teamConfig.updated = now;

    await writeJsonFile(teamFile, teamConfig);
    logger.success(`Team '${teamConfig.name}' saved successfully`);
    
    return teamConfig;
  }

  async deleteTeam(name) {
    const teamsDir = await this.getTeamsDir();
    const teamFile = path.join(teamsDir, `${name}.json`);

    if (!(await pathExists(teamFile))) {
      throw new Error(`Team '${name}' not found`);
    }

    // Create backup before deletion
    const backupPath = await createBackup(teamFile);
    await deleteFile(teamFile);
    
    logger.success(`Team '${name}' deleted successfully`);
    logger.info(`Backup created at: ${backupPath}`);
    
    return true;
  }

  async teamExists(name) {
    const teamsDir = await this.getTeamsDir();
    const teamFile = path.join(teamsDir, `${name}.json`);
    return await pathExists(teamFile);
  }

  async exportTeam(name, exportPath) {
    const team = await this.getTeam(name);
    if (!team) {
      throw new Error(`Team '${name}' not found`);
    }

    let targetPath = exportPath;
    if (!targetPath) {
      targetPath = path.join(process.cwd(), `${name}-team.json`);
    }

    await writeJsonFile(targetPath, team);
    logger.success(`Team '${name}' exported to ${targetPath}`);
    
    return targetPath;
  }

  async importTeam(importPath, overwrite = false) {
    if (!(await pathExists(importPath))) {
      throw new Error(`Import file not found: ${importPath}`);
    }

    const teamConfig = await readJsonFile(importPath);
    
    if (!teamConfig.name) {
      throw new Error('Imported team configuration is missing name');
    }

    if (await this.teamExists(teamConfig.name) && !overwrite) {
      throw new Error(`Team '${teamConfig.name}' already exists. Use --overwrite to replace it.`);
    }

    return await this.saveTeam(teamConfig, overwrite);
  }

  async duplicateTeam(sourceName, targetName) {
    const sourceTeam = await this.getTeam(sourceName);
    if (!sourceTeam) {
      throw new Error(`Source team '${sourceName}' not found`);
    }

    if (await this.teamExists(targetName)) {
      throw new Error(`Target team '${targetName}' already exists`);
    }

    const newTeam = {
      ...sourceTeam,
      name: targetName,
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };

    return await this.saveTeam(newTeam);
  }

  async getActiveTeam() {
    const mergedConfig = await this.config.getMergedConfig();
    return mergedConfig.activeTeam;
  }

  async setActiveTeam(teamName, isGlobal = false) {
    if (teamName && !(await this.teamExists(teamName))) {
      throw new Error(`Team '${teamName}' not found`);
    }

    if (isGlobal) {
      const globalConfig = await this.config.getGlobalConfig();
      globalConfig.globalTeam = teamName;
      await this.config.setGlobalConfig(globalConfig);
    } else {
      if (!(await this.config.isWorkspaceInitialized())) {
        throw new Error('No workspace initialized. Use "claude-hr workspace init" first.');
      }
      
      const workspaceConfig = await this.config.getWorkspaceConfig();
      workspaceConfig.activeTeam = teamName;
      await this.config.setWorkspaceConfig(workspaceConfig);
    }

    const scope = isGlobal ? 'globally' : 'locally';
    if (teamName) {
      logger.success(`Team '${teamName}' activated ${scope}`);
    } else {
      logger.success(`Team deactivated ${scope}`);
    }
  }

  async getTeamStats() {
    const teams = await this.getAllTeams();
    const stats = {
      total: teams.size,
      byRole: new Map(),
      byTag: new Map(),
      totalAgents: 0,
      averageAgentsPerTeam: 0
    };

    let totalAgentCount = 0;

    for (const [, team] of teams) {
      totalAgentCount += team.agents.length;

      // Count agents by role
      team.agents.forEach(agent => {
        if (agent.role) {
          stats.byRole.set(agent.role, (stats.byRole.get(agent.role) || 0) + 1);
        }
      });

      // Count by tags
      if (team.metadata && team.metadata.tags) {
        team.metadata.tags.forEach(tag => {
          stats.byTag.set(tag, (stats.byTag.get(tag) || 0) + 1);
        });
      }
    }

    stats.totalAgents = totalAgentCount;
    stats.averageAgentsPerTeam = teams.size > 0 ? Math.round(totalAgentCount / teams.size) : 0;

    // Convert Maps to objects for easier serialization
    stats.byRole = Object.fromEntries(stats.byRole);
    stats.byTag = Object.fromEntries(stats.byTag);

    return stats;
  }

  async searchTeams(query) {
    const teams = await this.getAllTeams();
    const results = new Map();
    const searchTerm = query.toLowerCase();

    for (const [name, team] of teams) {
      const matches = this.searchInTeam(team, searchTerm);
      if (matches.length > 0) {
        results.set(name, { team, matches });
      }
    }

    return results;
  }

  searchInTeam(team, searchTerm) {
    const matches = [];

    // Search in name
    if (team.name && team.name.toLowerCase().includes(searchTerm)) {
      matches.push({ field: 'name', value: team.name });
    }

    // Search in description
    if (team.description && team.description.toLowerCase().includes(searchTerm)) {
      matches.push({ field: 'description', value: team.description });
    }

    // Search in agent names
    team.agents.forEach(agent => {
      if (agent.name && agent.name.toLowerCase().includes(searchTerm)) {
        matches.push({ field: 'agent', value: agent.name });
      }
      if (agent.role && agent.role.toLowerCase().includes(searchTerm)) {
        matches.push({ field: 'role', value: agent.role });
      }
    });

    // Search in metadata tags
    if (team.metadata && team.metadata.tags) {
      team.metadata.tags.forEach(tag => {
        if (tag.toLowerCase().includes(searchTerm)) {
          matches.push({ field: 'tag', value: tag });
        }
      });
    }

    return matches;
  }

  async validateAllTeams() {
    const teams = await this.getAllTeams();
    const results = new Map();

    for (const [name, team] of teams) {
      const errors = validateTeamConfig(team);
      results.set(name, {
        valid: errors.length === 0,
        errors,
        team
      });
    }

    return results;
  }
}

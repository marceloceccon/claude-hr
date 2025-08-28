import { Storage } from './storage.js';
import { AgentLoader } from './agent-loader.js';
import { Config } from './config.js';
import { logger as _logger } from '../utils/logger.js';
import { validateTeamName } from '../utils/validation.js';

export class TeamManager {
  constructor() {
    this.storage = new Storage();
    this.config = new Config();
    this.agentLoader = new AgentLoader(this.config);
  }

  async listTeams(options = {}) {
    const teams = await this.storage.getAllTeams();
    const activeTeam = await this.storage.getActiveTeam();
    const results = [];

    for (const [name, team] of teams) {
      const result = {
        name,
        description: team.description,
        version: team.version,
        agentCount: team.agents.length,
        active: name === activeTeam,
        created: team.created,
        updated: team.updated
      };

      if (options.detailed) {
        result.agents = team.agents;
        result.metadata = team.metadata;
      }

      results.push(result);
    }

    return results.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getTeam(name, options = {}) {
    const team = await this.storage.getTeam(name);
    if (!team) {
      throw new Error(`Team '${name}' not found`);
    }

    if (options.includeAgentDetails) {
      const agentsWithDetails = [];
      for (const teamAgent of team.agents) {
        const agentDetails = await this.agentLoader.getAgent(teamAgent.name);
        agentsWithDetails.push({
          ...teamAgent,
          details: agentDetails
        });
      }
      team.agentsWithDetails = agentsWithDetails;
    }

    if (options.validateAgents) {
      const agentNames = team.agents.map(a => a.name);
      const dependencyCheck = await this.agentLoader.checkDependencies(agentNames);
      team.validation = dependencyCheck;
    }

    return team;
  }

  async createTeam(teamData, options = {}) {
    const { name, description, agents = [], metadata = {} } = teamData;

    // Validate team name
    const nameErrors = validateTeamName(name);
    if (nameErrors.length > 0) {
      throw new Error(`Invalid team name: ${nameErrors.join(', ')}`);
    }

    // Check if team already exists
    if (await this.storage.teamExists(name) && !options.overwrite) {
      throw new Error(`Team '${name}' already exists`);
    }

    // Validate agents exist
    const allAgents = await this.agentLoader.getAllAgents();
    const invalidAgents = [];
    
    for (const agent of agents) {
      if (!allAgents.has(agent.name)) {
        invalidAgents.push(agent.name);
      }
    }

    if (invalidAgents.length > 0) {
      throw new Error(`Unknown agents: ${invalidAgents.join(', ')}`);
    }

    // Check dependencies and conflicts
    const agentNames = agents.map(a => a.name);
    const dependencyCheck = await this.agentLoader.checkDependencies(agentNames);

    if (dependencyCheck.missing.length > 0) {
      throw new Error(`Missing agents: ${dependencyCheck.missing.join(', ')}`);
    }

    if (dependencyCheck.unmetDependencies.length > 0 && !options.ignoreDependencies) {
      const deps = dependencyCheck.unmetDependencies.map(d => 
        `${d.dependency} (required by ${d.dependents.join(', ')})`
      ).join(', ');
      throw new Error(`Unmet dependencies: ${deps}`);
    }

    if (dependencyCheck.foundConflicts.length > 0 && !options.ignoreConflicts) {
      const conflicts = dependencyCheck.foundConflicts.map(c =>
        `${c.conflicting} conflicts with ${c.conflictors.join(', ')}`
      ).join(', ');
      throw new Error(`Agent conflicts: ${conflicts}`);
    }

    const teamConfig = {
      name,
      description,
      version: '1.0.0',
      agents: agents.map((agent, index) => ({
        name: agent.name,
        role: agent.role || allAgents.get(agent.name)?.frontmatter?.role || 'general',
        priority: agent.priority || index + 1,
        enabled: agent.enabled !== undefined ? agent.enabled : true
      })),
      metadata: {
        tags: metadata.tags || [],
        author: metadata.author || process.env.USER || process.env.USERNAME || 'unknown',
        license: metadata.license || 'MIT',
        ...metadata
      }
    };

    return await this.storage.saveTeam(teamConfig, options.overwrite);
  }

  async updateTeam(name, updates, options = {}) {
    const existingTeam = await this.storage.getTeam(name);
    if (!existingTeam) {
      throw new Error(`Team '${name}' not found`);
    }

    // Create updated team configuration
    const updatedTeam = {
      ...existingTeam,
      ...updates,
      name: existingTeam.name, // Prevent name changes
      created: existingTeam.created, // Preserve creation date
      version: this.incrementVersion(existingTeam.version || '1.0.0')
    };

    // Validate agents if they were updated
    if (updates.agents) {
      const allAgents = await this.agentLoader.getAllAgents();
      const invalidAgents = [];
      
      for (const agent of updates.agents) {
        if (!allAgents.has(agent.name)) {
          invalidAgents.push(agent.name);
        }
      }

      if (invalidAgents.length > 0) {
        throw new Error(`Unknown agents: ${invalidAgents.join(', ')}`);
      }

      // Check dependencies and conflicts
      const agentNames = updates.agents.map(a => a.name);
      const dependencyCheck = await this.agentLoader.checkDependencies(agentNames);

      if (dependencyCheck.unmetDependencies.length > 0 && !options.ignoreDependencies) {
        const deps = dependencyCheck.unmetDependencies.map(d => 
          `${d.dependency} (required by ${d.dependents.join(', ')})`
        ).join(', ');
        throw new Error(`Unmet dependencies: ${deps}`);
      }

      if (dependencyCheck.foundConflicts.length > 0 && !options.ignoreConflicts) {
        const conflicts = dependencyCheck.foundConflicts.map(c =>
          `${c.conflicting} conflicts with ${c.conflictors.join(', ')}`
        ).join(', ');
        throw new Error(`Agent conflicts: ${conflicts}`);
      }
    }

    return await this.storage.saveTeam(updatedTeam, true);
  }

  async deleteTeam(name, options = {}) {
    const activeTeam = await this.storage.getActiveTeam();
    
    if (name === activeTeam) {
      if (options.force) {
        await this.storage.setActiveTeam(null, false);
        const globalConfig = await this.config.getGlobalConfig();
        if (globalConfig.globalTeam === name) {
          await this.storage.setActiveTeam(null, true);
        }
      } else {
        throw new Error(`Cannot delete active team '${name}'. Deactivate first or use --force`);
      }
    }

    return await this.storage.deleteTeam(name);
  }

  async addAgentToTeam(teamName, agentName, options = {}) {
    const team = await this.storage.getTeam(teamName);
    if (!team) {
      throw new Error(`Team '${teamName}' not found`);
    }

    // Check if agent exists
    const agent = await this.agentLoader.getAgent(agentName);
    if (!agent) {
      throw new Error(`Agent '${agentName}' not found`);
    }

    // Check if agent is already in team
    const existingIndex = team.agents.findIndex(a => a.name === agentName);
    if (existingIndex !== -1 && !options.overwrite) {
      throw new Error(`Agent '${agentName}' is already in team '${teamName}'`);
    }

    const newAgent = {
      name: agentName,
      role: options.role || agent.frontmatter.role || 'general',
      priority: options.priority || team.agents.length + 1,
      enabled: options.enabled !== undefined ? options.enabled : true
    };

    if (existingIndex !== -1) {
      team.agents[existingIndex] = newAgent;
    } else {
      team.agents.push(newAgent);
    }

    // Validate the updated team
    const agentNames = team.agents.map(a => a.name);
    const dependencyCheck = await this.agentLoader.checkDependencies(agentNames);

    if (dependencyCheck.unmetDependencies.length > 0 && !options.ignoreDependencies) {
      const deps = dependencyCheck.unmetDependencies.map(d => 
        `${d.dependency} (required by ${d.dependents.join(', ')})`
      ).join(', ');
      throw new Error(`Adding agent would create unmet dependencies: ${deps}`);
    }

    if (dependencyCheck.foundConflicts.length > 0 && !options.ignoreConflicts) {
      const conflicts = dependencyCheck.foundConflicts.map(c =>
        `${c.conflicting} conflicts with ${c.conflictors.join(', ')}`
      ).join(', ');
      throw new Error(`Adding agent would create conflicts: ${conflicts}`);
    }

    return await this.storage.saveTeam(team, true);
  }

  async removeAgentFromTeam(teamName, agentName) {
    const team = await this.storage.getTeam(teamName);
    if (!team) {
      throw new Error(`Team '${teamName}' not found`);
    }

    const agentIndex = team.agents.findIndex(a => a.name === agentName);
    if (agentIndex === -1) {
      throw new Error(`Agent '${agentName}' is not in team '${teamName}'`);
    }

    team.agents.splice(agentIndex, 1);

    // Re-calculate priorities
    team.agents.forEach((agent, index) => {
      agent.priority = index + 1;
    });

    return await this.storage.saveTeam(team, true);
  }

  async activateTeam(name, isGlobal = false) {
    return await this.storage.setActiveTeam(name, isGlobal);
  }

  async deactivateTeam(isGlobal = false) {
    return await this.storage.setActiveTeam(null, isGlobal);
  }

  async exportTeam(name, exportPath) {
    return await this.storage.exportTeam(name, exportPath);
  }

  async importTeam(importPath, overwrite = false) {
    return await this.storage.importTeam(importPath, overwrite);
  }

  async duplicateTeam(sourceName, targetName) {
    return await this.storage.duplicateTeam(sourceName, targetName);
  }

  async validateTeam(name, _options = {}) {
    const team = await this.getTeam(name, { validateAgents: true });
    const results = {
      teamValid: true,
      agentsValid: true,
      errors: [],
      warnings: [],
      dependencies: team.validation
    };

    // Validate individual agents exist
    const allAgents = await this.agentLoader.getAllAgents();
    const missingAgents = [];
    
    for (const teamAgent of team.agents) {
      const agent = allAgents.get(teamAgent.name);
      if (!agent) {
        missingAgents.push(teamAgent.name);
      } else if (agent.validationErrors && agent.validationErrors.length > 0) {
        results.warnings.push(`Agent '${teamAgent.name}' has validation issues: ${agent.validationErrors.join(', ')}`);
      }
    }

    if (missingAgents.length > 0) {
      results.errors.push(`Missing agents: ${missingAgents.join(', ')}`);
      results.agentsValid = false;
    }

    // Check dependencies
    if (team.validation.unmetDependencies.length > 0) {
      const deps = team.validation.unmetDependencies.map(d => 
        `${d.dependency} (required by ${d.dependents.join(', ')})`
      ).join(', ');
      results.errors.push(`Unmet dependencies: ${deps}`);
      results.teamValid = false;
    }

    // Check conflicts
    if (team.validation.foundConflicts.length > 0) {
      const conflicts = team.validation.foundConflicts.map(c =>
        `${c.conflicting} conflicts with ${c.conflictors.join(', ')}`
      ).join(', ');
      results.errors.push(`Agent conflicts: ${conflicts}`);
      results.teamValid = false;
    }

    results.valid = results.teamValid && results.agentsValid;
    return results;
  }

  async searchTeams(query) {
    return await this.storage.searchTeams(query);
  }

  async getTeamStats() {
    return await this.storage.getTeamStats();
  }

  incrementVersion(version) {
    const parts = version.split('.');
    const patch = parseInt(parts[2] || '0', 10) + 1;
    return `${parts[0] || '1'}.${parts[1] || '0'}.${patch}`;
  }
}

import { promises as fs } from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { glob } from 'glob';
import { pathExists, getFileStats } from '../utils/file-utils.js';
import { validateAgentConfig } from '../utils/validation.js';
import { logger } from '../utils/logger.js';

export class AgentLoader {
  constructor(config) {
    this.config = config;
    this.agentCache = new Map();
    this.lastCacheUpdate = null;
  }

  async getAllAgents() {
    const agentsPaths = await this.config.getAgentsPaths();
    const agents = new Map();

    for (const agentsPath of agentsPaths) {
      if (!(await pathExists(agentsPath))) {
        logger.debug(`Agents path does not exist: ${agentsPath}`);
        continue;
      }

      const agentFiles = await this.findAgentFiles(agentsPath);
      
      for (const agentFile of agentFiles) {
        try {
          const agent = await this.loadAgent(agentFile);
          if (agent) {
            // Use agent name from frontmatter, fallback to filename
            const agentName = agent.frontmatter.name || path.basename(agentFile, '.md');
            
            if (!agents.has(agentName)) {
              agents.set(agentName, agent);
            } else {
              logger.debug(`Duplicate agent found: ${agentName}, skipping ${agentFile}`);
            }
          }
        } catch (error) {
          logger.warn(`Failed to load agent from ${agentFile}: ${error.message}`);
        }
      }
    }

    return agents;
  }

  async findAgentFiles(agentsPath) {
    const pattern = path.join(agentsPath, '**/*.md');
    const files = await glob(pattern, { nodir: true });
    return files;
  }

  async loadAgent(agentFile) {
    try {
      const content = await fs.readFile(agentFile, 'utf8');
      const parsed = matter(content);
      
      if (!parsed.data || Object.keys(parsed.data).length === 0) {
        logger.warn(`Agent file ${agentFile} has no frontmatter`);
        return null;
      }

      const stats = await getFileStats(agentFile);
      
      const agent = {
        name: parsed.data.name || path.basename(agentFile, '.md'),
        filePath: agentFile,
        frontmatter: parsed.data,
        content: parsed.content.trim(),
        stats: {
          created: stats.birthtime,
          modified: stats.mtime,
          size: stats.size
        }
      };

      // Validate agent configuration
      const validationErrors = validateAgentConfig(agent.frontmatter);
      if (validationErrors.length > 0) {
        logger.warn(`Validation errors in agent ${agent.name}:`);
        validationErrors.forEach(error => logger.warn(`  - ${error}`));
        agent.validationErrors = validationErrors;
      }

      return agent;
    } catch (error) {
      logger.error(`Error loading agent from ${agentFile}:`, error);
      return null;
    }
  }

  async getAgent(name) {
    const agents = await this.getAllAgents();
    return agents.get(name);
  }

  async getAgentsByRole(role) {
    const agents = await this.getAllAgents();
    const filteredAgents = new Map();

    for (const [name, agent] of agents) {
      if (agent.frontmatter.role === role) {
        filteredAgents.set(name, agent);
      }
    }

    return filteredAgents;
  }

  async getAgentsByTag(tag) {
    const agents = await this.getAllAgents();
    const filteredAgents = new Map();

    for (const [name, agent] of agents) {
      if (agent.frontmatter.tags && agent.frontmatter.tags.includes(tag)) {
        filteredAgents.set(name, agent);
      }
    }

    return filteredAgents;
  }

  async searchAgents(query) {
    const agents = await this.getAllAgents();
    const results = new Map();
    const searchTerm = query.toLowerCase();

    for (const [name, agent] of agents) {
      const matches = this.searchInAgent(agent, searchTerm);
      if (matches.length > 0) {
        results.set(name, { agent, matches });
      }
    }

    return results;
  }

  searchInAgent(agent, searchTerm) {
    const matches = [];
    const { frontmatter, content } = agent;

    // Search in name
    if (frontmatter.name && frontmatter.name.toLowerCase().includes(searchTerm)) {
      matches.push({ field: 'name', value: frontmatter.name });
    }

    // Search in description
    if (frontmatter.description && frontmatter.description.toLowerCase().includes(searchTerm)) {
      matches.push({ field: 'description', value: frontmatter.description });
    }

    // Search in role
    if (frontmatter.role && frontmatter.role.toLowerCase().includes(searchTerm)) {
      matches.push({ field: 'role', value: frontmatter.role });
    }

    // Search in tags
    if (frontmatter.tags) {
      frontmatter.tags.forEach(tag => {
        if (tag.toLowerCase().includes(searchTerm)) {
          matches.push({ field: 'tag', value: tag });
        }
      });
    }

    // Search in capabilities
    if (frontmatter.capabilities) {
      frontmatter.capabilities.forEach(capability => {
        if (capability.toLowerCase().includes(searchTerm)) {
          matches.push({ field: 'capability', value: capability });
        }
      });
    }

    // Search in content
    if (content && content.toLowerCase().includes(searchTerm)) {
      matches.push({ field: 'content', value: 'Found in agent content' });
    }

    return matches;
  }

  async validateAgent(name) {
    const agent = await this.getAgent(name);
    if (!agent) {
      return { valid: false, errors: [`Agent '${name}' not found`] };
    }

    const errors = validateAgentConfig(agent.frontmatter);
    
    // Additional validations
    if (agent.content.length < 100) {
      errors.push('Agent content is too short (should be at least 100 characters)');
    }

    // Check for required sections in content
    const requiredSections = ['# ', '## '];
    const hasHeadings = requiredSections.some(section => agent.content.includes(section));
    if (!hasHeadings) {
      errors.push('Agent content should include proper markdown headings');
    }

    return {
      valid: errors.length === 0,
      errors,
      agent
    };
  }

  async getAgentRoles() {
    const agents = await this.getAllAgents();
    const roles = new Set();

    for (const [, agent] of agents) {
      if (agent.frontmatter.role) {
        roles.add(agent.frontmatter.role);
      }
    }

    return Array.from(roles).sort();
  }

  async getAgentTags() {
    const agents = await this.getAllAgents();
    const tags = new Set();

    for (const [, agent] of agents) {
      if (agent.frontmatter.tags) {
        agent.frontmatter.tags.forEach(tag => tags.add(tag));
      }
    }

    return Array.from(tags).sort();
  }

  async checkDependencies(agentNames) {
    const agents = await this.getAllAgents();
    const dependencies = new Map();
    const conflicts = new Map();
    const missing = [];

    for (const agentName of agentNames) {
      const agent = agents.get(agentName);
      if (!agent) {
        missing.push(agentName);
        continue;
      }

      // Check dependencies
      if (agent.frontmatter.dependencies) {
        for (const dep of agent.frontmatter.dependencies) {
          if (!dependencies.has(dep)) {
            dependencies.set(dep, []);
          }
          dependencies.get(dep).push(agentName);
        }
      }

      // Check conflicts
      if (agent.frontmatter.conflicts) {
        for (const conflict of agent.frontmatter.conflicts) {
          if (!conflicts.has(conflict)) {
            conflicts.set(conflict, []);
          }
          conflicts.get(conflict).push(agentName);
        }
      }
    }

    // Find unmet dependencies
    const unmetDependencies = [];
    for (const [dep, dependents] of dependencies) {
      if (!agentNames.includes(dep)) {
        unmetDependencies.push({ dependency: dep, dependents });
      }
    }

    // Find conflicts
    const foundConflicts = [];
    for (const [conflict, conflictors] of conflicts) {
      if (agentNames.includes(conflict)) {
        foundConflicts.push({ conflicting: conflict, conflictors });
      }
    }

    return {
      dependencies: Array.from(dependencies.entries()),
      conflicts: Array.from(conflicts.entries()),
      unmetDependencies,
      foundConflicts,
      missing
    };
  }

  async refreshCache() {
    this.agentCache.clear();
    this.lastCacheUpdate = Date.now();
    return await this.getAllAgents();
  }
}

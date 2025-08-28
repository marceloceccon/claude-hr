import semver from 'semver';

/**
 * Validate team name according to naming conventions
 * @param {string} name - The team name to validate
 * @returns {string[]} Array of validation error messages (empty if valid)
 */
export function validateTeamName(name) {
  const errors = [];
  
  if (!name || typeof name !== 'string') {
    errors.push('Team name is required');
    return errors;
  }
  
  if (name.length < 2) {
    errors.push('Team name must be at least 2 characters');
  }
  
  if (name.length > 50) {
    errors.push('Team name must be less than 50 characters');
  }
  
  if (!/^[a-z][a-z0-9-]*$/i.test(name)) {
    errors.push('Team name must start with a letter and contain only letters, numbers, and hyphens');
  }
  
  return errors;
}

/**
 * Validate agent name according to naming conventions
 * @param {string} name - The agent name to validate
 * @returns {string[]} Array of validation error messages (empty if valid)
 */
export function validateAgentName(name) {
  const errors = [];
  
  if (!name || typeof name !== 'string') {
    errors.push('Agent name is required');
    return errors;
  }
  
  if (name.length < 2) {
    errors.push('Agent name must be at least 2 characters');
  }
  
  if (name.length > 50) {
    errors.push('Agent name must be less than 50 characters');
  }
  
  if (!/^[a-z][a-z0-9-]*$/i.test(name)) {
    errors.push('Agent name must start with a letter and contain only letters, numbers, and hyphens');
  }
  
  return errors;
}

/**
 * Validate semantic version string
 * @param {string} version - The version string to validate
 * @returns {string[]} Array of validation error messages (empty if valid)
 */
export function validateVersion(version) {
  if (!version || typeof version !== 'string') {
    return ['Version is required'];
  }
  
  if (!semver.valid(version)) {
    return ['Version must be a valid semantic version (e.g., 1.0.0)'];
  }
  
  return [];
}

export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return ['Email is required'];
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return ['Invalid email format'];
  }
  
  return [];
}

export function validateUrl(url) {
  if (!url || typeof url !== 'string') {
    return ['URL is required'];
  }
  
  try {
    new URL(url);
    return [];
  } catch {
    return ['Invalid URL format'];
  }
}

/**
 * Validate complete team configuration object
 * @param {Object} config - The team configuration to validate
 * @returns {string[]} Array of validation error messages (empty if valid)
 */
export function validateTeamConfig(config) {
  const errors = [];
  
  if (!config || typeof config !== 'object') {
    errors.push('Invalid team configuration');
    return errors;
  }
  
  // Required fields
  if (!config.name) {
    errors.push('Team name is required');
  } else {
    errors.push(...validateTeamName(config.name));
  }
  
  if (!config.description) {
    errors.push('Team description is required');
  } else if (typeof config.description !== 'string') {
    errors.push('Team description must be a string');
  }
  
  if (!config.version) {
    errors.push('Team version is required');
  } else {
    errors.push(...validateVersion(config.version));
  }
  
  // Agents array validation
  if (!Array.isArray(config.agents)) {
    errors.push('Agents must be an array');
  } else {
    config.agents.forEach((agent, index) => {
      if (!agent.name) {
        errors.push(`Agent at index ${index} is missing name`);
      } else {
        const nameErrors = validateAgentName(agent.name);
        nameErrors.forEach(err => errors.push(`Agent at index ${index}: ${err}`));
      }
      
      if (agent.priority !== undefined && (typeof agent.priority !== 'number' || agent.priority < 1)) {
        errors.push(`Agent at index ${index}: priority must be a positive number`);
      }
      
      if (agent.enabled !== undefined && typeof agent.enabled !== 'boolean') {
        errors.push(`Agent at index ${index}: enabled must be a boolean`);
      }
    });
  }
  
  // Metadata validation
  if (config.metadata) {
    if (typeof config.metadata !== 'object') {
      errors.push('Metadata must be an object');
    } else {
      if (config.metadata.tags && !Array.isArray(config.metadata.tags)) {
        errors.push('Metadata tags must be an array');
      }
      
      if (config.metadata.author && typeof config.metadata.author !== 'string') {
        errors.push('Metadata author must be a string');
      }
      
      if (config.metadata.license && typeof config.metadata.license !== 'string') {
        errors.push('Metadata license must be a string');
      }
    }
  }
  
  return errors;
}

export function validateAgentConfig(frontmatter) {
  const errors = [];
  
  if (!frontmatter || typeof frontmatter !== 'object') {
    errors.push('Invalid agent configuration');
    return errors;
  }
  
  // Required fields
  if (!frontmatter.name) {
    errors.push('Agent name is required');
  } else {
    errors.push(...validateAgentName(frontmatter.name));
  }
  
  if (!frontmatter.description) {
    errors.push('Agent description is required');
  } else if (typeof frontmatter.description !== 'string') {
    errors.push('Agent description must be a string');
  }
  
  if (!frontmatter.version) {
    errors.push('Agent version is required');
  } else {
    errors.push(...validateVersion(frontmatter.version));
  }
  
  if (!frontmatter.role) {
    errors.push('Agent role is required');
  } else if (typeof frontmatter.role !== 'string') {
    errors.push('Agent role must be a string');
  }
  
  // Optional arrays
  if (frontmatter.tags && !Array.isArray(frontmatter.tags)) {
    errors.push('Tags must be an array');
  }
  
  if (frontmatter.capabilities && !Array.isArray(frontmatter.capabilities)) {
    errors.push('Capabilities must be an array');
  }
  
  if (frontmatter.dependencies && !Array.isArray(frontmatter.dependencies)) {
    errors.push('Dependencies must be an array');
  }
  
  if (frontmatter.conflicts && !Array.isArray(frontmatter.conflicts)) {
    errors.push('Conflicts must be an array');
  }
  
  return errors;
}

export function validateWorkspaceConfig(config) {
  const errors = [];
  
  if (!config || typeof config !== 'object') {
    errors.push('Invalid workspace configuration');
    return errors;
  }
  
  if (config.activeTeam !== null && typeof config.activeTeam !== 'string') {
    errors.push('Active team must be a string or null');
  }
  
  if (!Array.isArray(config.localAgents)) {
    errors.push('Local agents must be an array');
  }
  
  if (!config.overrides || typeof config.overrides !== 'object') {
    errors.push('Overrides must be an object');
  } else if (!config.overrides.agents || typeof config.overrides.agents !== 'object') {
    errors.push('Overrides.agents must be an object');
  }
  
  if (!config.workspace || typeof config.workspace !== 'object') {
    errors.push('Workspace must be an object');
  } else {
    if (!config.workspace.name || typeof config.workspace.name !== 'string') {
      errors.push('Workspace name is required and must be a string');
    }
  }
  
  return errors;
}

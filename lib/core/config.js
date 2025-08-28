import { promises as _fs } from 'fs';
import path from 'path';
import os from 'os';
import fsExtra from 'fs-extra';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Configuration management class for Claude HR
 * Handles global and workspace-specific configuration
 */
export class Config {
  /**
   * Initialize configuration instance with default paths
   */
  constructor() {
    this.homeDir = os.homedir();
    this.globalConfigDir = path.join(this.homeDir, '.claude-hr');
    this.globalConfigFile = path.join(this.globalConfigDir, 'config.json');
    this.workspaceConfigFile = '.claude-hr/workspace.json';
    this.workspaceDir = '.claude-hr';
    this.packageRoot = path.resolve(__dirname, '../../');
  }

  /**
   * Ensure global configuration directory and files exist
   */
  async ensureGlobalConfig() {
    await fsExtra.ensureDir(this.globalConfigDir);
    await fsExtra.ensureDir(path.join(this.globalConfigDir, 'agents'));
    await fsExtra.ensureDir(path.join(this.globalConfigDir, 'templates'));
    
    if (!(await fsExtra.pathExists(this.globalConfigFile))) {
      await this.createDefaultGlobalConfig();
    }
  }

  /**
   * Create default global configuration with sensible defaults
   */
  async createDefaultGlobalConfig() {
    const defaultConfig = {
      version: '1.0.0',
      globalTeam: null,
      defaultEditor: 'code',
      agentsPaths: [
        path.join(this.globalConfigDir, 'agents'),
        './agents'
      ],
      templatesPaths: [
        path.join(this.globalConfigDir, 'templates')
      ]
    };

    await fsExtra.writeJson(this.globalConfigFile, defaultConfig, { spaces: 2 });
  }

  /**
   * Get global configuration, creating it if it doesn't exist
   * @returns {Object} Global configuration object
   */
  async getGlobalConfig() {
    await this.ensureGlobalConfig();
    return await fsExtra.readJson(this.globalConfigFile);
  }

  /**
   * Save global configuration to disk
   * @param {Object} config - Configuration object to save
   */
  async setGlobalConfig(config) {
    await this.ensureGlobalConfig();
    await fsExtra.writeJson(this.globalConfigFile, config, { spaces: 2 });
  }

  /**
   * Get workspace configuration for the specified directory
   * @param {string} cwd - Current working directory (defaults to process.cwd())
   * @returns {Object|null} Workspace configuration or null if not found
   */
  async getWorkspaceConfig(cwd = process.cwd()) {
    const workspaceConfigPath = path.join(cwd, this.workspaceConfigFile);
    
    if (await fsExtra.pathExists(workspaceConfigPath)) {
      return await fsExtra.readJson(workspaceConfigPath);
    }
    
    return null;
  }

  /**
   * Save workspace configuration to disk
   * @param {Object} config - Configuration object to save
   * @param {string} cwd - Current working directory (defaults to process.cwd())
   */
  async setWorkspaceConfig(config, cwd = process.cwd()) {
    const workspaceConfigPath = path.join(cwd, this.workspaceConfigFile);
    const workspaceDirPath = path.join(cwd, this.workspaceDir);
    
    await fsExtra.ensureDir(workspaceDirPath);
    await fsExtra.writeJson(workspaceConfigPath, config, { spaces: 2 });
  }

  async initWorkspace(cwd = process.cwd()) {
    const workspaceDirPath = path.join(cwd, this.workspaceDir);
    await fsExtra.ensureDir(workspaceDirPath);

    const defaultWorkspaceConfig = {
      activeTeam: null,
      localAgents: [],
      overrides: {
        agents: {}
      },
      workspace: {
        name: path.basename(cwd),
        type: null,
        framework: null
      }
    };

    await this.setWorkspaceConfig(defaultWorkspaceConfig, cwd);
    return defaultWorkspaceConfig;
  }

  async isWorkspaceInitialized(cwd = process.cwd()) {
    return await fsExtra.pathExists(path.join(cwd, this.workspaceConfigFile));
  }

  async getMergedConfig(cwd = process.cwd()) {
    const globalConfig = await this.getGlobalConfig();
    const workspaceConfig = await this.getWorkspaceConfig(cwd);

    if (!workspaceConfig) {
      return {
        ...globalConfig,
        activeTeam: globalConfig.globalTeam,
        isWorkspace: false
      };
    }

    return {
      ...globalConfig,
      ...workspaceConfig,
      activeTeam: workspaceConfig.activeTeam || globalConfig.globalTeam,
      isWorkspace: true
    };
  }

  async getAgentsPaths() {
    const config = await this.getMergedConfig();
    const paths = [...config.agentsPaths];
    
    // Add package built-in agents path
    paths.unshift(path.join(this.packageRoot, 'agents'));
    
    return paths;
  }

  async getTemplatesPaths() {
    const config = await this.getMergedConfig();
    const paths = [...config.templatesPaths];
    
    // Add package built-in templates path
    paths.unshift(path.join(this.packageRoot, 'templates'));
    
    return paths;
  }

  async getConfigValue(key) {
    const config = await this.getMergedConfig();
    return this.getNestedValue(config, key);
  }

  async setConfigValue(key, value, isGlobal = false) {
    if (isGlobal) {
      const config = await this.getGlobalConfig();
      this.setNestedValue(config, key, value);
      await this.setGlobalConfig(config);
    } else {
      const cwd = process.cwd();
      if (!(await this.isWorkspaceInitialized(cwd))) {
        throw new Error('No workspace initialized. Use "claude-hr workspace init" first.');
      }
      
      const config = await this.getWorkspaceConfig(cwd);
      this.setNestedValue(config, key, value);
      await this.setWorkspaceConfig(config, cwd);
    }
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!(key in current)) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }
}

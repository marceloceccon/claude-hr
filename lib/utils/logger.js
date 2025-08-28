import chalk from 'chalk';

class Logger {
  constructor(options = {}) {
    this.level = options.level || 'info';
    this.silent = options.silent || false;
    this.prefix = options.prefix || 'claude-hr';
  }

  _log(level, color, icon, message, ...args) {
    if (this.silent) return;
    
    const levels = { error: 0, warn: 1, info: 2, debug: 3 };
    const currentLevel = levels[this.level] || 2;
    const messageLevel = levels[level] || 2;
    
    if (messageLevel > currentLevel) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `${chalk.gray(`[${timestamp}]`)} ${chalk.blue(this.prefix)}`;
    const levelIndicator = color(`${icon} `);
    
    console.log(`${prefix} ${levelIndicator}${message}`, ...args);
  }

  error(message, ...args) {
    this._log('error', chalk.red, '✗', message, ...args);
  }

  warn(message, ...args) {
    this._log('warn', chalk.yellow, '⚠', message, ...args);
  }

  info(message, ...args) {
    this._log('info', chalk.blue, 'ℹ', message, ...args);
  }

  success(message, ...args) {
    this._log('info', chalk.green, '✓', message, ...args);
  }

  debug(message, ...args) {
    this._log('debug', chalk.gray, '🐛', message, ...args);
  }

  log(message, ...args) {
    if (!this.silent) {
      console.log(message, ...args);
    }
  }

  setLevel(level) {
    this.level = level;
  }

  setSilent(silent) {
    this.silent = silent;
  }
}

export const logger = new Logger();

export function createLogger(options) {
  return new Logger(options);
}

// Utility functions for common patterns
export function logStep(message) {
  logger.info(chalk.blue('→ ') + message);
}

export function logSuccess(message) {
  logger.success(message);
}

export function logError(message, error) {
  logger.error(message);
  if (error && error.message) {
    logger.error(chalk.gray(error.message));
  }
}

export function logWarning(message) {
  logger.warn(message);
}

export function logInfo(message) {
  logger.info(message);
}

export function logDebug(message) {
  logger.debug(message);
}

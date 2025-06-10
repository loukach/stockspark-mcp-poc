class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
  }

  shouldLog(level) {
    return this.levels[level] <= this.levels[this.logLevel];
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (data) {
      return `${prefix} ${message} ${JSON.stringify(data, null, 2)}`;
    }
    return `${prefix} ${message}`;
  }

  error(message, data = null) {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, data));
    }
  }

  warn(message, data = null) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, data));
    }
  }

  info(message, data = null) {
    if (this.shouldLog('info')) {
      console.error(this.formatMessage('info', message, data)); // Use stderr for MCP
    }
  }

  debug(message, data = null) {
    if (this.shouldLog('debug')) {
      console.error(this.formatMessage('debug', message, data)); // Use stderr for MCP
    }
  }

  // Special method for API request/response logging
  apiRequest(method, url, data = null) {
    this.info(`API Request: ${method} ${url}`, data ? { body: data } : null);
  }

  apiResponse(status, statusText, url, data = null) {
    const level = status >= 400 ? 'error' : 'info';
    this[level](`API Response: ${status} ${statusText}`, data ? { url, response: data } : { url });
  }

  // Method for performance timing
  time(label) {
    if (this.shouldLog('debug')) {
      console.time(label);
    }
  }

  timeEnd(label) {
    if (this.shouldLog('debug')) {
      console.timeEnd(label);
    }
  }
}

// Create singleton instance
const logger = new Logger();

module.exports = { logger, Logger };
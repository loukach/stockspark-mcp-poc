const fetch = require('node-fetch');
const { handleApiError, withRetry, ValidationError } = require('../utils/errors');
const { logger } = require('../utils/logger');

class StockSparkClient {
  constructor(authManager) {
    this.auth = authManager;
    this.validateEnvironment();
  }

  validateEnvironment() {
    const required = [
      'STOCKSPARK_API_URL'
      // Country is now optional - will be determined dynamically
    ];

    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
      throw new ValidationError(`Missing required environment variables: ${missing.join(', ')}`, {
        missingVariables: missing,
        hint: 'Check your .env file or environment configuration'
      });
    }
  }
  
  async request(path, options = {}) {
    const method = options.method || 'GET';
    // Allow country override in options, fallback to env, default to 'it'
    const country = options.country || process.env.STOCKSPARK_COUNTRY || 'it';
    const url = `${process.env.STOCKSPARK_API_URL}/${country}${path}`;
    
    try {
      return await withRetry(async () => {
        const token = await this.auth.getToken();
        
        logger.apiRequest(method, url, options.body ? JSON.parse(options.body) : null);
        
        const response = await fetch(url, {
          ...options,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers
          }
        });
        
        logger.apiResponse(response.status, response.statusText, url);
        
        // Handle different response statuses
        if (!response.ok) {
          let errorBody;
          try {
            const bodyText = await response.text();
            try {
              errorBody = JSON.parse(bodyText);
            } catch (e) {
              errorBody = bodyText;
            }
          } catch (e) {
            errorBody = 'Unable to read response body';
          }
          
          const error = new Error(`API Error: ${response.status} ${response.statusText}`);
          error.response = { status: response.status, statusText: response.statusText };
          error.body = errorBody;
          throw error;
        }
        
        // Handle empty responses
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          return response.text();
        }
        
        return response.json();
      }, 3, 1000);
      
    } catch (error) {
      handleApiError(error, {
        operation: `${method} ${path}`,
        resource: this.extractResourceFromPath(path),
        url
      });
    }
  }

  extractResourceFromPath(path) {
    if (path.includes('/vehicle/')) {
      const match = path.match(/\/vehicle\/(\d+)/);
      return match ? `Vehicle ${match[1]}` : 'Vehicle';
    }
    if (path.includes('/publications/')) {
      return 'Publication';
    }
    if (path.includes('/images/')) {
      return 'Image';
    }
    return 'API Resource';
  }

  // Convenience methods for common HTTP verbs
  async get(path, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const fullPath = queryString ? `${path}?${queryString}` : path;
    return this.request(fullPath, { method: 'GET' });
  }

  async post(path, data) {
    return this.request(path, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async put(path, data) {
    return this.request(path, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async patch(path, data) {
    return this.request(path, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async delete(path) {
    return this.request(path, { method: 'DELETE' });
  }
}

module.exports = { StockSparkClient };
const fetch = require('node-fetch');
const { logger } = require('./utils/logger');

class AuthManager {
  constructor() {
    this.token = null;
    this.tokenExpiry = null;
    this.validateEnvironment();
  }

  validateEnvironment() {
    const required = [
      'STOCKSPARK_USERNAME',
      'STOCKSPARK_PASSWORD',
      'STOCKSPARK_CLIENT_ID',
      'STOCKSPARK_AUTH_URL'
    ];

    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  async getToken() {
    if (this.token && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.token;
    }
    
    const response = await fetch(process.env.STOCKSPARK_AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'password',
        client_id: process.env.STOCKSPARK_CLIENT_ID,
        username: process.env.STOCKSPARK_USERNAME,
        password: process.env.STOCKSPARK_PASSWORD
      })
    });
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Auth failed: ${response.status} ${response.statusText} - ${text}`);
    }
    
    const data = await response.json();
    this.token = data.access_token;
    this.tokenExpiry = new Date(Date.now() + (data.expires_in - 60) * 1000);
    
    logger.debug(`Token obtained, expires at: ${this.tokenExpiry.toISOString()}`);
    return this.token;
  }

  isTokenValid() {
    return this.token && this.tokenExpiry && this.tokenExpiry > new Date();
  }

  clearToken() {
    this.token = null;
    this.tokenExpiry = null;
  }
}

module.exports = { AuthManager };
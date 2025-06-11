/**
 * StockSpark/MotorK API Constants
 * 
 * This file contains all hardcoded URLs, client IDs, and other constants
 * that never change for the StockSpark/MotorK platform.
 * 
 * These values are the same for all users and environments.
 */

module.exports = {
  // Authentication Configuration
  AUTH: {
    CLIENT_ID: 'carspark-api',
    URL: 'https://auth.motork.io/realms/prod/protocol/openid-connect/token'
  },

  // API Base URLs
  API: {
    // Main StockSpark API for vehicles, images, publications, etc.
    BASE_URL: 'https://carspark-api.dealerk.com',
    
    // Leads API (uses different base URL)
    LEADS_URL: 'https://api.dealerk.it:443'
  },

  // Default Values
  DEFAULTS: {
    COUNTRY: 'it',
    VEHICLE_CLASS: 'car'
  },

  // API Endpoints (relative paths)
  ENDPOINTS: {
    AUTH: '/realms/prod/protocol/openid-connect/token',
    LEADS: '/v2/{apiKey}/lead/list'
  }
};
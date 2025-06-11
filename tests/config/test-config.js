/**
 * Centralized test configuration for StockSpark MCP tests
 * Contains all common environment variables, test data, and utilities
 */

// Environment Configuration
const TEST_CONFIG = {
  // Authentication
  auth: {
    username: process.env.STOCKSPARK_USERNAME || 'your-email@example.com',
    password: process.env.STOCKSPARK_PASSWORD || 'your-password'
    // clientId and authUrl are now hardcoded in auth.js
  },
  
  // API Configuration
  api: {
    // baseUrl is now hardcoded in client.js
    country: 'it'
  },
  
  // Company/Dealer Configuration
  company: {
    companyId: '35430',
    dealerId: '196036'
  }
};

// Test Data Templates
const TEST_DATA = {
  // Mercedes S 500 2021 example
  mercedesS500: {
    make_name: 'Mercedes-Benz',
    model_name: 'Classe S',
    version_name: 'S 500',
    year: 2021,
    price: 34000,
    mileage: 87000,
    condition: 'USED',
    color: 'nero',
    fuel: 'PETROL',
    transmission: 'AUTOMATIC',
    model_id: '29221', // Known from previous tests
    trimId: '100026891520210101' // Working trim ID for 2021 S 500
  },
  
  // Minimal working vehicle payload (from successful tests)
  workingVehiclePayload: {
    companyId: 35430,
    dealerId: 196036,
    make: { name: "Mercedes-Benz" },
    model: { name: "Classe S" },
    version: { name: "S 500" },
    constructionYear: "2021",
    fuel: { name: "PETROL" },
    gearbox: { name: "AUTOMATIC" },
    condition: { name: "USED" },
    priceGross: { consumerPrice: 34000 },
    priceNet: { consumerPrice: 34000 },
    mileage: 87000,
    vehicleClass: { name: "car" },
    status: { name: "FREE" },
    wheelFormula: { name: "FRONT" },
    vatRate: 0,
    constructionDate: "2021-01-01T00:00:00.000Z",
    body: { name: "SEDAN" },
    doors: 4,
    seat: 5,
    power: 330,
    powerHp: 449,
    cubicCapacity: 2999,
    cylinders: 6,
    accidentDamaged: false,
    billable: true,
    comingSoon: false,
    corporate: false,
    deductible: false,
    demo: false,
    lastMinuteOffer: false,
    luxury: false,
    negotiable: true,
    noviceDrivable: true,
    onSale: true,
    promptDelivery: false,
    reservedNegotiation: false,
    servicingDoc: false,
    visibility: true,
    warranty: false,
    firstRegistration: "202101"
    // NOTE: color field intentionally omitted (causes validation errors)
  },
  
  // Other test vehicles
  fiatPanda: {
    make_name: 'Fiat',
    model_name: 'Panda',
    year: 2020,
    price: 12000,
    condition: 'USED'
  }
};

// Common Test Utilities
class TestUtils {
  /**
   * Set up environment variables for tests
   */
  static setupEnvironment() {
    process.env.STOCKSPARK_USERNAME = TEST_CONFIG.auth.username;
    process.env.STOCKSPARK_PASSWORD = TEST_CONFIG.auth.password;
    // clientId, authUrl, and apiUrl are now hardcoded
    process.env.STOCKSPARK_COUNTRY = TEST_CONFIG.api.country;
    process.env.STOCKSPARK_COMPANY_ID = TEST_CONFIG.company.companyId;
    process.env.STOCKSPARK_DEALER_ID = TEST_CONFIG.company.dealerId;
  }
  
  /**
   * Create API client instances
   */
  static async createClients() {
    const { AuthManager } = require('../../src/auth');
    const { StockSparkClient } = require('../../src/api/client');
    const { VehicleAPI } = require('../../src/api/vehicles');
    const { ImageAPI } = require('../../src/api/images');
    const { PublicationAPI } = require('../../src/api/publications');
    const { ReferenceAPI } = require('../../src/api/reference');
    
    const authManager = new AuthManager();
    const client = new StockSparkClient(authManager);
    const vehicleAPI = new VehicleAPI(client);
    const imageAPI = new ImageAPI(client);
    const publicationAPI = new PublicationAPI(client);
    const referenceAPI = new ReferenceAPI(client);
    
    return { authManager, client, vehicleAPI, imageAPI, publicationAPI, referenceAPI };
  }
  
  /**
   * Standard test result formatter
   */
  static formatTestResult(testName, success, details = '') {
    const status = success ? '✅ PASS' : '❌ FAIL';
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${status}: ${testName}`);
    if (details) {
      console.log(`   ${details}`);
    }
    return { testName, success, details, timestamp };
  }
  
  /**
   * Wait for a specified time (useful for API rate limiting)
   */
  static async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Generate unique test data to avoid conflicts
   */
  static generateUniqueTestData(baseData) {
    const timestamp = Date.now();
    return {
      ...baseData,
      mileage: (baseData.mileage || 50000) + Math.floor(Math.random() * 1000),
      price: (baseData.price || 20000) + Math.floor(Math.random() * 1000)
    };
  }
}

module.exports = {
  TEST_CONFIG,
  TEST_DATA,
  TestUtils
};
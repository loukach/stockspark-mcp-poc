#!/usr/bin/env node

/**
 * Unit Test: API Connection
 * Tests basic authentication and API connectivity
 */

const { TestUtils } = require('../config/test-config');

async function testConnection() {
  console.log('🔌 Testing API Connection...\n');
  
  TestUtils.setupEnvironment();
  
  try {
    const { authManager, client } = await TestUtils.createClients();
    
    // Test 1: Authentication
    const token = await authManager.getToken();
    TestUtils.formatTestResult('Authentication', !!token, `Token received: ${token ? 'Yes' : 'No'}`);
    
    // Test 2: Basic API call
    const response = await client.get('/vehicle', { size: 1 });
    TestUtils.formatTestResult('Basic API Call', !!response, `Response received with ${response.totalVehicles || 0} total vehicles`);
    
    console.log('\n✅ Connection tests completed successfully');
    return true;
    
  } catch (error) {
    TestUtils.formatTestResult('Connection Test', false, error.message);
    console.log('\n❌ Connection tests failed');
    return false;
  }
}

if (require.main === module) {
  testConnection().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testConnection };
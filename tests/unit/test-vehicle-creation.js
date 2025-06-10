#!/usr/bin/env node

/**
 * Unit Test: Vehicle Creation
 * Tests vehicle creation using known working payloads
 */

const { TestUtils, TEST_DATA } = require('../config/test-config');

async function testVehicleCreation() {
  console.log('🚗 Testing Vehicle Creation...\n');
  
  TestUtils.setupEnvironment();
  
  try {
    const { client } = await TestUtils.createClients();
    
    // Test 1: Create vehicle with known working payload
    const testVehicle = TestUtils.generateUniqueTestData(TEST_DATA.workingVehiclePayload);
    
    console.log('Testing with payload:', JSON.stringify(testVehicle, null, 2));
    
    const result = await client.post('/vehicle', testVehicle);
    
    const success = result && result.vehicleId;
    TestUtils.formatTestResult(
      'Vehicle Creation', 
      success, 
      success ? `Vehicle created with ID: ${result.vehicleId}` : 'No vehicle ID returned'
    );
    
    if (success) {
      // Test 2: Verify created vehicle exists
      const verification = await client.get(`/vehicle/${result.vehicleId}`);
      TestUtils.formatTestResult(
        'Vehicle Verification',
        !!verification,
        `Vehicle ${result.vehicleId} exists: ${verification.make?.name} ${verification.model?.name}`
      );
    }
    
    console.log('\n✅ Vehicle creation tests completed');
    return success;
    
  } catch (error) {
    TestUtils.formatTestResult('Vehicle Creation', false, error.message);
    console.log('\n❌ Vehicle creation tests failed');
    return false;
  }
}

if (require.main === module) {
  testVehicleCreation().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testVehicleCreation };
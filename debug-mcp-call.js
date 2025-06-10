#!/usr/bin/env node

/**
 * Debug MCP Tool Call
 * Simulates calling upload_vehicle_images_from_data to help debug issues
 */

require('dotenv').config();
const { TestUtils, TEST_DATA } = require('./tests/config/test-config');

// Simple test image as base64 (1x1 red pixel PNG)
const TEST_IMAGE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9h2/M8AAAAABJRU5ErkJggg==';

async function debugMCPCall() {
  console.log('🔍 Debug MCP Call: upload_vehicle_images_from_data\n');
  
  TestUtils.setupEnvironment();
  
  try {
    // Import the tool handler directly
    const toolHandlers = require('./src/index');
    
    // Test vehicle ID (you can change this)
    const testVehicleId = 9700534; // From our test above
    
    console.log('Simulating MCP call with data:');
    const args = {
      vehicleId: testVehicleId,
      imageData: [
        {
          data: TEST_IMAGE_BASE64,
          mimeType: 'image/png',
          filename: 'debug_test.png'
        }
      ],
      mainImageIndex: 0
    };
    
    console.log('Args:', JSON.stringify(args, null, 2));
    console.log('\nCalling upload_vehicle_images_from_data...\n');
    
    // This would be called by the MCP server
    const result = await toolHandlers.upload_vehicle_images_from_data(args);
    
    console.log('✅ MCP Call successful!');
    console.log('Result:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ MCP Call failed:', error.message);
    console.error('Stack:', error.stack);
    
    // Common debugging tips
    console.log('\n🔧 Debugging tips:');
    console.log('1. Check if base64 data is complete (no truncation)');
    console.log('2. Verify vehicle ID exists');
    console.log('3. Check environment variables');
    console.log('4. Ensure imageData array has required fields: data, mimeType');
    
    if (error.message.includes('vehicle')) {
      console.log('💡 Vehicle-related error - try a different vehicle ID');
    }
    
    if (error.message.includes('base64')) {
      console.log('💡 Base64 error - check data format');
    }
    
    if (error.message.includes('401') || error.message.includes('auth')) {
      console.log('💡 Authentication error - check credentials');
    }
  }
}

// Test with different scenarios
async function testScenarios() {
  console.log('🧪 Testing different scenarios:\n');
  
  // Scenario 1: Valid data
  console.log('Scenario 1: Valid data');
  await debugMCPCall();
  
  // Scenario 2: Invalid vehicle ID
  console.log('\n\nScenario 2: Invalid vehicle ID');
  try {
    const { upload_vehicle_images_from_data } = require('./src/index');
    await upload_vehicle_images_from_data({
      vehicleId: 999999999,
      imageData: [{ data: TEST_IMAGE_BASE64, mimeType: 'image/png' }]
    });
  } catch (error) {
    console.log('Expected error:', error.message);
  }
  
  // Scenario 3: Missing imageData
  console.log('\n\nScenario 3: Missing imageData');
  try {
    const { upload_vehicle_images_from_data } = require('./src/index');
    await upload_vehicle_images_from_data({
      vehicleId: 9700534
      // Missing imageData
    });
  } catch (error) {
    console.log('Expected error:', error.message);
  }
  
  // Scenario 4: Invalid base64
  console.log('\n\nScenario 4: Invalid base64');
  try {
    const { upload_vehicle_images_from_data } = require('./src/index');
    await upload_vehicle_images_from_data({
      vehicleId: 9700534,
      imageData: [{ data: 'invalid-base64', mimeType: 'image/png' }]
    });
  } catch (error) {
    console.log('Expected error:', error.message);
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--scenarios')) {
    testScenarios();
  } else {
    debugMCPCall();
  }
}

module.exports = { debugMCPCall };
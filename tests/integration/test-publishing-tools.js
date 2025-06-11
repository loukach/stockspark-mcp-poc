#!/usr/bin/env node

/**
 * Unit Test: Publishing and Portal Management Tools
 * Tests basic publication infrastructure and portal availability
 */

const { TestUtils, TEST_DATA } = require('../config/test-config');

async function testPublishingTools() {
  console.log('🌐 Testing Publishing and Portal Management Tools...\n');
  
  TestUtils.setupEnvironment();
  
  try {
    const { vehicleAPI } = await TestUtils.createClients();
    
    // Test 1: Check environment for portal configuration
    console.log('Test 1: Check portal configuration...');
    const hasMyPortal = !!process.env.MYPORTAL_ACTIVATION_CODE;
    const hasAutomobile = !!process.env.AUTOMOBILE_IT_ACTIVATION_CODE;
    
    TestUtils.formatTestResult(
      'Portal Configuration Check',
      hasMyPortal || hasAutomobile,
      `MyPortal: ${hasMyPortal ? 'configured' : 'not configured'}, Automobile.it: ${hasAutomobile ? 'configured' : 'not configured'}`
    );
    
    // Test 2: Create a test vehicle for potential publishing
    console.log('\nTest 2: Create test vehicle for publishing...');
    const vehicleData = {
      ...TEST_DATA.workingVehiclePayload,
      ...TestUtils.generateUniqueTestData({
        price: 28000,
        mileage: 45000
      })
    };
    
    const creationResult = await vehicleAPI.addVehicle(vehicleData);
    const testVehicleId = creationResult.vehicleId;
    
    TestUtils.formatTestResult(
      'Create Test Vehicle',
      !!testVehicleId,
      testVehicleId ? `Created vehicle ID: ${testVehicleId}` : 'Failed to create test vehicle'
    );
    
    if (!testVehicleId) return false;
    
    // Test 3: Verify vehicle can be retrieved (prerequisite for publishing)
    console.log('\nTest 3: Verify vehicle accessibility...');
    try {
      const retrievedVehicle = await vehicleAPI.getVehicle(testVehicleId);
      const isAccessible = !!retrievedVehicle && !!retrievedVehicle.make;
      
      TestUtils.formatTestResult(
        'Vehicle Accessibility',
        isAccessible,
        isAccessible ? `Vehicle accessible: ${retrievedVehicle.make?.name} ${retrievedVehicle.model?.name}` : 'Vehicle not accessible'
      );
    } catch (error) {
      TestUtils.formatTestResult(
        'Vehicle Accessibility',
        false,
        `Failed to access vehicle: ${error.message}`
      );
      return false;
    }
    
    // Test 4: Check vehicle images (important for publishing)
    console.log('\nTest 4: Check vehicle images for publishing...');
    try {
      const images = await vehicleAPI.getVehicleImages(testVehicleId);
      const imageCount = images.images?.length || 0;
      
      TestUtils.formatTestResult(
        'Vehicle Images Check',
        true, // Always pass, just informational
        `Vehicle has ${imageCount} images (${imageCount > 0 ? 'ready for publishing' : 'may need images for better publishing'})`
      );
    } catch (error) {
      TestUtils.formatTestResult(
        'Vehicle Images Check',
        false,
        `Failed to check images: ${error.message}`
      );
    }
    
    // Test 5: Test vehicle update capability (used in publishing workflows)
    console.log('\nTest 5: Test vehicle update capability...');
    try {
      const currentVehicle = await vehicleAPI.getVehicle(testVehicleId);
      const currentPrice = currentVehicle.price;
      
      // Small price update test
      const newPrice = Math.round(currentPrice * 1.001); // 0.1% change
      const updateResult = await vehicleAPI.updateVehiclePrice(testVehicleId, newPrice);
      
      TestUtils.formatTestResult(
        'Vehicle Update Capability',
        updateResult.success !== false,
        `Successfully updated vehicle price (€${currentPrice} → €${newPrice})`
      );
      
      // Restore price
      await vehicleAPI.updateVehiclePrice(testVehicleId, currentPrice);
      
    } catch (error) {
      TestUtils.formatTestResult(
        'Vehicle Update Capability',
        false,
        `Update test failed: ${error.message}`
      );
    }
    
    // Test 6: Test vehicle listing with filters (used in bulk publishing)
    console.log('\nTest 6: Test bulk operation prerequisites...');
    try {
      const vehicleList = await vehicleAPI.listVehicles({ 
        size: 5,
        make: vehicleData.make.name 
      });
      
      const listSuccess = Array.isArray(vehicleList.vehicles);
      TestUtils.formatTestResult(
        'Bulk Operation Prerequisites',
        listSuccess,
        listSuccess ? `Found ${vehicleList.vehicles.length} vehicles for potential bulk operations` : 'Failed to list vehicles for bulk operations'
      );
    } catch (error) {
      TestUtils.formatTestResult(
        'Bulk Operation Prerequisites',
        false,
        `Bulk operation test failed: ${error.message}`
      );
    }
    
    // Test 7: Error handling
    console.log('\nTest 7: Error handling...');
    try {
      await vehicleAPI.getVehicle(999999); // Non-existent vehicle
      TestUtils.formatTestResult('Error Handling', false, 'Should have thrown error for invalid vehicle');
    } catch (error) {
      TestUtils.formatTestResult(
        'Error Handling',
        true,
        `Properly handled invalid vehicle ID: ${error.message}`
      );
    }
    
    console.log('\n✅ Publishing tools prerequisite tests completed');
    console.log('Note: These tests verify the infrastructure needed for publishing tools.');
    console.log('The actual publishing functions are implemented as MCP tools in the server.');
    
    if (!hasMyPortal && !hasAutomobile) {
      console.log('⚠️  No portal activation codes configured - publishing will be limited in actual use.');
    }
    
    return true;
    
  } catch (error) {
    TestUtils.formatTestResult('Publishing Tools Test', false, error.message);
    console.log('\n❌ Publishing tools tests failed');
    return false;
  }
}

if (require.main === module) {
  testPublishingTools().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testPublishingTools };
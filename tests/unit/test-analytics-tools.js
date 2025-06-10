#!/usr/bin/env node

/**
 * Unit Test: Analytics and Business Intelligence Tools
 * Tests basic analytics functionality and data availability
 */

const { TestUtils, TEST_DATA } = require('../config/test-config');

async function testAnalyticsTools() {
  console.log('📊 Testing Analytics and Business Intelligence Tools...\n');
  
  TestUtils.setupEnvironment();
  
  try {
    const { vehicleAPI } = await TestUtils.createClients();
    
    // Test 1: Basic vehicle listing (prerequisite for analytics)
    console.log('Test 1: Get vehicle list for analytics...');
    const vehicleListResult = await vehicleAPI.listVehicles({ size: 10 });
    
    const listSuccess = Array.isArray(vehicleListResult.vehicles);
    TestUtils.formatTestResult(
      'Get Vehicle List',
      listSuccess,
      listSuccess ? `Found ${vehicleListResult.vehicles.length} vehicles in inventory` : 'Failed to get vehicle list'
    );
    
    // Test 2: Verify we have vehicles for analytics
    const hasVehicles = listSuccess && vehicleListResult.vehicles.length > 0;
    TestUtils.formatTestResult(
      'Vehicles Available for Analytics',
      hasVehicles,
      hasVehicles ? `${vehicleListResult.vehicles.length} vehicles available for analysis` : 'No vehicles available for analytics'
    );
    
    // Test 3: Get detailed vehicle information (used in analytics)
    if (hasVehicles && vehicleListResult.vehicles.length > 0) {
      console.log('\nTest 3: Get detailed vehicle data...');
      const firstVehicle = vehicleListResult.vehicles[0];
      
      try {
        const detailedVehicle = await vehicleAPI.getVehicle(firstVehicle.vehicleId);
        const hasDetails = !!detailedVehicle && !!detailedVehicle.make;
        
        TestUtils.formatTestResult(
          'Get Detailed Vehicle Data',
          hasDetails,
          hasDetails ? `Retrieved details for ${detailedVehicle.make?.name} ${detailedVehicle.model?.name}` : 'Failed to get vehicle details'
        );
      } catch (error) {
        TestUtils.formatTestResult(
          'Get Detailed Vehicle Data',
          false,
          `Failed to get vehicle details: ${error.message}`
        );
      }
    }
    
    // Test 4: Test vehicle search functionality (used in analytics)
    console.log('\nTest 4: Test vehicle search functionality...');
    try {
      const searchResult = await vehicleAPI.searchVehicles('Mercedes');
      const searchSuccess = Array.isArray(searchResult.vehicles);
      
      TestUtils.formatTestResult(
        'Vehicle Search Functionality',
        searchSuccess,
        searchSuccess ? `Search found ${searchResult.vehicles?.length || 0} Mercedes vehicles` : 'Search functionality failed'
      );
    } catch (error) {
      TestUtils.formatTestResult(
        'Vehicle Search Functionality',
        false,
        `Search failed: ${error.message}`
      );
    }
    
    // Test 5: Test price update functionality (used in bulk operations)
    if (hasVehicles && vehicleListResult.vehicles.length > 0) {
      console.log('\nTest 5: Test price update functionality...');
      const testVehicle = vehicleListResult.vehicles[0];
      
      try {
        // Get current price
        const currentVehicle = await vehicleAPI.getVehicle(testVehicle.vehicleId);
        const currentPrice = currentVehicle.price;
        
        // Test price update (small change)
        const newPrice = Math.round(currentPrice * 1.01); // 1% increase
        const updateResult = await vehicleAPI.updateVehiclePrice(testVehicle.vehicleId, newPrice);
        
        TestUtils.formatTestResult(
          'Price Update Functionality',
          updateResult.success !== false,
          `Updated price from €${currentPrice} to €${newPrice}`
        );
        
        // Restore original price
        await vehicleAPI.updateVehiclePrice(testVehicle.vehicleId, currentPrice);
        
      } catch (error) {
        TestUtils.formatTestResult(
          'Price Update Functionality',
          false,
          `Price update failed: ${error.message}`
        );
      }
    }
    
    // Test 6: Error handling for analytics operations
    console.log('\nTest 6: Error handling...');
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
    
    // Test 7: Vehicle list filtering (used in analytics)
    console.log('\nTest 7: Test vehicle filtering...');
    try {
      const filteredResult = await vehicleAPI.listVehicles({ 
        size: 5,
        make: 'Mercedes-Benz'
      });
      
      const filterSuccess = Array.isArray(filteredResult.vehicles);
      TestUtils.formatTestResult(
        'Vehicle Filtering',
        filterSuccess,
        filterSuccess ? `Filtered search found ${filteredResult.vehicles.length} Mercedes-Benz vehicles` : 'Filtering failed'
      );
    } catch (error) {
      TestUtils.formatTestResult(
        'Vehicle Filtering',
        false,
        `Filtering failed: ${error.message}`
      );
    }
    
    console.log('\n✅ Analytics tools prerequisite tests completed');
    console.log('Note: These tests verify the underlying APIs needed for analytics tools.');
    console.log('The analytics functions themselves are implemented as MCP tools in the server.');
    return true;
    
  } catch (error) {
    TestUtils.formatTestResult('Analytics Tools Test', false, error.message);
    console.log('\n❌ Analytics tools tests failed');
    return false;
  }
}

if (require.main === module) {
  testAnalyticsTools().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testAnalyticsTools };
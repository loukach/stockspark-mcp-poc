#!/usr/bin/env node

/**
 * Unit Test: Vehicle Reference Data Tools
 * Tests vehicle reference data lookup and search functionality
 */

const { TestUtils, TEST_DATA } = require('../config/test-config');

async function testReferenceNavigation() {
  console.log('🔍 Testing Vehicle Reference Data Tools...\n');
  
  TestUtils.setupEnvironment();
  
  try {
    const { referenceAPI } = await TestUtils.createClients();
    
    // Test 1: Find models by make (core reference functionality)
    console.log('Test 1: Find models by make...');
    const modelsResult = await referenceAPI.findModelsByMake('it', 'Mercedes-Benz', 'car');
    
    const modelsSuccess = modelsResult.count > 0;
    TestUtils.formatTestResult(
      'Find Models by Make',
      modelsSuccess,
      modelsSuccess ? `Found ${modelsResult.count} Mercedes-Benz models` : 'No models found for Mercedes-Benz'
    );
    
    // Test 2: Get vehicle trims for a known model
    if (modelsSuccess && modelsResult.models.length > 0) {
      console.log('\nTest 2: Get vehicle trims...');
      const testModel = modelsResult.models.find(m => m.name.toLowerCase().includes('classe s')) || modelsResult.models[0];
      
      const trimsResult = await referenceAPI.getVehicleTrims('it', testModel.id);
      const trimsSuccess = Array.isArray(trimsResult.trims) && trimsResult.trims.length > 0;
      
      TestUtils.formatTestResult(
        'Get Vehicle Trims',
        trimsSuccess,
        trimsSuccess ? `Found ${trimsResult.trims.length} trims for ${testModel.name}` : `No trims found for ${testModel.name}`
      );
      
      // Test 3: Get trims with year filter
      if (trimsSuccess) {
        console.log('\nTest 3: Get trims with year filter...');
        const filteredTrimsResult = await referenceAPI.getVehicleTrims('it', testModel.id, null, null, '01-2021');
        const filteredSuccess = Array.isArray(filteredTrimsResult.trims);
        
        TestUtils.formatTestResult(
          'Get Filtered Trims (2021)',
          filteredSuccess,
          filteredSuccess ? `Found ${filteredTrimsResult.trims.length} 2021 trims for ${testModel.name}` : 'Failed to filter trims by year'
        );
        
        // Test 4: Compile vehicle from trim
        if (filteredSuccess && filteredTrimsResult.trims.length > 0) {
          console.log('\nTest 4: Compile vehicle from trim...');
          const testTrim = filteredTrimsResult.trims[0];
          
          try {
            const compiledVehicle = await referenceAPI.compileVehicleByVersion(
              TEST_DATA.mercedesS500.companyId || process.env.STOCKSPARK_COMPANY_ID,
              testTrim.id,
              'car',
              'datak'
            );
            
            const compileSuccess = !!compiledVehicle && !!compiledVehicle.make;
            TestUtils.formatTestResult(
              'Compile Vehicle from Trim',
              compileSuccess,
              compileSuccess ? `Compiled: ${compiledVehicle.make?.name} ${compiledVehicle.model?.name} ${compiledVehicle.version?.name}` : 'Failed to compile vehicle'
            );
          } catch (error) {
            TestUtils.formatTestResult(
              'Compile Vehicle from Trim',
              false,
              `Compilation failed: ${error.message}`
            );
          }
        }
      }
    }
    
    // Test 5: Test vehicle makes reference data (country-specific)
    console.log('\nTest 5: Test vehicle makes reference data...');
    try {
      const makesResult = await referenceAPI.getVehicleMakes('it', 'car');
      const makesSuccess = Array.isArray(makesResult.makes) && makesResult.makes.length > 0;
      
      TestUtils.formatTestResult(
        'Vehicle Makes Reference Data',
        makesSuccess,
        makesSuccess ? `Found ${makesResult.makes.length} makes for Italy` : 'Vehicle makes reference data failed'
      );
    } catch (error) {
      TestUtils.formatTestResult(
        'Vehicle Makes Reference Data',
        false,
        `Vehicle makes reference data error: ${error.message}`
      );
    }
    
    // Test 6: Test vehicle models reference data (country-specific)
    console.log('\nTest 6: Test vehicle models reference data...');
    try {
      const modelsResult = await referenceAPI.getVehicleModels('it', 'car', 'Mercedes-Benz');
      const modelsSuccess = Array.isArray(modelsResult.models) && modelsResult.models.length > 0;
      
      TestUtils.formatTestResult(
        'Vehicle Models Reference Data',
        modelsSuccess,
        modelsSuccess ? `Found ${modelsResult.models.length} Mercedes-Benz models for Italy` : 'Vehicle models reference data failed'
      );
    } catch (error) {
      TestUtils.formatTestResult(
        'Vehicle Models Reference Data',
        false,
        `Vehicle models reference data error: ${error.message}`
      );
    }
    
    // Test 6.5: Test generic reference data endpoints
    console.log('\nTest 6.5: Test generic reference data endpoints...');
    try {
      const genericMakesResult = await referenceAPI.getMakes('Mercedes');
      const genericMakesSuccess = Array.isArray(genericMakesResult.makes) && genericMakesResult.makes.length > 0;
      
      TestUtils.formatTestResult(
        'Generic Makes Reference Data',
        genericMakesSuccess,
        genericMakesSuccess ? `Found ${genericMakesResult.makes.length} makes matching 'Mercedes'` : 'Generic makes reference data failed'
      );
      
      if (genericMakesSuccess && genericMakesResult.makes.length > 0) {
        const makeCode = genericMakesResult.makes[0].code;
        const modelsResult = await referenceAPI.getModels(makeCode);
        const modelsSuccess = Array.isArray(modelsResult.models);
        
        TestUtils.formatTestResult(
          'Generic Models Reference Data',
          modelsSuccess,
          modelsSuccess ? `Found ${modelsResult.models.length} models for ${makeCode}` : 'Generic models reference data failed'
        );
      }
    } catch (error) {
      TestUtils.formatTestResult(
        'Generic Reference Data Endpoints',
        false,
        `Generic reference data error: ${error.message}`
      );
    }
    
    // Test 7: Test general search functionality
    console.log('\nTest 7: Test search functionality...');
    try {
      // This tests the underlying search capability
      const searchResult = await referenceAPI.findModelsByMake('it', 'BMW', 'car');
      const searchSuccess = searchResult.count > 0;
      
      TestUtils.formatTestResult(
        'Search Functionality',
        searchSuccess,
        searchSuccess ? `Search found ${searchResult.count} BMW models` : 'Search functionality failed'
      );
    } catch (error) {
      TestUtils.formatTestResult(
        'Search Functionality',
        false,
        `Search failed: ${error.message}`
      );
    }
    
    // Test 8: Error handling
    console.log('\nTest 8: Error handling...');
    try {
      await referenceAPI.getVehicleTrims('it', 999999); // Non-existent model
      TestUtils.formatTestResult('Error Handling', false, 'Should have thrown error for invalid model');
    } catch (error) {
      TestUtils.formatTestResult(
        'Error Handling',
        true,
        `Properly handled invalid model ID: ${error.message}`
      );
    }
    
    // Test 9: Test additional reference data methods
    console.log('\nTest 9: Test additional reference data...');
    try {
      const fuelTypesResult = await referenceAPI.getFuelTypes();
      const fuelSuccess = Array.isArray(fuelTypesResult.fuelTypes);
      
      TestUtils.formatTestResult(
        'Fuel Types Reference Data',
        fuelSuccess,
        fuelSuccess ? `Found ${fuelTypesResult.fuelTypes.length} fuel types` : 'Failed to get fuel types'
      );
      
      const transmissionResult = await referenceAPI.getTransmissionTypes();
      const transmissionSuccess = Array.isArray(transmissionResult.transmissionTypes);
      
      TestUtils.formatTestResult(
        'Transmission Types Reference Data',
        transmissionSuccess,
        transmissionSuccess ? `Found ${transmissionResult.transmissionTypes.length} transmission types` : 'Failed to get transmission types'
      );
    } catch (error) {
      TestUtils.formatTestResult(
        'Additional Reference Data',
        false,
        `Reference data error: ${error.message}`
      );
    }
    
    // Test 10: Test with different vehicle classes
    console.log('\nTest 10: Test different vehicle classes...');
    try {
      const lcvResult = await referenceAPI.findModelsByMake('it', 'Mercedes-Benz', 'lcv'); // Light commercial vehicles
      TestUtils.formatTestResult(
        'Different Vehicle Classes',
        true, // Always pass, just informational
        `Found ${lcvResult.count} Mercedes-Benz LCV models (testing vehicle class support)`
      );
    } catch (error) {
      TestUtils.formatTestResult(
        'Different Vehicle Classes',
        false,
        `LCV test failed: ${error.message}`
      );
    }
    
    console.log('\n✅ Vehicle reference data tests completed');
    console.log('Note: These tests verify the core vehicle reference data APIs used by MCP tools.');
    console.log('The high-level reference tools are implemented as MCP tools in the server.');
    return true;
    
  } catch (error) {
    TestUtils.formatTestResult('Vehicle Reference Data Test', false, error.message);
    console.log('\n❌ Vehicle reference data tests failed');
    return false;
  }
}

if (require.main === module) {
  testReferenceNavigation().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testReferenceNavigation };
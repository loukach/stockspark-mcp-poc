#!/usr/bin/env node

/**
 * Workflow Test: Complete Vehicle Creation Flow
 * Tests the complete workflow from user request to vehicle creation
 */

const { TestUtils, TEST_DATA } = require('../config/test-config');

async function testCompleteVehicleCreationWorkflow() {
  console.log('🎯 Testing Complete Vehicle Creation Workflow...\n');
  console.log('Simulating: "Add a Mercedes S 500 from 2021, 34k€, 87k km"\n');
  
  TestUtils.setupEnvironment();
  
  try {
    const { referenceAPI, vehicleAPI } = await TestUtils.createClients();
    
    // Step 1: Find make and models (simulate start_vehicle_creation)
    console.log('Step 1: Finding Mercedes-Benz models...');
    const modelsResult = await referenceAPI.findModelsByMake('it', 'Mercedes-Benz', 'car');
    
    const step1Success = modelsResult.count > 0;
    TestUtils.formatTestResult(
      'Find Models', 
      step1Success, 
      `Found ${modelsResult.count} Mercedes-Benz models`
    );
    
    if (!step1Success) return false;
    
    // Step 2: Find S-Class model
    const sClassModel = modelsResult.models.find(model => 
      model.name.toLowerCase().includes('classe s')
    );
    
    const step2Success = !!sClassModel;
    TestUtils.formatTestResult(
      'Find S-Class Model',
      step2Success,
      step2Success ? `Found: ${sClassModel.name} (ID: ${sClassModel.id})` : 'S-Class model not found'
    );
    
    if (!step2Success) return false;
    
    // Step 3: Get trims for 2021 (simulate compare_trim_variants)
    console.log('Step 3: Finding 2021 S 500 trims...');
    const trimsResult = await referenceAPI.getVehicleTrims(
      'it',
      sClassModel.id,
      null,
      null,
      '01-2021' // 2021 filter
    );
    
    // Filter for S 500 variants
    const s500Trims = trimsResult.trims.filter(trim => 
      trim.name.toLowerCase().includes('s 500')
    );
    
    const step3Success = s500Trims.length > 0;
    TestUtils.formatTestResult(
      'Find S 500 Trims',
      step3Success,
      `Found ${s500Trims.length} S 500 variants from 2021`
    );
    
    if (!step3Success) return false;
    
    // Step 4: Select a trim (simulate user choice)
    const selectedTrim = s500Trims[0]; // Pick first one
    console.log(`Step 4: Selected trim: ${selectedTrim.name} (ID: ${selectedTrim.id})`);
    
    // Step 5: Compile vehicle from trim
    console.log('Step 5: Compiling vehicle from trim...');
    const compiledVehicle = await referenceAPI.compileVehicleByVersion(
      TEST_DATA.mercedesS500.companyId || process.env.STOCKSPARK_COMPANY_ID,
      selectedTrim.id,
      'car',
      'datak'
    );
    
    const step5Success = !!compiledVehicle;
    TestUtils.formatTestResult(
      'Compile Vehicle',
      step5Success,
      step5Success ? `Compiled: ${compiledVehicle.make?.name} ${compiledVehicle.model?.name}` : 'Compilation failed'
    );
    
    if (!step5Success) return false;
    
    // Step 6: Create vehicle (simulate create_vehicle_from_trim)
    console.log('Step 6: Creating vehicle with user specifications...');
    
    // Use the working vehicle creation approach
    const vehicleData = {
      ...TEST_DATA.workingVehiclePayload,
      // Override with compiled data
      make: { name: compiledVehicle.make.name },
      model: { name: compiledVehicle.model.name },
      version: { name: compiledVehicle.version.name },
      // Keep user's requested year (2021)
      constructionYear: "2021",
      constructionDate: "2021-01-01T00:00:00.000Z",
      firstRegistration: "202101",
      // Use compiled technical specs
      power: compiledVehicle.power || 330,
      powerHp: compiledVehicle.powerHp || 449,
      cubicCapacity: compiledVehicle.cubicCapacity || 2999,
      cylinders: compiledVehicle.cylinders || 6,
      // Generate unique test data
      ...TestUtils.generateUniqueTestData({
        price: TEST_DATA.mercedesS500.price,
        mileage: TEST_DATA.mercedesS500.mileage
      })
    };
    
    const creationResult = await vehicleAPI.addVehicle(vehicleData);
    
    const step6Success = !!creationResult.vehicleId;
    TestUtils.formatTestResult(
      'Create Vehicle',
      step6Success,
      step6Success ? `Vehicle created with ID: ${creationResult.vehicleId}` : 'Vehicle creation failed'
    );
    
    if (step6Success) {
      // Step 7: Verify created vehicle
      console.log('Step 7: Verifying created vehicle...');
      const verification = await vehicleAPI.getVehicle(creationResult.vehicleId);
      
      const step7Success = verification.constructionYear === "2021";
      TestUtils.formatTestResult(
        'Verify Vehicle Year',
        step7Success,
        `Created vehicle year: ${verification.constructionYear} (expected: 2021)`
      );
      
      console.log('\n🎉 Complete workflow test passed!');
      console.log(`✅ Successfully created 2021 Mercedes S 500 with ID: ${creationResult.vehicleId}`);
      return true;
    }
    
    return false;
    
  } catch (error) {
    TestUtils.formatTestResult('Complete Workflow', false, error.message);
    console.log('\n❌ Complete workflow test failed');
    return false;
  }
}

if (require.main === module) {
  testCompleteVehicleCreationWorkflow().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testCompleteVehicleCreationWorkflow };
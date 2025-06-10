#!/usr/bin/env node

/**
 * Integration Test: MCP Tools
 * Tests the MCP server tools end-to-end
 */

const { TestUtils, TEST_DATA } = require('../config/test-config');

// Mock MCP tool execution
async function executeMCPTool(toolName, args) {
  // Import the tool handlers from the main server
  const { AuthManager } = require('../../src/auth');
  const { StockSparkClient } = require('../../src/api/client');
  const { VehicleAPI } = require('../../src/api/vehicles');
  const { ReferenceAPI } = require('../../src/api/reference');
  
  TestUtils.setupEnvironment();
  
  const authManager = new AuthManager();
  const apiClient = new StockSparkClient(authManager);
  const vehicleAPI = new VehicleAPI(apiClient);
  const referenceAPI = new ReferenceAPI(apiClient);
  
  // Simulate the tool handlers from index.js
  const toolHandlers = {
    start_vehicle_creation: async (args) => {
      const country = args.country || process.env.STOCKSPARK_COUNTRY || 'it';
      const vehicleClass = args.vehicle_class || 'car';
      
      // Find models for the make
      const modelsResult = await referenceAPI.findModelsByMake(country, args.make_name, vehicleClass);
      
      if (modelsResult.count === 0) {
        return { success: false, message: `No models found for make "${args.make_name}"` };
      }
      
      return { 
        success: true, 
        message: `Found ${modelsResult.count} models for ${args.make_name}`,
        data: modelsResult
      };
    },
    
    compare_trim_variants: async (args) => {
      const country = args.country || process.env.STOCKSPARK_COUNTRY || 'it';
      const manufactureDate = args.year ? `01-${args.year}` : null;
      
      const trimsResult = await referenceAPI.getVehicleTrims(
        country, 
        args.model_id, 
        null, 
        null, 
        manufactureDate
      );
      
      const baseModelLower = args.base_model_name.toLowerCase();
      const matchingTrims = trimsResult.trims.filter(trim => 
        trim.name.toLowerCase().includes(baseModelLower)
      );
      
      return {
        success: matchingTrims.length > 0,
        message: `Found ${matchingTrims.length} ${args.base_model_name} variants`,
        data: { trims: matchingTrims.slice(0, args.max_variants || 10) }
      };
    }
  };
  
  if (!toolHandlers[toolName]) {
    throw new Error(`Unknown tool: ${toolName}`);
  }
  
  return await toolHandlers[toolName](args);
}

async function testMCPTools() {
  console.log('🔧 Testing MCP Tools Integration...\n');
  
  try {
    // Test 1: start_vehicle_creation
    const startResult = await executeMCPTool('start_vehicle_creation', {
      make_name: TEST_DATA.mercedesS500.make_name
    });
    
    TestUtils.formatTestResult(
      'start_vehicle_creation',
      startResult.success,
      startResult.message
    );
    
    if (startResult.success) {
      // Test 2: compare_trim_variants
      const compareResult = await executeMCPTool('compare_trim_variants', {
        model_id: TEST_DATA.mercedesS500.model_id,
        base_model_name: TEST_DATA.mercedesS500.version_name,
        year: TEST_DATA.mercedesS500.year,
        max_variants: 5
      });
      
      TestUtils.formatTestResult(
        'compare_trim_variants',
        compareResult.success,
        compareResult.message
      );
    }
    
    console.log('\n✅ MCP tools integration tests completed');
    return true;
    
  } catch (error) {
    TestUtils.formatTestResult('MCP Tools Integration', false, error.message);
    console.log('\n❌ MCP tools integration tests failed');
    return false;
  }
}

if (require.main === module) {
  testMCPTools().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testMCPTools };
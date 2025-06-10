#!/usr/bin/env node

/**
 * Test Runner: Execute all tests in organized sequence
 * Provides a single entry point for running all tests
 */

// Load environment variables from .env file
require('dotenv').config();

const path = require('path');

// Test modules
const { testConnection } = require('./unit/test-connection');
const { testVehicleCreation } = require('./unit/test-vehicle-creation');
const { testImageTools } = require('./unit/test-image-tools');
const { testAnalyticsTools } = require('./unit/test-analytics-tools');
const { testPublishingTools } = require('./unit/test-publishing-tools');
const { testReferenceNavigation } = require('./unit/test-reference-navigation');
const { testMCPTools } = require('./integration/test-mcp-tools');
const { testCompleteVehicleCreationWorkflow } = require('./workflows/test-complete-vehicle-creation');

// Test configuration
const TEST_SUITES = [
  {
    name: 'Unit Tests - Core',
    tests: [
      { name: 'API Connection', fn: testConnection },
      { name: 'Vehicle Creation', fn: testVehicleCreation }
    ]
  },
  {
    name: 'Unit Tests - Features',
    tests: [
      { name: 'Image Management', fn: testImageTools },
      { name: 'Analytics & Intelligence', fn: testAnalyticsTools },
      { name: 'Publishing Tools', fn: testPublishingTools },
      { name: 'Vehicle Reference Data', fn: testReferenceNavigation }
    ]
  },
  {
    name: 'Integration Tests', 
    tests: [
      { name: 'MCP Tools', fn: testMCPTools }
    ]
  },
  {
    name: 'Workflow Tests',
    tests: [
      { name: 'Complete Vehicle Creation', fn: testCompleteVehicleCreationWorkflow }
    ]
  }
];

async function runAllTests(options = {}) {
  const startTime = Date.now();
  console.log('🧪 StockSpark MCP Test Suite\n');
  console.log('=' .repeat(50));
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    suites: []
  };
  
  // Run test suites
  for (const suite of TEST_SUITES) {
    console.log(`\n📂 ${suite.name}`);
    console.log('-'.repeat(30));
    
    const suiteResults = {
      name: suite.name,
      tests: [],
      passed: 0,
      failed: 0
    };
    
    for (const test of suite.tests) {
      console.log(`\n🔬 Running: ${test.name}`);
      
      try {
        const success = await test.fn();
        
        if (success) {
          suiteResults.passed++;
          results.passed++;
        } else {
          suiteResults.failed++;
          results.failed++;
        }
        
        suiteResults.tests.push({
          name: test.name,
          success,
          error: null
        });
        
      } catch (error) {
        console.log(`❌ ${test.name} failed with error: ${error.message}`);
        suiteResults.failed++;
        results.failed++;
        
        suiteResults.tests.push({
          name: test.name,
          success: false,
          error: error.message
        });
      }
      
      results.total++;
      
      // Add delay between tests to avoid rate limiting
      if (results.total < TEST_SUITES.reduce((sum, s) => sum + s.tests.length, 0)) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    results.suites.push(suiteResults);
  }
  
  // Final results
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(50));
  
  results.suites.forEach(suite => {
    const suiteTotal = suite.passed + suite.failed;
    const percentage = suiteTotal > 0 ? ((suite.passed / suiteTotal) * 100).toFixed(1) : '0.0';
    
    console.log(`📂 ${suite.name}: ${suite.passed}/${suiteTotal} passed (${percentage}%)`);
    
    suite.tests.forEach(test => {
      const status = test.success ? '✅' : '❌';
      console.log(`   ${status} ${test.name}`);
      if (test.error) {
        console.log(`      Error: ${test.error}`);
      }
    });
  });
  
  const overallPercentage = results.total > 0 ? ((results.passed / results.total) * 100).toFixed(1) : '0.0';
  
  console.log('\n' + '-'.repeat(50));
  console.log(`🎯 OVERALL: ${results.passed}/${results.total} tests passed (${overallPercentage}%)`);
  console.log(`⏱️  Duration: ${duration} seconds`);
  
  if (results.failed === 0) {
    console.log('🎉 All tests passed!');
  } else {
    console.log(`⚠️  ${results.failed} test(s) failed`);
  }
  
  return results.failed === 0;
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    suite: args.find(arg => arg.startsWith('--suite='))?.split('=')[1]
  };
  
  runAllTests(options).then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests, TEST_SUITES };
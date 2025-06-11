#!/usr/bin/env node

// Test that our constants are properly loaded and accessible

const { AUTH, API, DEFAULTS } = require('../../src/config/constants');

async function testConstants() {
  console.log('🔧 Testing Constants Configuration\n');

// Test AUTH constants
console.log('🔐 Authentication Constants:');
console.log(`  Client ID: ${AUTH.CLIENT_ID}`);
console.log(`  Auth URL: ${AUTH.URL}`);

// Test API constants  
console.log('\n🌐 API Constants:');
console.log(`  Base URL: ${API.BASE_URL}`);
console.log(`  Leads URL: ${API.LEADS_URL}`);

// Test DEFAULTS
console.log('\n⚙️ Default Values:');
console.log(`  Country: ${DEFAULTS.COUNTRY}`);
console.log(`  Vehicle Class: ${DEFAULTS.VEHICLE_CLASS}`);

// Validate all constants are present
const checks = [
  { name: 'AUTH.CLIENT_ID', value: AUTH.CLIENT_ID, expected: 'carspark-api' },
  { name: 'AUTH.URL', value: AUTH.URL, expected: 'https://auth.motork.io/realms/prod/protocol/openid-connect/token' },
  { name: 'API.BASE_URL', value: API.BASE_URL, expected: 'https://carspark-api.dealerk.com' },
  { name: 'API.LEADS_URL', value: API.LEADS_URL, expected: 'https://api.dealerk.it:443' },
  { name: 'DEFAULTS.COUNTRY', value: DEFAULTS.COUNTRY, expected: 'it' },
  { name: 'DEFAULTS.VEHICLE_CLASS', value: DEFAULTS.VEHICLE_CLASS, expected: 'car' }
];

console.log('\n✅ Validation Results:');
let allValid = true;

checks.forEach(check => {
  const isValid = check.value === check.expected;
  const status = isValid ? '✅' : '❌';
  console.log(`  ${status} ${check.name}: ${check.value}`);
  if (!isValid) {
    console.log(`      Expected: ${check.expected}`);
    allValid = false;
  }
});

  if (allValid) {
    console.log('\n🎉 All constants are correctly configured!');
    console.log('\n📋 Benefits:');
    console.log('  - No more URL configuration errors');
    console.log('  - Simpler user setup (only username/password needed)');
    console.log('  - Centralized maintenance of API endpoints');
    console.log('  - Consistent configuration across all components');
    return true;
  } else {
    console.log('\n❌ Some constants are not configured correctly!');
    return false;
  }
}

if (require.main === module) {
  testConstants().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testConstants };
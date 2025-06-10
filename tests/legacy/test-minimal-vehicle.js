const { StockSparkClient } = require('./src/api/client');
const { AuthManager } = require('./src/auth');

// Set up environment variables
process.env.STOCKSPARK_USERNAME = 'lucas.gros+demo@motork.io';
process.env.STOCKSPARK_PASSWORD = 'ZDU8qty4fjg-qwx7apv';
process.env.STOCKSPARK_CLIENT_ID = 'carspark-api';
process.env.STOCKSPARK_AUTH_URL = 'https://auth.motork.io/realms/prod/protocol/openid-connect/token';
process.env.STOCKSPARK_API_URL = 'https://carspark-api.dealerk.com';
process.env.STOCKSPARK_COUNTRY = 'it';
process.env.STOCKSPARK_COMPANY_ID = '35430';
process.env.STOCKSPARK_DEALER_ID = '196036';

async function testMinimalVehicleCreation() {
  console.log('🧪 Testing minimal vehicle creation with progressive field addition...\n');
  
  const authManager = new AuthManager();
  const client = new StockSparkClient(authManager);
  
  try {
    // First, let's get an existing vehicle to see its structure
    console.log('📋 Step 1: Getting existing vehicle structure for reference...');
    try {
      const existingVehicles = await client.get('/vehicle', { page: 0, size: 1 });
      if (existingVehicles && existingVehicles.content && existingVehicles.content.length > 0) {
        console.log('✅ Found existing vehicle structure:', JSON.stringify(existingVehicles.content[0], null, 2));
      }
    } catch (error) {
      console.log('⚠️  Could not get existing vehicle:', error.message);
    }
    
    console.log('\n🔧 Step 2: Testing ultra-minimal vehicle creation...');
    
    // Test 1: Ultra minimal
    const minimalVehicle = {
      companyId: 35430,
      make: { name: "Mercedes-Benz" },
      model: { name: "Classe S" },
      constructionYear: "2021",
      price: 34000,
      condition: { name: "USED" }
    };
    
    console.log('Attempting with minimal data:', JSON.stringify(minimalVehicle, null, 2));
    
    try {
      const result1 = await client.post('/vehicle', minimalVehicle);
      console.log('✅ SUCCESS with minimal data!', result1);
      return;
    } catch (error) {
      console.log('❌ Failed with minimal data:', error.message);
      console.log('Error body:', error.body);
    }
    
    console.log('\n🔧 Step 3: Adding required fields progressively...');
    
    // Test 2: Add vehicleClass
    const withVehicleClass = {
      ...minimalVehicle,
      vehicleClass: { name: "car" }
    };
    
    console.log('Adding vehicleClass...');
    try {
      const result2 = await client.post('/vehicle', withVehicleClass);
      console.log('✅ SUCCESS with vehicleClass!', result2);
      return;
    } catch (error) {
      console.log('❌ Still failing with vehicleClass:', error.message);
    }
    
    // Test 3: Add status
    const withStatus = {
      ...withVehicleClass,
      status: { name: "FREE" }
    };
    
    console.log('Adding status...');
    try {
      const result3 = await client.post('/vehicle', withStatus);
      console.log('✅ SUCCESS with status!', result3);
      return;
    } catch (error) {
      console.log('❌ Still failing with status:', error.message);
    }
    
    // Test 4: Add priceGross
    const withPrice = {
      ...withStatus,
      priceGross: { consumerPrice: 34000 }
    };
    
    console.log('Adding priceGross...');
    try {
      const result4 = await client.post('/vehicle', withPrice);
      console.log('✅ SUCCESS with priceGross!', result4);
      return;
    } catch (error) {
      console.log('❌ Still failing with priceGross:', error.message);
    }
    
    // Test 5: Add fuel and gearbox
    const withFuelAndGear = {
      ...withPrice,
      fuel: { name: "PETROL" },
      gearbox: { name: "AUTOMATIC" }
    };
    
    console.log('Adding fuel and gearbox...');
    try {
      const result5 = await client.post('/vehicle', withFuelAndGear);
      console.log('✅ SUCCESS with fuel and gearbox!', result5);
      return;
    } catch (error) {
      console.log('❌ Still failing with fuel and gearbox:', error.message);
    }
    
    // Test 6: Add version with proper structure
    const withVersion = {
      ...withFuelAndGear,
      version: { name: "S 500" }
    };
    
    console.log('Adding version...');
    try {
      const result6 = await client.post('/vehicle', withVersion);
      console.log('✅ SUCCESS with version!', result6);
      return;
    } catch (error) {
      console.log('❌ Still failing with version:', error.message);
    }
    
    // Test 7: Add constructionDate
    const withConstructionDate = {
      ...withVersion,
      constructionDate: "2021-01-01T00:00:00.000+00:00"
    };
    
    console.log('Adding constructionDate...');
    try {
      const result7 = await client.post('/vehicle', withConstructionDate);
      console.log('✅ SUCCESS with constructionDate!', result7);
      return;
    } catch (error) {
      console.log('❌ Still failing with constructionDate:', error.message);
    }
    
    console.log('\n🚨 All tests failed. The issue might be fundamental...');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testMinimalVehicleCreation().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test error:', error);
  process.exit(1);
});
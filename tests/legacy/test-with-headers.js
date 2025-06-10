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

async function testWithHeaders() {
  console.log('🧪 Testing vehicle creation with required headers...\n');
  
  const authManager = new AuthManager();
  const client = new StockSparkClient(authManager);
  
  // Minimal vehicle data
  const vehicleData = {
    companyId: 35430,
    dealerId: 196036,
    vehicleClass: { name: "car" },
    status: { name: "FREE" },
    make: { name: "Mercedes-Benz" },
    model: { name: "Classe S" },
    version: { name: "S 500" },
    constructionYear: "2021",
    constructionDate: "2021-01-01T00:00:00.000+00:00",
    fuel: { name: "PETROL" },
    gearbox: { name: "AUTOMATIC" },
    condition: { name: "USED" },
    priceGross: { consumerPrice: 34000 },
    priceNet: { consumerPrice: 34000 },
    mileage: 87000
  };

  try {
    console.log('🔧 Test 1: Without any special headers...');
    try {
      const result1 = await client.request('/vehicle', {
        method: 'POST',
        body: JSON.stringify(vehicleData)
      });
      console.log('✅ SUCCESS without headers!', result1);
      return;
    } catch (error) {
      console.log('❌ Failed without headers:', error.message);
    }

    console.log('\n🔧 Test 2: With provider header = JATO...');
    try {
      const result2 = await client.request('/vehicle', {
        method: 'POST',
        body: JSON.stringify(vehicleData),
        headers: {
          'provider': 'JATO'
        }
      });
      console.log('✅ SUCCESS with JATO provider!', result2);
      return;
    } catch (error) {
      console.log('❌ Failed with JATO provider:', error.message);
    }

    console.log('\n🔧 Test 3: With provider header = EUROTAX...');
    try {
      const result3 = await client.request('/vehicle', {
        method: 'POST',
        body: JSON.stringify(vehicleData),
        headers: {
          'provider': 'EUROTAX'
        }
      });
      console.log('✅ SUCCESS with EUROTAX provider!', result3);
      return;
    } catch (error) {
      console.log('❌ Failed with EUROTAX provider:', error.message);
    }

    console.log('\n🔧 Test 4: With x-ssk-client header...');
    try {
      const result4 = await client.request('/vehicle', {
        method: 'POST',
        body: JSON.stringify(vehicleData),
        headers: {
          'x-ssk-client': 'mcp-server'
        }
      });
      console.log('✅ SUCCESS with x-ssk-client!', result4);
      return;
    } catch (error) {
      console.log('❌ Failed with x-ssk-client:', error.message);
    }

    console.log('\n🔧 Test 5: With both headers...');
    try {
      const result5 = await client.request('/vehicle', {
        method: 'POST',
        body: JSON.stringify(vehicleData),
        headers: {
          'provider': 'JATO',
          'x-ssk-client': 'mcp-server'
        }
      });
      console.log('✅ SUCCESS with both headers!', result5);
      return;
    } catch (error) {
      console.log('❌ Failed with both headers:', error.message);
    }

    console.log('\n🔧 Test 6: Testing structure from existing vehicle...');
    
    // First get an existing vehicle to copy its structure
    const existingVehicles = await client.get('/vehicle', { page: 0, size: 1 });
    
    if (existingVehicles && existingVehicles.content && existingVehicles.content.length > 0) {
      const existingVehicle = existingVehicles.content[0];
      console.log('📋 Found existing vehicle structure:', JSON.stringify(existingVehicle, null, 2));
      
      // Try to create a similar vehicle by copying structure
      const similarVehicle = {
        ...existingVehicle,
        vehicleId: null, // Remove ID for new vehicle
        companyId: 35430,
        dealerId: 196036,
        make: { name: "Mercedes-Benz" },
        model: { name: "Classe S" },
        version: { name: "S 500" },
        constructionYear: "2021",
        priceGross: { consumerPrice: 34000 },
        numberPlate: null,
        vin: null,
        mileage: 87000,
        creationDate: null,
        modificationDate: null
      };
      
      console.log('🔧 Testing with existing vehicle structure...');
      try {
        const result6 = await client.request('/vehicle', {
          method: 'POST',
          body: JSON.stringify(similarVehicle)
        });
        console.log('✅ SUCCESS with existing structure!', result6);
        return;
      } catch (error) {
        console.log('❌ Failed with existing structure:', error.message);
        if (error.body) {
          console.log('Error details:', error.body);
        }
      }
    }

    console.log('\n🚨 All tests failed. Need to check Vehicle schema definition.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testWithHeaders().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test error:', error);
  process.exit(1);
});
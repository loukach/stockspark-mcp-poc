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

async function debugDifference() {
  console.log('🔍 Debug: Finding exact difference between working and failing requests...\n');
  
  const authManager = new AuthManager();
  const client = new StockSparkClient(authManager);
  
  try {
    // This is the EXACT payload that worked in the test
    const workingPayload = {
      companyId: 35430,
      dealerId: 196036,
      make: {
        name: "Mercedes-Benz"
      },
      model: {
        name: "Classe S"
      },
      version: {
        name: "S 500"
      },
      constructionYear: "2021",
      fuel: {
        name: "PETROL"
      },
      gearbox: {
        name: "AUTOMATIC"
      },
      condition: {
        name: "USED"
      },
      priceGross: {
        consumerPrice: 34000
      },
      mileage: 87000,
      vehicleClass: {
        name: "car"
      },
      status: {
        name: "FREE"
      },
      wheelFormula: {
        name: "FRONT"
      },
      vatRate: 0,
      constructionDate: "2021-01-01T00:00:00.000Z",
      body: {
        name: "SEDAN"
      },
      doors: 4,
      seat: 5,
      power: 330,
      powerHp: 449,
      cubicCapacity: 2999,
      cylinders: 6,
      priceNet: {
        consumerPrice: 34000
      },
      accidentDamaged: false,
      billable: true,
      comingSoon: false,
      corporate: false,
      deductible: false,
      demo: false,
      lastMinuteOffer: false,
      luxury: false,
      negotiable: true,
      noviceDrivable: true,
      onSale: true,
      promptDelivery: false,
      reservedNegotiation: false,
      servicingDoc: false,
      visibility: true,
      warranty: false,
      firstRegistration: "202101"
    };
    
    console.log('🔧 Test 1: Working payload from test-correct-schema.js...');
    try {
      const result1 = await client.post('/vehicle', workingPayload);
      console.log('✅ SUCCESS! Working payload worked again:', result1.vehicleId);
    } catch (error) {
      console.log('❌ Working payload failed!', error.message);
    }
    
    // Now let's try the exact payload from the MCP server log
    const mcpPayload = {
      companyId: 35430,
      dealerId: 196036,
      vehicleClass: {
        name: "car"
      },
      status: {
        name: "FREE"
      },
      wheelFormula: {
        name: "FRONT"
      },
      body: {
        name: "HATCHBACK"  // <-- This is different!
      },
      power: 100,  // <-- This is different!
      powerHp: 136,  // <-- This is different!
      seat: 5,
      doors: 4,
      priceGross: {
        consumerPrice: 34000,
        listPrice: 40800  // <-- This is different!
      },
      priceNet: {
        consumerPrice: 34000
      },
      vatRate: 0,
      make: {
        name: "Mercedes-Benz"
      },
      model: {
        name: "Classe S"
      },
      version: {
        name: "S 500"
      },
      fuel: {
        name: "PETROL"
      },
      gearbox: {
        name: "AUTOMATIC"
      },
      condition: {
        name: "USED"
      },
      constructionYear: "2021",
      constructionDate: "2021-01-01T00:00:00.000+00:00",  // <-- Different timezone!
      mileage: 87000,
      firstRegistration: "202101",
      accidentDamaged: false,
      billable: true,
      comingSoon: false,
      corporate: false,
      deductible: false,
      demo: false,
      lastMinuteOffer: false,
      luxury: false,
      negotiable: true,
      noviceDrivable: true,
      onSale: true,
      promptDelivery: false,
      reservedNegotiation: false,
      servicingDoc: false,
      visibility: true,
      warranty: false,
      color: {
        name: "nero"
      }
    };
    
    console.log('\n🔧 Test 2: MCP server payload from logs...');
    try {
      const result2 = await client.post('/vehicle', mcpPayload);
      console.log('✅ SUCCESS! MCP payload worked:', result2.vehicleId);
    } catch (error) {
      console.log('❌ MCP payload failed:', error.message);
    }
    
    // Let's try fixing the differences one by one
    console.log('\n🔧 Test 3: MCP payload with working body type...');
    const fixedMcpPayload = {
      ...mcpPayload,
      body: { name: "SEDAN" },  // Use working body type
      power: 330,  // Use working power
      powerHp: 449,  // Use working powerHp
      cubicCapacity: 2999,  // Add missing field
      cylinders: 6,  // Add missing field
      constructionDate: "2021-01-01T00:00:00.000Z",  // Fix timezone
      priceGross: {
        consumerPrice: 34000  // Remove listPrice
      }
    };
    
    try {
      const result3 = await client.post('/vehicle', fixedMcpPayload);
      console.log('✅ SUCCESS! Fixed MCP payload worked:', result3.vehicleId);
    } catch (error) {
      console.log('❌ Fixed MCP payload still failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

debugDifference().then(() => {
  console.log('\n✅ Debug test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Debug test error:', error);
  process.exit(1);
});
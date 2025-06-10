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

async function testExactMatch() {
  console.log('🔍 Test: Using EXACT working payload from test-correct-schema.js...\n');
  
  const authManager = new AuthManager();
  const client = new StockSparkClient(authManager);
  
  try {
    // This is the EXACT payload that worked (copy-pasted from test-correct-schema.js)
    const exactWorkingPayload = {
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
    
    console.log('🔧 Test 1: Exact working payload...');
    try {
      const result1 = await client.post('/vehicle', exactWorkingPayload);
      console.log('✅ SUCCESS! Working payload still works:', result1.vehicleId);
    } catch (error) {
      console.log('❌ Working payload failed!', error.message);
      return;
    }
    
    // Now test the exact MCP add_vehicle payload from the logs
    const mcpAddVehiclePayload = {
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
        name: "SEDAN"
      },
      power: 330,
      powerHp: 449,
      cubicCapacity: 2999,
      cylinders: 6,
      seat: 5,
      doors: 4,
      priceGross: {
        consumerPrice: 34000
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
      constructionDate: "2021-01-01T00:00:00.000Z",
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
    
    console.log('🔧 Test 2: MCP add_vehicle payload from logs...');
    try {
      const result2 = await client.post('/vehicle', mcpAddVehiclePayload);
      console.log('✅ SUCCESS! MCP add_vehicle payload works:', result2.vehicleId);
    } catch (error) {
      console.log('❌ MCP add_vehicle payload failed:', error.message);
      
      // Let's try removing the color field
      console.log('🔧 Test 2b: MCP payload without color...');
      const mcpWithoutColor = { ...mcpAddVehiclePayload };
      delete mcpWithoutColor.color;
      
      try {
        const result2b = await client.post('/vehicle', mcpWithoutColor);
        console.log('✅ SUCCESS! MCP payload without color works:', result2b.vehicleId);
        console.log('🔍 SOLUTION: The color field is causing the issue!');
      } catch (error2b) {
        console.log('❌ MCP payload without color still failed:', error2b.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testExactMatch().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test error:', error);
  process.exit(1);
});
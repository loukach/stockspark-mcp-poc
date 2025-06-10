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

async function testWithCorrectSchema() {
  console.log('🧪 Testing vehicle creation with correct schema...\n');
  
  const authManager = new AuthManager();
  const client = new StockSparkClient(authManager);
  
  try {
    console.log('🔧 Test 1: Ultra minimal with just essential fields...');
    
    const minimalCorrect = {
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
      mileage: 87000
    };
    
    console.log('Testing minimal correct structure:', JSON.stringify(minimalCorrect, null, 2));
    
    try {
      const result1 = await client.post('/vehicle', minimalCorrect);
      console.log('✅ SUCCESS with minimal correct structure!', result1);
      return;
    } catch (error) {
      console.log('❌ Failed with minimal correct structure:', error.message);
    }

    console.log('\n🔧 Test 2: Adding potentially required fields...');
    
    const withRequiredFields = {
      ...minimalCorrect,
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
      cylinders: 6
    };
    
    console.log('Adding required fields...');
    
    try {
      const result2 = await client.post('/vehicle', withRequiredFields);
      console.log('✅ SUCCESS with required fields!', result2);
      return;
    } catch (error) {
      console.log('❌ Failed with required fields:', error.message);
    }

    console.log('\n🔧 Test 3: Adding priceNet (might be required)...');
    
    const withPriceNet = {
      ...withRequiredFields,
      priceNet: {
        consumerPrice: 34000
      }
    };
    
    try {
      const result3 = await client.post('/vehicle', withPriceNet);
      console.log('✅ SUCCESS with priceNet!', result3);
      return;
    } catch (error) {
      console.log('❌ Failed with priceNet:', error.message);
    }

    console.log('\n🔧 Test 4: Adding boolean fields that might be required...');
    
    const withBooleans = {
      ...withPriceNet,
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
      warranty: false
    };
    
    try {
      const result4 = await client.post('/vehicle', withBooleans);
      console.log('✅ SUCCESS with boolean fields!', result4);
      return;
    } catch (error) {
      console.log('❌ Failed with boolean fields:', error.message);
    }

    console.log('\n🔧 Test 5: Adding firstRegistration (common required field)...');
    
    const withFirstRegistration = {
      ...withBooleans,
      firstRegistration: "202101" // YYYYMM format
    };
    
    try {
      const result5 = await client.post('/vehicle', withFirstRegistration);
      console.log('✅ SUCCESS with firstRegistration!', result5);
      return;
    } catch (error) {
      console.log('❌ Failed with firstRegistration:', error.message);
    }

    console.log('\n🔧 Test 6: Adding color (might be required)...');
    
    const withColor = {
      ...withFirstRegistration,
      color: "nero",
      colorBase: {
        name: "BLACK"
      }
    };
    
    try {
      const result6 = await client.post('/vehicle', withColor);
      console.log('✅ SUCCESS with color!', result6);
      return;
    } catch (error) {
      console.log('❌ Failed with color:', error.message);
    }

    console.log('\n🔧 Test 7: Testing compiled vehicle structure (cleaned up)...');
    
    // Let's get compiled data and try to use it properly
    const compiledData = await client.get('/vehicle/compileByTrim', {
      companyId: 35430,
      providerCode: '100026892420210101',
      vehicleClass: 'CAR',
      provider: 'datak'
    });
    
    console.log('Got compiled data:', JSON.stringify(compiledData, null, 2));
    
    // Clean up the compiled data for creation
    const cleanCompiledData = {
      ...compiledData,
      // Remove read-only fields
      vehicleId: undefined,
      vehicleManagerId: undefined,
      creationDate: undefined,
      modificationDate: undefined,
      enteredInStockDate: undefined,
      promoExpirationDate: undefined,
      lastServiceDate: undefined,
      
      // Override with our values
      dealerId: 196036,
      mileage: 87000,
      color: "nero",
      priceGross: {
        consumerPrice: 34000
      },
      priceNet: {
        consumerPrice: 34000
      }
    };
    
    try {
      const result7 = await client.post('/vehicle', cleanCompiledData);
      console.log('✅ SUCCESS with cleaned compiled data!', result7);
      return;
    } catch (error) {
      console.log('❌ Failed with cleaned compiled data:', error.message);
    }

    console.log('\n🚨 All tests failed. This might be a permissions or environment issue.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testWithCorrectSchema().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test error:', error);
  process.exit(1);
});
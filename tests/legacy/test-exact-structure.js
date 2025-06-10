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

async function testExactWorkingStructure() {
  console.log('🔬 Testing exact working structure for vehicle creation...\n');
  
  const authManager = new AuthManager();
  const client = new StockSparkClient(authManager);
  
  try {
    // This is the EXACT structure that worked in our manual test
    const workingStructure = {
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
      firstRegistration: "202101",
      color: "nero"
    };
    
    console.log('🔧 Testing with exact working structure...');
    console.log('Structure:', JSON.stringify(workingStructure, null, 2));
    
    try {
      const result = await client.post('/vehicle', workingStructure);
      console.log('✅ SUCCESS! Vehicle created:', result.vehicleId);
      console.log('Full response:', JSON.stringify(result, null, 2));
      return;
    } catch (error) {
      console.log('❌ Failed with exact structure:', error.message);
      
      // Let's try removing the description field from compiled vehicleClass
      console.log('\n🔧 Testing without description in vehicleClass...');
      
      // Get compiled data
      const compiledData = await client.get('/vehicle/compileByTrim', {
        companyId: 35430,
        providerCode: '100026892420210101',
        vehicleClass: 'CAR',
        provider: 'datak'
      });
      
      // Clean the structure
      const cleanedStructure = {
        companyId: 35430,
        dealerId: 196036,
        vehicleClass: { name: "car" }, // Remove description
        status: { name: "FREE" },
        wheelFormula: { name: "FRONT" },
        vatRate: 0,
        make: { name: compiledData.make.name }, // Remove id/code
        model: { name: compiledData.model.name }, // Remove id/code  
        version: { name: compiledData.version.name }, // Remove id/code
        constructionYear: compiledData.constructionYear.toString(),
        constructionDate: `${compiledData.constructionYear}-01-01T00:00:00.000+00:00`,
        firstRegistration: `${compiledData.constructionYear}01`,
        fuel: { name: compiledData.fuel.name }, // Remove description
        gearbox: { name: compiledData.gearbox.name }, // Remove description
        body: { name: "SEDAN" }, // Use specific body instead of null
        doors: compiledData.doors,
        power: compiledData.power,
        powerHp: compiledData.powerHp,
        cubicCapacity: compiledData.cubicCapacity,
        cylinders: compiledData.cylinders,
        seat: compiledData.seat,
        priceGross: {
          consumerPrice: 34000
        },
        priceNet: {
          consumerPrice: 34000
        },
        condition: { name: "USED" },
        mileage: 87000,
        color: "nero",
        // Required boolean fields
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
        const result2 = await client.post('/vehicle', cleanedStructure);
        console.log('✅ SUCCESS with cleaned structure! Vehicle created:', result2.vehicleId);
        console.log('Key difference: Removed descriptions and null fields');
        return result2;
      } catch (error2) {
        console.log('❌ Still failed with cleaned structure:', error2.message);
        
        console.log('\nCompiled data structure:');
        console.log(JSON.stringify(compiledData, null, 2));
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testExactWorkingStructure().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test error:', error);
  process.exit(1);
});
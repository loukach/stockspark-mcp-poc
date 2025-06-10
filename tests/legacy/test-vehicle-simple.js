const { AuthManager } = require('./src/auth');
const { StockSparkClient } = require('./src/api/client');
const { VehicleAPI } = require('./src/api/vehicles');
const { formatVehicleResponse } = require('./src/utils/mappers');

// Set up test environment variables
process.env.STOCKSPARK_USERNAME = 'lucas.gros+demo@motork.io';
process.env.STOCKSPARK_PASSWORD = 'ZDU8qty4fjg-qwx7apv';
process.env.STOCKSPARK_CLIENT_ID = 'carspark-api';
process.env.STOCKSPARK_AUTH_URL = 'https://auth.motork.io/realms/prod/protocol/openid-connect/token';
process.env.STOCKSPARK_API_URL = 'https://carspark-api.dealerk.com';
process.env.STOCKSPARK_COUNTRY = 'it';
process.env.STOCKSPARK_COMPANY_ID = '35430';
process.env.STOCKSPARK_DEALER_ID = '196036';

async function testVehicle() {
  console.log('=== Testing Vehicle 9476301 ===\n');
  
  const authManager = new AuthManager();
  const apiClient = new StockSparkClient(authManager);
  const vehicleAPI = new VehicleAPI(apiClient);
  
  try {
    const vehicle = await vehicleAPI.getVehicle(9476301);
    const formatted = formatVehicleResponse(vehicle);
    
    console.log('Vehicle Details:');
    console.log(`- ID: ${formatted.vehicleId}`);
    console.log(`- Make: ${formatted.make}`);
    console.log(`- Model: ${formatted.model}`);
    console.log(`- Version: ${formatted.version}`);
    console.log(`- Year: ${formatted.year}`);
    console.log(`- Price: €${formatted.price}`);
    console.log(`- Mileage: ${formatted.mileage} km`);
    console.log(`- Fuel: ${formatted.fuel}`);
    console.log(`- Transmission: ${formatted.transmission}`);
    console.log(`- Condition: ${formatted.condition}`);
    console.log(`- Color: ${formatted.color}`);
    console.log(`- Doors: ${formatted.doors}`);
    console.log(`- Images: ${formatted.imageCount}`);
    console.log(`- Status: ${formatted.status}`);
    
    console.log('\n✓ Vehicle successfully retrieved through MCP API');
    
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    process.exit(1);
  }
}

testVehicle();
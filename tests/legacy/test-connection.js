const { AuthManager } = require('./src/auth');
const { StockSparkClient } = require('./src/api/client');

// Set up test environment variables
process.env.STOCKSPARK_USERNAME = process.env.STOCKSPARK_USERNAME || 'lucas.gros+demo@motork.io';
process.env.STOCKSPARK_PASSWORD = process.env.STOCKSPARK_PASSWORD || 'ZDU8qty4fjg-qwx7apv';
process.env.STOCKSPARK_CLIENT_ID = process.env.STOCKSPARK_CLIENT_ID || 'carspark-api';
process.env.STOCKSPARK_AUTH_URL = process.env.STOCKSPARK_AUTH_URL || 'https://auth.motork.io/realms/prod/protocol/openid-connect/token';
process.env.STOCKSPARK_API_URL = process.env.STOCKSPARK_API_URL || 'https://carspark-api.dealerk.com';
process.env.STOCKSPARK_COUNTRY = process.env.STOCKSPARK_COUNTRY || 'it';
process.env.STOCKSPARK_COMPANY_ID = process.env.STOCKSPARK_COMPANY_ID || '35430';
process.env.STOCKSPARK_DEALER_ID = process.env.STOCKSPARK_DEALER_ID || '196036';
process.env.STOCKSPARK_API_KEY = process.env.STOCKSPARK_API_KEY || 'b50e31aaacfa73f7be1275ae1df39425';

async function testConnection() {
  console.log('=== Testing StockSpark Authentication ===\n');
  
  const auth = new AuthManager();
  
  try {
    // Test auth
    console.log('Testing authentication...');
    console.log('Auth URL:', process.env.STOCKSPARK_AUTH_URL);
    console.log('Client ID:', process.env.STOCKSPARK_CLIENT_ID);
    console.log('Username:', process.env.STOCKSPARK_USERNAME);
    console.log('');
    
    const token = await auth.getToken();
    console.log('✓ Authentication successful');
    console.log(`✓ Token received: ${token.substring(0, 20)}...`);
    console.log(`✓ Token cached, valid: ${auth.isTokenValid()}`);
    
    // Test token caching
    console.log('\nTesting token caching...');
    const token2 = await auth.getToken();
    console.log('✓ Second call returned cached token:', token === token2);
    
    // Clear and re-authenticate
    console.log('\nTesting token refresh after clear...');
    auth.clearToken();
    console.log('Token cleared, valid:', auth.isTokenValid());
    
    const token3 = await auth.getToken();
    console.log('✓ New token obtained after clear');
    console.log('✓ New token different from cached:', token !== token3);
    
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    }
    process.exit(1);
  }
  
  console.log('\n=== All authentication tests passed! ===');
  
  // Test API Client
  console.log('\n=== Testing StockSpark API Client ===\n');
  
  const client = new StockSparkClient(auth);
  
  try {
    // Test vehicle list
    console.log('Testing vehicle list endpoint...');
    const vehicles = await client.get('/vehicle', { page: 0, size: 1 });
    console.log('✓ API request successful');
    console.log(`✓ Total vehicles in stock: ${vehicles.totalVehicles}`);
    console.log('✓ Authorization header included (see logs above)');
    
    if (vehicles.vehicles && vehicles.vehicles.length > 0) {
      const vehicle = vehicles.vehicles[0];
      console.log(`\nFirst vehicle:`);
      console.log(`- ID: ${vehicle.vehicleId}`);
      console.log(`- Make: ${vehicle.make?.name || 'N/A'}`);
      console.log(`- Model: ${vehicle.model?.name || 'N/A'}`);
      console.log(`- Price: €${vehicle.priceGross?.consumerPrice || 'N/A'}`);
    }
    
    // Test reference data
    console.log('\nTesting reference data endpoint...');
    const makes = await client.get('/refdata/CAR/makes');
    console.log(`✓ Found ${makes.values.length} car makes`);
    console.log(`✓ Sample makes: ${makes.values.slice(0, 5).map(m => m.name).join(', ')}`);
    
    console.log('\n=== All API tests passed! ===');
    
  } catch (error) {
    console.error('✗ API test failed:', error.message);
    if (error.body) {
      console.error('Error body:', JSON.stringify(error.body, null, 2));
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  testConnection();
}
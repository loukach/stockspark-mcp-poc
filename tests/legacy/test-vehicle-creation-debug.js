const { spawn } = require('child_process');

// Set up environment variables
const env = {
  ...process.env,
  STOCKSPARK_USERNAME: 'lucas.gros+demo@motork.io',
  STOCKSPARK_PASSWORD: 'ZDU8qty4fjg-qwx7apv',
  STOCKSPARK_CLIENT_ID: 'carspark-api',
  STOCKSPARK_AUTH_URL: 'https://auth.motork.io/realms/prod/protocol/openid-connect/token',
  STOCKSPARK_API_URL: 'https://carspark-api.dealerk.com',
  STOCKSPARK_COUNTRY: 'it',
  STOCKSPARK_COMPANY_ID: '35430',
  STOCKSPARK_DEALER_ID: '196036'
};

console.log('🧪 Testing vehicle creation with progressive field addition...\n');

// Spawn the MCP server
const server = spawn('node', ['src/index.js'], { env });

let outputBuffer = '';
let currentStep = 0;

server.stdout.on('data', (data) => {
  outputBuffer += data.toString();
});

server.stderr.on('data', (data) => {
  process.stderr.write(data);
});

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendRequest(request) {
  console.log(`📤 Sending: ${request.method} (id: ${request.id})`);
  server.stdin.write(JSON.stringify(request) + '\n');
  await delay(2000); // Wait for response
}

setTimeout(async () => {
  try {
    // Initialize
    await sendRequest({
      jsonrpc: '2.0',
      id: ++currentStep,
      method: 'initialize',
      params: {
        protocolVersion: '0.1.0',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' }
      }
    });

    console.log('\n🔍 Step 1: First, verify we are using the correct endpoint...');
    console.log('Expected endpoint format: /{country}/vehicle (e.g., /it/vehicle)');
    console.log('Let\'s check our API client configuration...\n');

    // Test compile endpoint first
    console.log('📋 Step 2: Getting compiled vehicle data from trim...');
    await sendRequest({
      jsonrpc: '2.0',
      id: ++currentStep,
      method: 'tools/call',
      params: {
        name: 'compile_vehicle_by_trim',
        arguments: {
          providerCode: '100026892420210101', // Mercedes S 500 from previous test
          provider: 'datak',
          vehicleClass: 'CAR',
          companyId: 35430
        }
      }
    });

    await delay(1000);

    console.log('\n🚗 Step 3: Testing vehicle creation with EXACT compiled data...');
    await sendRequest({
      jsonrpc: '2.0',
      id: ++currentStep,
      method: 'tools/call',
      params: {
        name: 'create_vehicle_from_trim',
        arguments: {
          providerCode: '100026892420210101',
          provider: 'datak',
          vehicleClass: 'CAR',
          price: 34000,
          condition: 'USED',
          mileage: 87000,
          color: 'nero'
        }
      }
    });

    await delay(2000);

    console.log('\n🔧 Step 4: Testing with minimal manual data (add_vehicle)...');
    await sendRequest({
      jsonrpc: '2.0',
      id: ++currentStep,
      method: 'tools/call',
      params: {
        name: 'add_vehicle',
        arguments: {
          make: 'Mercedes-Benz',
          model: 'Classe S',
          version: 'S 500',
          year: 2021,
          price: 34000,
          fuel: 'PETROL',
          transmission: 'AUTOMATIC',
          condition: 'USED',
          mileage: 87000
        }
      }
    });

    await delay(2000);

    console.log('\n📊 Analysis Results:');
    console.log('=====================================');
    
    // Parse the output to analyze responses
    const responses = outputBuffer.split('\n').filter(line => {
      return line.includes('"result"') || line.includes('"error"') || line.includes('API Response') || line.includes('API Request');
    });

    console.log('Response summary:');
    responses.forEach((response, index) => {
      if (response.includes('API Request:')) {
        console.log(`\n📤 Request ${Math.floor(index/2) + 1}: ${response.substring(response.indexOf('API Request:'))}`);
      } else if (response.includes('API Response:')) {
        console.log(`📥 Response ${Math.floor(index/2) + 1}: ${response.substring(response.indexOf('API Response:'))}`);
      }
    });

    console.log('\n🔍 Full output buffer for detailed analysis:');
    console.log('===========================================');
    console.log(outputBuffer);

    server.kill();
    
  } catch (error) {
    console.error('❌ Test error:', error);
    server.kill();
  }
}, 1000);

server.on('close', (code) => {
  console.log(`\n✅ Test complete. Server exited with code ${code}`);
  
  console.log('\n📋 Next Steps Based on Results:');
  console.log('1. Check if we\'re using /{country}/vehicle endpoint correctly');
  console.log('2. Identify which fields cause validation failures');
  console.log('3. Create a minimal working payload');
  console.log('4. Build up field by field to find the problematic ones');
  
  process.exit(code || 0);
});
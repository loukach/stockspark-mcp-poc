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

console.log('🎉 Testing FIXED MCP server for Mercedes S 500 creation...\n');

// Spawn the MCP server
const server = spawn('node', ['src/index.js'], { env });

let outputBuffer = '';

server.stdout.on('data', (data) => {
  outputBuffer += data.toString();
});

server.stderr.on('data', (data) => {
  process.stderr.write(data);
});

setTimeout(async () => {
  try {
    // Initialize
    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '0.1.0',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' }
      }
    };
    
    server.stdin.write(JSON.stringify(initRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('🔧 Test 1: Fixed add_vehicle with manual data...');
    const addVehicleRequest = {
      jsonrpc: '2.0',
      id: 2,
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
          mileage: 87000,
          color: 'nero'
        }
      }
    };
    
    server.stdin.write(JSON.stringify(addVehicleRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('🔧 Test 2: Fixed create_vehicle_from_trim...');
    const createFromTrimRequest = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'create_vehicle_from_trim',
        arguments: {
          providerCode: '100026892420210101', // Mercedes S 500 trim from previous test
          provider: 'datak',
          vehicleClass: 'CAR',
          price: 34000,
          condition: 'USED',
          mileage: 87000,
          color: 'nero'
        }
      }
    };
    
    server.stdin.write(JSON.stringify(createFromTrimRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n✅ Tests completed! Results:');
    console.log('==========================================');
    console.log(outputBuffer);
    
    server.kill();
    
  } catch (error) {
    console.error('❌ Test error:', error);
    server.kill();
  }
}, 1000);

server.on('close', (code) => {
  console.log(`\n🎯 Test complete. Server exited with code ${code}`);
  
  // Parse results
  if (outputBuffer.includes('Vehicle added successfully') || outputBuffer.includes('Vehicle created successfully')) {
    console.log('🎉 SUCCESS! Vehicle creation is now working!');
  } else if (outputBuffer.includes('Invalid request')) {
    console.log('❌ Still failing. Need more investigation.');
  }
  
  process.exit(code || 0);
});
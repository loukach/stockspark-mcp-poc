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

console.log('Verifying newly created vehicle...\n');

// Spawn the MCP server
const server = spawn('node', ['src/index.js'], { env });

let outputBuffer = '';
let errorBuffer = '';

// Handle server output
server.stdout.on('data', (data) => {
  outputBuffer += data.toString();
});

server.stderr.on('data', (data) => {
  errorBuffer += data.toString();
  process.stderr.write(data);
});

// Send MCP requests after a short delay
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
    
    // List latest vehicles to find our new one
    console.log('=== Checking latest vehicles ===\n');
    const listRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'list_vehicles',
        arguments: { page: 0, size: 5 }
      }
    };
    
    server.stdin.write(JSON.stringify(listRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Try to get the specific vehicle ID 9699624
    console.log('=== Getting details for vehicle ID 9699624 ===\n');
    const getVehicleRequest = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'get_vehicle',
        arguments: { vehicleId: 9699624 }
      }
    };
    
    server.stdin.write(JSON.stringify(getVehicleRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\n=== Verification Results ===');
    console.log(outputBuffer);
    
    server.kill();
    
  } catch (error) {
    console.error('Verification error:', error);
    server.kill();
    process.exit(1);
  }
}, 1000);

server.on('close', (code) => {
  console.log(`\nVerification complete. Server exited with code ${code}`);
  process.exit(code || 0);
});
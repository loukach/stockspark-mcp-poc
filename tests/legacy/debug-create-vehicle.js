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

console.log('Debug: Testing create_vehicle_from_trim to analyze validation error...\n');

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
    // Send initialize request
    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '0.1.0',
        capabilities: {},
        clientInfo: {
          name: 'debug-client',
          version: '1.0.0'
        }
      }
    };
    
    server.stdin.write(JSON.stringify(initRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Test create_vehicle_from_trim - but first test compile_vehicle_by_trim directly to see the data
    console.log('\n=== Testing compile_vehicle_by_trim first ===\n');
    const compileRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'compile_vehicle_by_trim',
        arguments: {
          providerCode: "100044860720241217",
          vehicleClass: "CAR",
          provider: "datak"
        }
      }
    };
    
    server.stdin.write(JSON.stringify(compileRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n=== Compiled Vehicle Data ===');
    console.log(outputBuffer);
    
    console.log('\n=== Debug Complete ===');
    server.kill();
    
  } catch (error) {
    console.error('Debug error:', error);
    server.kill();
    process.exit(1);
  }
}, 1000);

server.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code || 0);
});
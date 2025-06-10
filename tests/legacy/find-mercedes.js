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

console.log('Searching for Mercedes-Benz vehicles...\n');

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
    
    // Search for Mercedes vehicles specifically
    console.log('=== Searching for Mercedes vehicles ===\n');
    const searchRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'list_vehicles',
        arguments: { 
          make: 'Mercedes-Benz',
          size: 20
        }
      }
    };
    
    server.stdin.write(JSON.stringify(searchRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Also try with just "Mercedes"
    console.log('=== Searching for vehicles with "Mercedes" ===\n');
    const searchRequest2 = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'list_vehicles',
        arguments: { 
          make: 'Mercedes',
          size: 20
        }
      }
    };
    
    server.stdin.write(JSON.stringify(searchRequest2) + '\n');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // List all vehicles with a larger page size to find it
    console.log('=== Listing all recent vehicles ===\n');
    const listAllRequest = {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'list_vehicles',
        arguments: { 
          page: 0,
          size: 20
        }
      }
    };
    
    server.stdin.write(JSON.stringify(listAllRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\n=== Search Results ===');
    console.log(outputBuffer);
    
    server.kill();
    
  } catch (error) {
    console.error('Search error:', error);
    server.kill();
  }
}, 1000);

server.on('close', (code) => {
  console.log(`\nSearch complete. Server exited with code ${code}`);
  process.exit(code || 0);
});
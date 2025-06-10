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

console.log('Starting MCP server test for vehicle operations...\n');

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
          name: 'test-client',
          version: '1.0.0'
        }
      }
    };
    
    server.stdin.write(JSON.stringify(initRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Send tools/list request to see available tools
    const toolsRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    };
    
    server.stdin.write(JSON.stringify(toolsRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Test get_vehicle with ID 9476301
    console.log('\n=== Testing get_vehicle for ID 9476301 ===\n');
    const getVehicleRequest = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'get_vehicle',
        arguments: {
          vehicleId: 9476301
        }
      }
    };
    
    server.stdin.write(JSON.stringify(getVehicleRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test list_vehicles
    console.log('\n=== Testing list_vehicles ===\n');
    const listVehiclesRequest = {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'list_vehicles',
        arguments: {
          page: 0,
          size: 3
        }
      }
    };
    
    server.stdin.write(JSON.stringify(listVehiclesRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test compile_vehicle_by_trim first to see what we're creating
    console.log('\n=== Testing compile_vehicle_by_trim for trim 100045447620250206 ===\n');
    const compileRequest = {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'compile_vehicle_by_trim',
        arguments: {
          providerCode: "100045447620250206",
          provider: "datak",
          vehicleClass: "CAR"
        }
      }
    };
    
    server.stdin.write(JSON.stringify(compileRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test create_vehicle_from_trim with complete parameters
    console.log('\n=== Testing create_vehicle_from_trim with complete parameters ===\n');
    const createVehicleRequest = {
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'create_vehicle_from_trim',
        arguments: {
          providerCode: "100045447620250206",
          provider: "datak",
          vehicleClass: "CAR",
          price: 25000,
          condition: "NEW"
        }
      }
    };
    
    server.stdin.write(JSON.stringify(createVehicleRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n=== Server Output ===');
    console.log(outputBuffer);
    
    console.log('\n=== Test Complete ===');
    server.kill();
    
  } catch (error) {
    console.error('Test error:', error);
    server.kill();
    process.exit(1);
  }
}, 1000);

server.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code || 0);
});
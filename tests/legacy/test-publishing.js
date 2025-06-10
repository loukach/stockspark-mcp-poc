const { spawn } = require('child_process');

// Set up environment variables with portal activation codes
const env = {
  ...process.env,
  STOCKSPARK_USERNAME: 'lucas.gros+demo@motork.io',
  STOCKSPARK_PASSWORD: 'ZDU8qty4fjg-qwx7apv',
  STOCKSPARK_CLIENT_ID: 'carspark-api',
  STOCKSPARK_AUTH_URL: 'https://auth.motork.io/realms/prod/protocol/openid-connect/token',
  STOCKSPARK_API_URL: 'https://carspark-api.dealerk.com',
  STOCKSPARK_COUNTRY: 'it',
  STOCKSPARK_COMPANY_ID: '35430',
  STOCKSPARK_DEALER_ID: '196036',
  // Portal activation codes (example values - should be configured)
  MYPORTAL_ACTIVATION_CODE: 'myportal-test-code',
  AUTOMOBILE_IT_ACTIVATION_CODE: 'automobile-it-test-code'
};

console.log('Starting MCP server test for publishing functionality...\n');

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
    
    // List available portals
    console.log('\n=== Listing available portals ===\n');
    const listPortalsRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'list_available_portals',
        arguments: {}
      }
    };
    
    server.stdin.write(JSON.stringify(listPortalsRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Get publication status for vehicle 9476352 (FIAT 500)
    console.log('\n=== Getting publication status for vehicle 9476352 ===\n');
    const getStatusRequest = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'get_publication_status',
        arguments: {
          vehicleId: 9476352
        }
      }
    };
    
    server.stdin.write(JSON.stringify(getStatusRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Try to publish to MyPortal
    console.log('\n=== Publishing vehicle 9476352 to MyPortal ===\n');
    const publishRequest = {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'publish_vehicle',
        arguments: {
          vehicleId: 9476352,
          portals: ['myportal']
        }
      }
    };
    
    server.stdin.write(JSON.stringify(publishRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check publication status again
    console.log('\n=== Getting updated publication status ===\n');
    const getUpdatedStatusRequest = {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'get_publication_status',
        arguments: {
          vehicleId: 9476352
        }
      }
    };
    
    server.stdin.write(JSON.stringify(getUpdatedStatusRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Try to publish to multiple portals
    console.log('\n=== Publishing vehicle 9476352 to multiple portals ===\n');
    const publishMultipleRequest = {
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'publish_vehicle',
        arguments: {
          vehicleId: 9476352,
          portals: ['myportal', 'automobile.it']
        }
      }
    };
    
    server.stdin.write(JSON.stringify(publishMultipleRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try to unpublish from one portal
    console.log('\n=== Unpublishing vehicle 9476352 from MyPortal ===\n');
    const unpublishRequest = {
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: {
        name: 'unpublish_vehicle',
        arguments: {
          vehicleId: 9476352,
          portals: ['myportal']
        }
      }
    };
    
    server.stdin.write(JSON.stringify(unpublishRequest) + '\n');
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
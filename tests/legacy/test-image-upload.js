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

console.log('Starting MCP server test for image operations...\n');

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
    
    // First, get current images for vehicle 9476352 (FIAT 500)
    console.log('\n=== Getting current images for vehicle 9476352 ===\n');
    const getImagesRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'get_vehicle_images',
        arguments: {
          vehicleId: 9476352
        }
      }
    };
    
    server.stdin.write(JSON.stringify(getImagesRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Upload test images
    console.log('\n=== Uploading images to vehicle 9476352 ===\n');
    const uploadRequest = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'upload_vehicle_images',
        arguments: {
          vehicleId: 9476352,
          imageUrls: [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Fiat_500_%282007%29_front.jpg/1200px-Fiat_500_%282007%29_front.jpg',
            'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Fiat_500_%282007%29_rear.jpg/1200px-Fiat_500_%282007%29_rear.jpg',
            'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Fiat_500_%282007%29_interior.jpg/1200px-Fiat_500_%282007%29_interior.jpg'
          ],
          mainImageIndex: 0
        }
      }
    };
    
    server.stdin.write(JSON.stringify(uploadRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get updated images
    console.log('\n=== Getting updated images for vehicle 9476352 ===\n');
    const getUpdatedImagesRequest = {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'get_vehicle_images',
        arguments: {
          vehicleId: 9476352
        }
      }
    };
    
    server.stdin.write(JSON.stringify(getUpdatedImagesRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
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
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

console.log('Starting MCP server test for analytics functionality...\n');

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
    
    // Test inventory health analysis
    console.log('\n=== Analyzing inventory health ===\n');
    const healthRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'analyze_inventory_health',
        arguments: {
          includeDetails: true
        }
      }
    };
    
    server.stdin.write(JSON.stringify(healthRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test underperforming vehicles analysis
    console.log('\n=== Finding underperforming vehicles ===\n');
    const underperformingRequest = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'get_underperforming_vehicles',
        arguments: {
          minDaysInStock: 30,
          maxImageCount: 5,
          limit: 5,
          sortBy: 'performance_score'
        }
      }
    };
    
    server.stdin.write(JSON.stringify(underperformingRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test pricing recommendations
    console.log('\n=== Getting pricing recommendations ===\n');
    const pricingRequest = {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'get_pricing_recommendations',
        arguments: {
          maxRecommendations: 5,
          priceAdjustmentRange: 10
        }
      }
    };
    
    server.stdin.write(JSON.stringify(pricingRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test bulk discount on a specific vehicle (if we have one)
    console.log('\n=== Testing bulk discount on vehicle 9476352 ===\n');
    const bulkDiscountRequest = {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'apply_bulk_discount',
        arguments: {
          vehicleIds: [9476352],
          discountPercentage: 5,
          republishToPortals: false,
          reason: 'Test discount for analytics demo'
        }
      }
    };
    
    server.stdin.write(JSON.stringify(bulkDiscountRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test specific vehicle pricing recommendation
    console.log('\n=== Getting specific vehicle pricing recommendation ===\n');
    const specificPricingRequest = {
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'get_pricing_recommendations',
        arguments: {
          vehicleId: 9476352,
          priceAdjustmentRange: 15
        }
      }
    };
    
    server.stdin.write(JSON.stringify(specificPricingRequest) + '\n');
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
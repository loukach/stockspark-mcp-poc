const { spawn } = require('child_process');

// Test different error scenarios
const errorTests = [
  {
    name: 'Invalid credentials',
    env: {
      STOCKSPARK_USERNAME: 'invalid@email.com',
      STOCKSPARK_PASSWORD: 'wrong-password',
      STOCKSPARK_CLIENT_ID: 'carspark-api',
      STOCKSPARK_AUTH_URL: 'https://auth.motork.io/realms/prod/protocol/openid-connect/token',
      STOCKSPARK_API_URL: 'https://carspark-api.dealerk.com',
      STOCKSPARK_COUNTRY: 'it',
      STOCKSPARK_COMPANY_ID: '35430',
      STOCKSPARK_DEALER_ID: '196036'
    },
    tests: [
      {
        name: 'test_connection',
        args: {}
      }
    ]
  },
  {
    name: 'Valid credentials but invalid requests',
    env: {
      STOCKSPARK_USERNAME: 'lucas.gros+demo@motork.io',
      STOCKSPARK_PASSWORD: 'ZDU8qty4fjg-qwx7apv',
      STOCKSPARK_CLIENT_ID: 'carspark-api',
      STOCKSPARK_AUTH_URL: 'https://auth.motork.io/realms/prod/protocol/openid-connect/token',
      STOCKSPARK_API_URL: 'https://carspark-api.dealerk.com',
      STOCKSPARK_COUNTRY: 'it',
      STOCKSPARK_COMPANY_ID: '35430',
      STOCKSPARK_DEALER_ID: '196036'
    },
    tests: [
      {
        name: 'get_vehicle',
        args: { vehicleId: 999999999 },
        expectedError: '404'
      },
      {
        name: 'get_vehicle',
        args: { vehicleId: -1 },
        expectedError: 'validation'
      },
      {
        name: 'get_vehicle',
        args: { vehicleId: 'invalid' },
        expectedError: 'validation'
      },
      {
        name: 'add_vehicle',
        args: { make: 'Toyota' }, // Missing required fields
        expectedError: 'validation'
      },
      {
        name: 'update_vehicle_price',
        args: { vehicleId: 9476352, newPrice: -1000 },
        expectedError: 'validation'
      }
    ]
  }
];

async function runErrorTest(testSuite) {
  console.log(`\n🧪 Testing: ${testSuite.name}`);
  console.log('='.repeat(50));
  
  return new Promise((resolve) => {
    const server = spawn('node', ['src/index.js'], { 
      env: { ...process.env, ...testSuite.env },
      stdio: ['pipe', 'pipe', 'pipe']
    });

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
            clientInfo: { name: 'error-test', version: '1.0.0' }
          }
        };
        
        server.stdin.write(JSON.stringify(initRequest) + '\n');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Run each test
        for (let i = 0; i < testSuite.tests.length; i++) {
          const test = testSuite.tests[i];
          console.log(`\n  📋 Test ${i + 1}: ${test.name}(${JSON.stringify(test.args)})`);
          
          const testRequest = {
            jsonrpc: '2.0',
            id: i + 2,
            method: 'tools/call',
            params: {
              name: test.name,
              arguments: test.args
            }
          };
          
          server.stdin.write(JSON.stringify(testRequest) + '\n');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        console.log('\n  📊 Results:');
        console.log(outputBuffer);
        
        server.kill();
        resolve();
        
      } catch (error) {
        console.error('Test error:', error);
        server.kill();
        resolve();
      }
    }, 1000);

    server.on('close', () => {
      resolve();
    });
  });
}

async function runAllTests() {
  console.log('🚀 Starting Error Handling Tests\n');
  
  for (const testSuite of errorTests) {
    await runErrorTest(testSuite);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause between tests
  }
  
  console.log('\n✅ All error handling tests completed!');
}

// Run tests
runAllTests().catch(console.error);
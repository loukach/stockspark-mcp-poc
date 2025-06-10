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

console.log('Starting MCP server test for compile_vehicle_by_trim...\n');

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
    
    // Test compile_vehicle_by_trim with specific parameters
    console.log('\n=== Testing compile_vehicle_by_trim ===\n');
    console.log('Parameters:');
    console.log('- providerCode: "100044860720241217"');
    console.log('- provider: "datak"');
    console.log('- vehicleClass: "CAR"\n');
    
    const compileVehicleRequest = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'compile_vehicle_by_trim',
        arguments: {
          providerCode: "100044860720241217",
          provider: "datak",
          vehicleClass: "CAR"
        }
      }
    };
    
    server.stdin.write(JSON.stringify(compileVehicleRequest) + '\n');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n=== Server Output ===');
    console.log(outputBuffer);
    
    // Try to parse the response and extract useful information
    const lines = outputBuffer.split('\n');
    for (const line of lines) {
      if (line.trim() && line.includes('"id":3')) {
        try {
          const response = JSON.parse(line);
          if (response.result && response.result.content && response.result.content[0]) {
            const content = response.result.content[0];
            if (content.text) {
              try {
                const vehicleData = JSON.parse(content.text);
                console.log('\n\n=== PARSED VEHICLE DATA ===');
                console.log(JSON.stringify(vehicleData, null, 2));
                
                console.log('\n\n=== ANALYSIS OF KEY FIELDS ===\n');
                
                console.log('MAKE OBJECT:');
                if (vehicleData.make) {
                  console.log('  Complete object:', JSON.stringify(vehicleData.make, null, 2));
                  console.log('  - id:', vehicleData.make.id, '(type:', typeof vehicleData.make.id, ')');
                  console.log('  - code:', vehicleData.make.code, '(type:', typeof vehicleData.make.code, ')');
                  console.log('  - name:', vehicleData.make.name, '(type:', typeof vehicleData.make.name, ')');
                } else {
                  console.log('  make is null or undefined');
                }
                
                console.log('\nMODEL OBJECT:');
                if (vehicleData.model) {
                  console.log('  Complete object:', JSON.stringify(vehicleData.model, null, 2));
                  console.log('  - id:', vehicleData.model.id, '(type:', typeof vehicleData.model.id, ')');
                  console.log('  - code:', vehicleData.model.code, '(type:', typeof vehicleData.model.code, ')');
                  console.log('  - name:', vehicleData.model.name, '(type:', typeof vehicleData.model.name, ')');
                } else {
                  console.log('  model is null or undefined');
                }
                
                console.log('\nVERSION OBJECT:');
                if (vehicleData.version) {
                  console.log('  Complete object:', JSON.stringify(vehicleData.version, null, 2));
                  console.log('  - id:', vehicleData.version.id, '(type:', typeof vehicleData.version.id, ')');
                  console.log('  - code:', vehicleData.version.code, '(type:', typeof vehicleData.version.code, ')');
                  console.log('  - name:', vehicleData.version.name, '(type:', typeof vehicleData.version.name, ')');
                } else {
                  console.log('  version is null or undefined');
                }
                
                console.log('\n\n=== OTHER KEY FIELDS ===\n');
                console.log('vehicleClass:', vehicleData.vehicleClass);
                console.log('externalId:', vehicleData.externalId);
                console.log('providerCode:', vehicleData.providerCode);
                console.log('provider:', vehicleData.provider);
                
                // Check for any fields that might contain IDs
                console.log('\n\n=== CHECKING FOR ID FIELDS ===\n');
                function findIdFields(obj, path = '') {
                  for (const [key, value] of Object.entries(obj || {})) {
                    const currentPath = path ? `${path}.${key}` : key;
                    if (key.toLowerCase().includes('id') || key.toLowerCase().includes('code')) {
                      console.log(`${currentPath}: ${JSON.stringify(value)} (type: ${typeof value})`);
                    }
                    if (value && typeof value === 'object' && !Array.isArray(value)) {
                      findIdFields(value, currentPath);
                    }
                  }
                }
                findIdFields(vehicleData);
                
              } catch (parseError) {
                console.log('\n\n=== Could not parse vehicle data ===');
                console.log('Raw content.text:', content.text);
              }
            }
          }
        } catch (jsonError) {
          // Not a JSON line, continue
        }
      }
    }
    
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
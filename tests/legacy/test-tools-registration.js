const { spawn } = require('child_process');

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

console.log('🔍 Verifying all MCP tools are properly registered...\n');

const server = spawn('node', ['src/index.js'], { env });

setTimeout(() => {
  const initRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { protocolVersion: '0.1.0', capabilities: {}, clientInfo: { name: 'tool-check', version: '1.0.0' } }
  };
  
  server.stdin.write(JSON.stringify(initRequest) + '\n');
  
  setTimeout(() => {
    const listToolsRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    };
    
    server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
    
    setTimeout(() => {
      server.kill();
    }, 2000);
  }, 1000);
}, 1000);

server.stdout.on('data', (data) => {
  const output = data.toString();
  if (output.includes('"tools":[')) {
    try {
      const response = JSON.parse(output.trim());
      if (response.result && response.result.tools) {
        console.log('✅ Tools successfully registered:\n');
        
        const categories = {
          'Vehicle Management': [],
          'Image Management': [],
          'Analytics': [],
          'Publishing': [],
          'System': []
        };
        
        response.result.tools.forEach((tool) => {
          if (tool.name.includes('vehicle') && !tool.name.includes('image')) {
            categories['Vehicle Management'].push(tool);
          } else if (tool.name.includes('image')) {
            categories['Image Management'].push(tool);
          } else if (tool.name.includes('underperforming') || tool.name.includes('discount') || tool.name.includes('analyz') || tool.name.includes('pricing')) {
            categories['Analytics'].push(tool);
          } else if (tool.name.includes('publish') || tool.name.includes('portal')) {
            categories['Publishing'].push(tool);
          } else {
            categories['System'].push(tool);
          }
        });
        
        Object.entries(categories).forEach(([category, tools]) => {
          if (tools.length > 0) {
            console.log(`📂 ${category}:`);
            tools.forEach((tool, i) => {
              console.log(`   ${i + 1}. ${tool.name} - ${tool.description}`);
            });
            console.log('');
          }
        });
        
        console.log(`🎯 Total: ${response.result.tools.length} tools registered`);
        
        // Verify expected tools are present
        const expectedTools = [
          'test_connection', 'add_vehicle', 'get_vehicle', 'list_vehicles', 'update_vehicle_price',
          'upload_vehicle_images', 'get_vehicle_images', 'delete_vehicle_image', 'set_main_image',
          'publish_vehicle', 'unpublish_vehicle', 'get_publication_status', 'list_available_portals',
          'get_underperforming_vehicles', 'apply_bulk_discount', 'analyze_inventory_health', 'get_pricing_recommendations'
        ];
        
        const registeredToolNames = response.result.tools.map(t => t.name);
        const missing = expectedTools.filter(name => !registeredToolNames.includes(name));
        
        if (missing.length === 0) {
          console.log('✅ All expected tools are registered!');
        } else {
          console.log('❌ Missing tools:', missing.join(', '));
        }
      }
    } catch (e) {
      console.log('Error parsing tools response:', e.message);
    }
  }
});

server.stderr.on('data', (data) => {
  const output = data.toString();
  if (output.includes('Authentication successful')) {
    console.log('✅ Authentication working');
  }
  if (output.includes('StockSpark MCP server running')) {
    console.log('✅ Server startup successful');
  }
});
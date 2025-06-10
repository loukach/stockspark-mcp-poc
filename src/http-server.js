const express = require('express');
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
// MCP types - not used directly in HTTP server but kept for future expansion
// const { ListToolsRequestSchema, CallToolRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { AuthManager } = require('./auth');
const { StockSparkClient } = require('./api/client');
const { VehicleAPI } = require('./api/vehicles');
const { ImageAPI } = require('./api/images');
const { PublicationAPI } = require('./api/publications');
const { ReferenceAPI } = require('./api/reference');
const { OrganizationAPI } = require('./api/organization');
const { vehicleTools } = require('./tools/vehicle-tools');
const { imageTools } = require('./tools/image-tools');
const { publishTools } = require('./tools/publish-tools');
const { analyticsTools } = require('./tools/analytics-tools');
const { referenceTools } = require('./tools/reference-tools');
const { organizationTools } = require('./tools/organization-tools');
const { logger } = require('./utils/logger');
const { createToolHandlers } = require('./mcp-tool-handlers');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize MCP server instance and APIs
let mcpServer;
let authManager;
let apiClient;
let vehicleAPI;
let imageAPI;
let publicationAPI;
let referenceAPI;
let organizationAPI;
let toolHandlers;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Initialize MCP server and APIs
async function initializeMCP() {
  try {
    // Check if we have environment variables for testing vs production
    const hasEnvVars = process.env.STOCKSPARK_USERNAME && 
                       process.env.STOCKSPARK_PASSWORD && 
                       process.env.STOCKSPARK_CLIENT_ID && 
                       process.env.STOCKSPARK_AUTH_URL;
    
    if (hasEnvVars) {
      // Initialize services for production
      authManager = new AuthManager();
      apiClient = new StockSparkClient(authManager);
      vehicleAPI = new VehicleAPI(apiClient);
      imageAPI = new ImageAPI(apiClient);
      publicationAPI = new PublicationAPI(apiClient);
      referenceAPI = new ReferenceAPI(apiClient);
      organizationAPI = new OrganizationAPI(apiClient);
    } else {
      logger.warn('Running in demo mode - environment variables not set');
      // Demo mode: APIs will be null, only test_connection will work
    }
    
    // Create MCP server instance
    mcpServer = new Server(
      {
        name: 'stockspark-mcp-http',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    // Create tool handlers with available APIs
    const apis = {
      authManager: hasEnvVars ? authManager : null,
      apiClient: hasEnvVars ? apiClient : null,
      vehicleAPI: hasEnvVars ? vehicleAPI : null,
      imageAPI: hasEnvVars ? imageAPI : null,
      publicationAPI: hasEnvVars ? publicationAPI : null,
      referenceAPI: hasEnvVars ? referenceAPI : null,
      organizationAPI: hasEnvVars ? organizationAPI : null,
    };
    
    toolHandlers = createToolHandlers(apis);
    
    if (hasEnvVars) {
      // Test authentication
      logger.info('Initializing StockSpark MCP HTTP server...');
      await authManager.getToken();
      logger.info('Authentication successful');
      
      // Initialize organization context
      logger.info('Discovering user organization context...');
      const context = await organizationAPI.initializeContext();
      logger.info('Organization context initialized', {
        companies: context.companies.length,
        selectedCompany: context.selectedCompany?.name,
        selectedDealer: context.selectedDealer?.name
      });
    } else {
      logger.info('StockSpark MCP HTTP server initialized in demo mode');
    }
    
    return true;
  } catch (error) {
    logger.error('Failed to initialize MCP:', error);
    throw error;
  }
}

// Health check endpoint
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'StockSpark MCP HTTP Server',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    tools: toolHandlers ? Object.keys(toolHandlers).length : 0
  });
});

// List available tools
app.get('/tools', async (_req, res) => {
  try {
    if (!mcpServer) {
      return res.status(503).json({
        success: false,
        error: 'MCP server not initialized'
      });
    }
    
    const tools = [
      ...organizationTools,
      ...vehicleTools,
      ...imageTools,
      ...publishTools,
      ...analyticsTools,
      ...referenceTools,
      {
        name: 'test_connection',
        description: 'Test connection to StockSpark API',
        inputSchema: { type: 'object', properties: {} }
      }
    ];
    
    res.json({
      success: true,
      result: {
        tools: tools
      }
    });
  } catch (error) {
    logger.error('Error listing tools:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Define which tools should use GET vs POST
const GET_TOOLS = [
  'test_connection', 'get_user_context', 'list_user_companies', 'list_company_dealers',
  'get_vehicle', 'list_vehicles', 'get_vehicle_images', 'get_publication_status',
  'list_available_portals', 'get_underperforming_vehicles', 'analyze_inventory_health',
  'get_pricing_recommendations', 'get_available_makes', 'get_available_models',
  'search_reference_data', 'compile_vehicle_by_trim', 'get_fuel_types',
  'get_transmission_types', 'get_vehicle_makes', 'get_vehicle_models',
  'get_vehicle_trims', 'find_models_by_make', 'get_vehicle_bodies', 'get_vehicle_fuels'
];

const POST_TOOLS = [
  'select_company', 'select_dealer', 'add_vehicle', 'update_vehicle_price',
  'upload_vehicle_images', 'upload_vehicle_images_claude', 'upload_vehicle_images_from_data',
  'delete_vehicle_image', 'set_main_image', 'publish_vehicle', 'unpublish_vehicle',
  'apply_bulk_discount', 'start_vehicle_creation', 'create_vehicle_from_trim',
  'compare_trim_variants'
];

// Execute tool with GET method (for read operations)
app.get('/tools/:toolName', async (req, res) => {
  try {
    const { toolName } = req.params;
    const args = req.query; // Arguments from query parameters
    
    if (!GET_TOOLS.includes(toolName)) {
      return res.status(405).json({
        success: false,
        error: `Tool '${toolName}' requires POST method`
      });
    }
    
    await executeToolHandler(toolName, args, res);
  } catch (error) {
    logger.error(`Error executing GET tool ${req.params.toolName}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Execute tool with POST method (for write operations)
app.post('/tools/:toolName', async (req, res) => {
  try {
    const { toolName } = req.params;
    const { arguments: args = {} } = req.body;
    
    if (!POST_TOOLS.includes(toolName)) {
      return res.status(405).json({
        success: false,
        error: `Tool '${toolName}' requires GET method`
      });
    }
    
    await executeToolHandler(toolName, args, res);
  } catch (error) {
    logger.error(`Error executing POST tool ${req.params.toolName}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Common tool execution logic
async function executeToolHandler(toolName, args, res) {
  if (!toolHandlers) {
    return res.status(503).json({
      success: false,
      error: 'MCP server not initialized'
    });
  }
  
  if (!toolHandlers[toolName]) {
    return res.status(404).json({
      success: false,
      error: `Tool '${toolName}' not found`
    });
  }
  
  logger.info(`Executing tool: ${toolName}`, { args });
  const result = await toolHandlers[toolName](args);
  
  res.json({
    success: true,
    result: result
  });
}

// Error handling middleware
app.use((err, _req, res, _next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
async function startServer() {
  try {
    await initializeMCP();
    app.listen(PORT, () => {
      console.log(`StockSpark MCP HTTP Server running on port ${PORT}`);
      logger.info('HTTP server started successfully', { port: PORT });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
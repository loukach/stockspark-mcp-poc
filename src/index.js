#!/usr/bin/env node
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { 
  ListToolsRequestSchema,
  CallToolRequestSchema 
} = require('@modelcontextprotocol/sdk/types.js');

// Core modules
const { AuthManager } = require('./auth');
const { StockSparkClient } = require('./api/client');
const { VehicleAPI } = require('./api/vehicles');
const { ImageAPI } = require('./api/images');
const { PublicationAPI } = require('./api/publications');
const { ReferenceAPI } = require('./api/reference');
const { OrganizationAPI } = require('./api/organization');

// Tool schemas and handlers
const { vehicleTools, vehicleHandlers } = require('./tools/vehicle-tools');
const { imageTools, imageHandlers } = require('./tools/image-tools');
const { publishTools, publishHandlers } = require('./tools/publish-tools');
const { organizationTools, organizationHandlers } = require('./tools/organization-tools');
const { analyticsTools, analyticsHandlers } = require('./tools/analytics-tools');
const { leadsTools, leadsHandlers } = require('./tools/leads-tools');
const { referenceTools, referenceHandlers } = require('./tools/reference-tools');

// Utilities
const { trackPerformance } = require('./utils/performance');
const { mapInputToVehicle, formatVehicleResponse, formatVehicleListResponse } = require('./utils/mappers');
const { formatErrorForUser } = require('./utils/errors');
const { logger } = require('./utils/logger');

// Global API instances
let authManager;
let apiClient;
let vehicleAPI;
let imageAPI;
let publicationAPI;
let referenceAPI;
let organizationAPI;

// Create MCP server instance
const server = new Server(
  {
    name: 'stockspark-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Error handling
server.onerror = (error) => {
  logger.error('MCP Server Error:', {
    message: error.message,
    stack: error.stack,
    name: error.name
  });
};

// Helper function to wrap tool handlers with error handling
function wrapHandler(handlerName, handlerFn) {
  const trackedHandler = trackPerformance(handlerName, handlerFn);
  
  return async (args) => {
    try {
      // Avoid logging image data which can be huge
      const logArgs = handlerName === 'upload_vehicle_images' 
        ? { vehicleId: args.vehicleId, imageCount: args.images?.length }
        : args;
      logger.debug(`Executing ${handlerName}`, { args: logArgs });
      const result = await trackedHandler(args);
      logger.debug(`${handlerName} completed successfully`);
      return result;
    } catch (error) {
      const logArgs = handlerName === 'upload_vehicle_images' 
        ? { vehicleId: args.vehicleId, imageCount: args.images?.length }
        : args;
      logger.error(`${handlerName} failed:`, {
        error: error.message,
        args: logArgs,
        stack: error.stack
      });
      return {
        content: [
          {
            type: 'text',
            text: formatErrorForUser(error),
          },
        ],
        isError: true,
      };
    }
  };
}

// Create dependency injection container
function createDependencies() {
  const { tempFileManager } = require('./utils/temp-files');
  
  return {
    vehicleAPI,
    imageAPI,
    publicationAPI,
    referenceAPI,
    organizationAPI,
    mapInputToVehicle,
    formatVehicleResponse,
    formatVehicleListResponse,
    tempFileManager,
    logger
  };
}

// Tool handlers - much cleaner now!
const toolHandlers = {
  // Test connection (keep this in index.js as it's core)
  test_connection: trackPerformance('test_connection', async () => {
    try {
      const context = organizationAPI.getCurrentContext();
      if (!context.companyId || !context.dealerId) {
        return {
          content: [
            {
              type: 'text',
              text: '⚠️ No organization context set. Please run get_user_context, then select_company and select_dealer before proceeding.',
            },
          ],
        };
      }

      const vehicleList = await vehicleAPI.listVehicles({ size: 1 });
      return {
        content: [
          {
            type: 'text',
            text: `✅ StockSpark MCP connection successful!\n🏢 Company: ${context.companyName}\n🏪 Dealer: ${context.dealerName}\n📊 Vehicles in stock: ${vehicleList.totalElements || 0}`,
          },
        ],
      };
    } catch (error) {
      throw error;
    }
  }),

  // Vehicle tools
  ...Object.fromEntries(
    Object.entries(vehicleHandlers).map(([name, handler]) => [
      name,
      wrapHandler(name, async (args) => handler(args, createDependencies()))
    ])
  ),

  // Image tools
  ...Object.fromEntries(
    Object.entries(imageHandlers).map(([name, handler]) => [
      name,
      wrapHandler(name, async (args) => handler(args, createDependencies()))
    ])
  ),

  // Publication tools
  ...Object.fromEntries(
    Object.entries(publishHandlers).map(([name, handler]) => [
      name,
      wrapHandler(name, async (args) => handler(args, createDependencies()))
    ])
  ),

  // Organization tools
  ...Object.fromEntries(
    Object.entries(organizationHandlers).map(([name, handler]) => [
      name,
      wrapHandler(name, async (args) => handler(args, createDependencies()))
    ])
  ),

  // Analytics tools
  ...Object.fromEntries(
    Object.entries(analyticsHandlers).map(([name, handler]) => [
      name,
      wrapHandler(name, async (args) => handler(args, createDependencies()))
    ])
  ),

  // Reference tools
  ...Object.fromEntries(
    Object.entries(referenceHandlers).map(([name, handler]) => [
      name,
      wrapHandler(name, async (args) => handler(args, createDependencies()))
    ])
  ),

  // Leads tools
  ...Object.fromEntries(
    Object.entries(leadsHandlers).map(([name, handler]) => [
      name,
      wrapHandler(name, async (args) => handler(args, createDependencies()))
    ])
  )
};

// All available tools (schemas)
const allTools = [
  ...vehicleTools,
  ...imageTools,
  ...publishTools,
  ...analyticsTools,
  ...leadsTools,
  ...referenceTools,
  ...organizationTools
];

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: allTools,
  };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (!toolHandlers[name]) {
    throw new Error(`Unknown tool: ${name}`);
  }
  
  return await toolHandlers[name](args || {});
});

// Main function
async function main() {
  logger.info('🚀 Starting StockSpark MCP Server...');
  
  try {
    // Initialize authentication
    authManager = new AuthManager();
    await authManager.getToken();
    logger.info('✅ Authentication successful');
    
    // Initialize API client and services
    apiClient = new StockSparkClient(authManager);
    vehicleAPI = new VehicleAPI(apiClient);
    imageAPI = new ImageAPI(apiClient);
    publicationAPI = new PublicationAPI(apiClient);
    referenceAPI = new ReferenceAPI(apiClient);
    organizationAPI = new OrganizationAPI(apiClient);
    
    // Initialize organization context
    await organizationAPI.initializeContext();
    logger.info('✅ Organization context initialized');
    
    // Start server
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    logger.info('✅ StockSpark MCP Server is running and ready for connections');
    
  } catch (error) {
    logger.error('❌ Failed to start server:', {
      message: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { server };
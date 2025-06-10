// Extracted tool handlers from index.js for reuse in HTTP server
// This avoids duplicating the tool logic between stdio and HTTP modes

const { mapInputToVehicle, formatVehicleResponse, formatVehicleListResponse, analyzeVehiclePerformance, formatInventoryHealthReport } = require('./utils/mappers');
const { formatErrorForUser } = require('./utils/errors');
const { logger } = require('./utils/logger');

// Helper function to wrap tool handlers with error handling
function wrapHandler(handlerName, handlerFn) {
  return async (args) => {
    try {
      logger.debug(`Executing ${handlerName}`, { args });
      const result = await handlerFn(args);
      logger.debug(`${handlerName} completed successfully`);
      return result;
    } catch (error) {
      logger.error(`${handlerName} failed:`, {
        error: error.message,
        args,
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

// Factory function to create tool handlers with injected dependencies
function createToolHandlers(apis) {
  const { authManager, vehicleAPI, imageAPI, publicationAPI, referenceAPI, organizationAPI } = apis;
  
  return {
    // Test tool
    test_connection: async () => {
      try {
        if (authManager) {
          await authManager.getToken();
          logger.info('Connection test successful');
          return {
            content: [
              {
                type: 'text',
                text: 'Connection successful! StockSpark MCP server is ready.',
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: 'Demo mode - StockSpark MCP HTTP server is ready (no authentication configured).',
              },
            ],
          };
        }
      } catch (error) {
        logger.error('Connection test failed:', { error: error.message });
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
    },

    // Organization tools
    get_user_context: wrapHandler('get_user_context', async () => {
      if (!organizationAPI) {
        throw new Error('Organization API not available in demo mode');
      }
      
      const context = organizationAPI.getCurrentContext();
      
      let message = '🏢 Current Organization Context:\n\n';
      message += organizationAPI.formatContextInfo();
      
      if (!context.company) {
        message += '\n\n⚠️ No company selected. Use list_user_companies to see available options.';
      }
      if (!context.dealer) {
        message += '\n⚠️ No dealer selected. Use list_company_dealers to see available options.';
      }
      
      return {
        content: [
          {
            type: 'text',
            text: message,
          },
        ],
      };
    }),

    // Vehicle tools  
    add_vehicle: wrapHandler('add_vehicle', async (args) => {
      if (!vehicleAPI || !organizationAPI) {
        throw new Error('Vehicle API not available in demo mode');
      }
      
      const { validateRequired } = require('./utils/errors');
      
      validateRequired(args.make, 'make');
      validateRequired(args.model, 'model');
      validateRequired(args.price, 'price');
      validateRequired(args.condition, 'condition');
      
      // Get current organization context
      const context = organizationAPI.getCurrentContext();
      if (!context.companyId || !context.dealerId) {
        throw new Error('No company or dealer selected. Use get_user_context to check, then select_company and select_dealer as needed.');
      }
      
      const vehicleData = mapInputToVehicle(args, context);
      const result = await vehicleAPI.addVehicle(vehicleData);
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ Vehicle added successfully with ID: ${result.vehicleId}\n🚗 ${args.make} ${args.model} - €${args.price}`,
          },
        ],
      };
    }),

    get_vehicle: wrapHandler('get_vehicle', async (args) => {
      if (!vehicleAPI) {
        throw new Error('Vehicle API not available in demo mode');
      }
      
      const { validateVehicleId } = require('./utils/errors');
      
      validateVehicleId(args.vehicleId);
      
      const vehicle = await vehicleAPI.getVehicle(args.vehicleId);
      const formatted = formatVehicleResponse(vehicle);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(formatted, null, 2),
          },
        ],
      };
    }),

    list_vehicles: wrapHandler('list_vehicles', async (args) => {
      if (!vehicleAPI) {
        throw new Error('Vehicle API not available in demo mode');
      }
      
      const result = await vehicleAPI.listVehicles(args);
      const formatted = formatVehicleListResponse(result);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(formatted, null, 2),
          },
        ],
      };
    }),

    // Add placeholders for other tools to avoid "tool not found" errors
    // These will return helpful error messages in demo mode
    ...createDemoPlaceholders([
      'list_user_companies', 'select_company', 'list_company_dealers', 'select_dealer',
      'update_vehicle_price', 'upload_vehicle_images', 'upload_vehicle_images_claude', 
      'upload_vehicle_images_from_data', 'get_vehicle_images', 'delete_vehicle_image', 
      'set_main_image', 'publish_vehicle', 'unpublish_vehicle', 'get_publication_status',
      'list_available_portals', 'get_underperforming_vehicles', 'apply_bulk_discount',
      'analyze_inventory_health', 'get_pricing_recommendations', 'get_available_makes',
      'get_available_models', 'search_reference_data', 'compile_vehicle_by_trim',
      'get_fuel_types', 'get_transmission_types', 'get_vehicle_makes', 'get_vehicle_models',
      'get_vehicle_trims', 'find_models_by_make', 'get_vehicle_bodies', 'get_vehicle_fuels',
      'start_vehicle_creation', 'create_vehicle_from_trim', 'compare_trim_variants'
    ])
  };
}

// Create placeholder handlers for demo mode
function createDemoPlaceholders(toolNames) {
  const placeholders = {};
  
  toolNames.forEach(toolName => {
    placeholders[toolName] = async () => {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Tool '${toolName}' is not available in demo mode. Please configure environment variables to enable full functionality.`,
          },
        ],
        isError: true,
      };
    };
  });
  
  return placeholders;
}

module.exports = { createToolHandlers };
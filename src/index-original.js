#!/usr/bin/env node
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { 
  ListToolsRequestSchema,
  CallToolRequestSchema 
} = require('@modelcontextprotocol/sdk/types.js');
const { AuthManager } = require('./auth');
const { StockSparkClient } = require('./api/client');
const { VehicleAPI } = require('./api/vehicles');
const { ImageAPI } = require('./api/images');
const { PublicationAPI } = require('./api/publications');
const { ReferenceAPI } = require('./api/reference');
const { OrganizationAPI } = require('./api/organization');
const { vehicleTools } = require('./tools/vehicle-tools');
const { imageTools, imageHandlers } = require('./tools/image-tools');
const { publishTools } = require('./tools/publish-tools');
const { analyticsTools } = require('./tools/analytics-tools');
const { leadsTools } = require('./tools/leads-tools');
const { referenceTools } = require('./tools/reference-tools');
const { organizationTools } = require('./tools/organization-tools');
const { performanceTools } = require('./tools/performance-tools');
const { trackPerformance } = require('./utils/performance');
const { mapInputToVehicle, formatVehicleResponse, formatVehicleListResponse, analyzeVehiclePerformance, formatInventoryHealthReport } = require('./utils/mappers');
const { formatErrorForUser } = require('./utils/errors');
const { logger } = require('./utils/logger');

// Initialize auth and API client
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
  // Apply performance tracking to the handler
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
      // Avoid logging image data which can be huge
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

// Tool handlers
const toolHandlers = {
  // Test tool
  test_connection: trackPerformance('test_connection', async () => {
    try {
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
  }),
  
  // Performance monitoring
  get_mcp_performance: performanceTools[0].handler,

  // Organization tools
  get_user_context: wrapHandler('get_user_context', async () => {
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

  list_user_companies: wrapHandler('list_user_companies', async (args) => {
    const companies = await organizationAPI.getUserCompanies(args.country);
    const current = organizationAPI.getCurrentContext();
    
    let message = `🏢 Available Companies (${companies.length}):\n\n`;
    
    companies.forEach(company => {
      const isCurrent = current.companyId === company.id;
      message += `${isCurrent ? '✅' : '◻️'} ${company.name}\n`;
      message += `   ID: ${company.id}\n`;
      message += `   Email: ${company.email || 'N/A'}\n`;
      message += `   City: ${company.salesCity || 'N/A'}\n`;
      if (company.vehicleClasses) {
        message += `   Vehicle Types: ${company.vehicleClasses.map(vc => vc.description).join(', ')}\n`;
      }
      message += '\n';
    });
    
    if (companies.length > 1) {
      message += '💡 Use select_company to switch between companies.';
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

  select_company: wrapHandler('select_company', async (args) => {
    const { validateRequired } = require('./utils/errors');
    validateRequired(args.companyId, 'companyId');
    
    const result = await organizationAPI.selectCompany(args.companyId, args.country);
    
    let message = `✅ Selected Company: ${result.company.name}\n`;
    message += `   ID: ${result.company.id}\n\n`;
    
    if (result.dealers.length === 0) {
      message += '⚠️ No dealers found for this company.';
    } else if (result.dealers.length === 1) {
      message += `✅ Auto-selected dealer: ${result.selectedDealer.name} (ID: ${result.selectedDealer.id})`;
    } else {
      message += `📍 Found ${result.dealers.length} dealers:\n`;
      result.dealers.forEach(dealer => {
        const isSelected = result.selectedDealer?.id === dealer.id;
        message += `${isSelected ? '✅' : '◻️'} ${dealer.name} (ID: ${dealer.id})\n`;
      });
      message += '\n💡 Use select_dealer to choose a different dealer.';
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

  list_company_dealers: wrapHandler('list_company_dealers', async (args) => {
    const context = organizationAPI.getCurrentContext();
    const companyId = args.companyId || context.companyId;
    
    if (!companyId) {
      throw new Error('No company selected. Use list_user_companies and select_company first.');
    }
    
    const dealers = await organizationAPI.getCompanyDealers(companyId);
    
    let message = `📍 Dealers for Company ${companyId} (${dealers.length}):\n\n`;
    
    dealers.forEach(dealer => {
      const isCurrent = context.dealerId === dealer.id;
      message += `${isCurrent ? '✅' : '◻️'} ${dealer.name}\n`;
      message += `   ID: ${dealer.id}\n`;
      message += `   Phone: ${dealer.phone || 'N/A'}\n`;
      message += `   Email: ${dealer.email || 'N/A'}\n`;
      message += `   Address: ${dealer.address || 'N/A'}\n`;
      message += `   City: ${dealer.city || 'N/A'}\n`;
      message += '\n';
    });
    
    if (dealers.length > 1) {
      message += '💡 Use select_dealer to switch between dealers.';
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

  select_dealer: wrapHandler('select_dealer', async (args) => {
    const { validateRequired } = require('./utils/errors');
    validateRequired(args.dealerId, 'dealerId');
    
    const dealer = organizationAPI.selectDealer(args.dealerId);
    
    return {
      content: [
        {
          type: 'text',
          text: `✅ Selected Dealer: ${dealer.name}\n   ID: ${dealer.id}\n   Address: ${dealer.address || 'N/A'}\n   City: ${dealer.city || 'N/A'}`,
        },
      ],
    };
  }),

  // Vehicle tools  
  add_vehicle: wrapHandler('add_vehicle', async (args) => {
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
          text: `✅ Vehicle added successfully!\n🚗 View vehicle: https://carspark.dealerk.it/vehicle/show/${result.vehicleId}\n📋 ${args.make} ${args.model} - €${args.price}`,
        },
      ],
    };
  }),

  get_vehicle: wrapHandler('get_vehicle', async (args) => {
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

  update_vehicle_price: wrapHandler('update_vehicle_price', async (args) => {
    const { validateVehicleId, validatePrice } = require('./utils/errors');
    
    validateVehicleId(args.vehicleId);
    validatePrice(args.newPrice);
    
    await vehicleAPI.updateVehiclePrice(args.vehicleId, args.newPrice);
    
    return {
      content: [
        {
          type: 'text',
          text: `✅ Price updated successfully for vehicle ${args.vehicleId} to €${args.newPrice}`,
        },
      ],
    };
  }),

  // Image tools - Now using modular handlers with dependency injection
  upload_vehicle_images: wrapHandler('upload_vehicle_images', async (args) => {
    const { tempFileManager } = require('./utils/temp-files');
    return await imageHandlers.upload_vehicle_images(args, { 
      imageAPI, 
      logger,
      tempFileManager 
    });
  }),

  upload_vehicle_images_from_data: wrapHandler('upload_vehicle_images_from_data', async (args) => {
    return await imageHandlers.upload_vehicle_images_from_data(args, { 
      imageAPI, 
      logger 
    });
  }),

  upload_vehicle_images_claude: wrapHandler('upload_vehicle_images_claude', async (args) => {
    const { tempFileManager } = require('./utils/temp-files');
    return await imageHandlers.upload_vehicle_images_claude(args, { 
      imageAPI, 
      tempFileManager, 
      logger 
    });
  }),

  get_vehicle_images: wrapHandler('get_vehicle_images', async (args) => {
    return await imageHandlers.get_vehicle_images(args, { 
      imageAPI 
    });
  }),

  delete_vehicle_image: async (args) => {
    return await imageHandlers.delete_vehicle_image(args, { 
      imageAPI 
    });
  },

  set_main_image: async (args) => {
    return await imageHandlers.set_main_image(args, { 
      imageAPI 
    });
  },

  // Publication tools
  publish_vehicle: async (args) => {
    try {
      if (args.portals.includes('all')) {
        const result = await publicationAPI.publishToAllPortals(args.vehicleId);
        return {
          content: [
            {
              type: 'text',
              text: result.message,
            },
          ],
        };
      } else {
        const result = await publicationAPI.publishToMultiplePortals(args.vehicleId, args.portals);
        let message = `Published vehicle ${args.vehicleId} to ${result.successCount}/${result.totalRequested} portals\n\n`;
        
        result.results.forEach(res => {
          message += `✓ ${res.portal}: ${res.message}\n`;
        });
        
        if (result.errors.length > 0) {
          message += '\nErrors:\n';
          result.errors.forEach(err => {
            message += `✗ ${err.portal}: ${err.error}\n`;
          });
        }
        
        return {
          content: [
            {
              type: 'text',
              text: message,
            },
          ],
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to publish vehicle: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },

  unpublish_vehicle: async (args) => {
    try {
      if (args.portals.includes('all')) {
        const result = await publicationAPI.unpublishFromAllPortals(args.vehicleId);
        return {
          content: [
            {
              type: 'text',
              text: result.message,
            },
          ],
        };
      } else {
        const result = await publicationAPI.unpublishFromMultiplePortals(args.vehicleId, args.portals);
        let message = `Unpublished vehicle ${args.vehicleId} from ${result.successCount}/${result.totalRequested} portals\n\n`;
        
        result.results.forEach(res => {
          message += `✓ ${res.portal}: ${res.message}\n`;
        });
        
        if (result.errors.length > 0) {
          message += '\nErrors:\n';
          result.errors.forEach(err => {
            message += `✗ ${err.portal}: ${err.error}\n`;
          });
        }
        
        return {
          content: [
            {
              type: 'text',
              text: message,
            },
          ],
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to unpublish vehicle: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },

  get_publication_status: async (args) => {
    try {
      const result = await publicationAPI.getPublicationStatus(args.vehicleId);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to get publication status: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },

  list_available_portals: async () => {
    try {
      const result = publicationAPI.getAvailablePortals();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to get available portals: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },

  // Analytics tools
  get_underperforming_vehicles: async (args) => {
    try {
      // Fetch all vehicles first (list API doesn't include image counts)
      const allVehiclesResponse = await vehicleAPI.listVehicles({ size: 1000 });
      const vehicleList = allVehiclesResponse.vehicles || [];
      
      // Get detailed vehicle data for accurate image counts (limit to avoid too many API calls)
      const vehicles = [];
      const limit = Math.min(vehicleList.length, 50); // Process max 50 vehicles for performance
      
      for (let i = 0; i < limit; i++) {
        try {
          const fullVehicle = await vehicleAPI.getVehicle(vehicleList[i].vehicleId);
          vehicles.push(fullVehicle);
        } catch (error) {
          console.error(`Failed to get vehicle ${vehicleList[i].vehicleId}:`, error.message);
          // Use list data as fallback
          vehicles.push(vehicleList[i]);
        }
      }
      
      if (vehicles.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No vehicles found in inventory',
            },
          ],
        };
      }

      // Fetch lead data if STOCKSPARK_API_KEY is available
      let leadData = null;
      try {
        if (process.env.STOCKSPARK_API_KEY) {
          logger.info('STOCKSPARK_API_KEY configured - fetching lead data for enhanced vehicle analysis');
          
          const { getLeads } = require('./api/leads');
          
          // Get leads for the last 60 days for analysis
          const sixtyDaysAgo = new Date();
          sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
          const dateFrom = sixtyDaysAgo.toISOString().split('T')[0];
          
          logger.info(`Fetching leads from ${dateFrom} to enhance vehicle performance analysis`);
          
          leadData = await getLeads({ dateFrom });
          
          if (Array.isArray(leadData)) {
            logger.info(`Successfully integrated ${leadData.length} leads into vehicle analysis`, {
              leadCount: leadData.length,
              dateFrom,
              analysisType: 'underperforming_vehicles'
            });
          } else {
            logger.warn('Leads API returned unexpected format - proceeding without lead data', {
              responseType: typeof leadData
            });
            leadData = null;
          }
        } else {
          logger.info('STOCKSPARK_API_KEY not configured - analyzing vehicles without lead data', {
            note: 'Set STOCKSPARK_API_KEY to enable customer inquiry tracking'
          });
        }
      } catch (error) {
        logger.error('Failed to fetch lead data for vehicle analysis', {
          error: error.message,
          fallback: 'Continuing analysis without lead data'
        });
        leadData = null;
      }
      
      // Analyze each vehicle's performance with lead data
      const analyses = vehicles.map(vehicle => 
        analyzeVehiclePerformance(vehicle, {
          minDaysInStock: args.minDaysInStock || 30,
          maxImageCount: args.maxImageCount || 5,
          priceThreshold: args.priceThreshold,
          leadData: leadData
        })
      );
      
      // Filter underperforming vehicles
      let underperforming = analyses.filter(a => a.needsAttention);
      
      // Sort by the specified criteria
      switch (args.sortBy) {
        case 'days_in_stock':
          underperforming.sort((a, b) => b.daysInStock - a.daysInStock);
          break;
        case 'price':
          underperforming.sort((a, b) => b.price - a.price);
          break;
        case 'performance_score':
        default:
          underperforming.sort((a, b) => b.performanceScore - a.performanceScore);
          break;
      }
      
      // Limit results
      const resultLimit = args.limit || 20;
      underperforming = underperforming.slice(0, resultLimit);
      
      const result = {
        totalVehicles: vehicles.length,
        underperformingCount: analyses.filter(a => a.needsAttention).length,
        analyzedVehicles: underperforming.length,
        vehicles: underperforming
      };
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to analyze underperforming vehicles: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },

  apply_bulk_discount: async (args) => {
    try {
      const results = [];
      const errors = [];
      const { vehicleIds, discountPercentage, republishToPortals = false } = args;
      
      for (const vehicleId of vehicleIds) {
        try {
          // Get current vehicle data
          const vehicle = await vehicleAPI.getVehicle(vehicleId);
          const currentPrice = vehicle.priceGross?.consumerPrice || 0;
          
          if (currentPrice <= 0) {
            errors.push({
              vehicleId,
              error: 'Invalid current price'
            });
            continue;
          }
          
          // Calculate new price
          const discountAmount = Math.round(currentPrice * (discountPercentage / 100));
          const newPrice = currentPrice - discountAmount;
          
          // Update price
          await vehicleAPI.updateVehiclePrice(vehicleId, newPrice);
          
          const result = {
            vehicleId,
            make: vehicle.make?.name || 'Unknown',
            model: vehicle.model?.name || 'Unknown',
            originalPrice: currentPrice,
            discountAmount,
            newPrice,
            discountPercentage,
            priceUpdated: true
          };
          
          // Republish if requested
          if (republishToPortals) {
            try {
              // Get publication status to see which portals it's currently on
              const pubStatus = await publicationAPI.getPublicationStatus(vehicleId);
              const activePortals = pubStatus.publishedPortals || [];
              
              if (activePortals.length > 0) {
                // Republish to active portals
                const republishResult = await publicationAPI.publishToMultiplePortals(vehicleId, activePortals);
                result.republished = true;
                result.republishedPortals = activePortals;
                result.republishSuccess = republishResult.success;
              } else {
                result.republished = false;
                result.republishReason = 'No active portals found';
              }
            } catch (republishError) {
              result.republished = false;
              result.republishError = republishError.message;
            }
          }
          
          results.push(result);
          
        } catch (vehicleError) {
          errors.push({
            vehicleId,
            error: vehicleError.message
          });
        }
      }
      
      const summary = {
        totalRequested: vehicleIds.length,
        successCount: results.length,
        errorCount: errors.length,
        totalSavings: results.reduce((sum, r) => sum + r.discountAmount, 0),
        republishRequested: republishToPortals,
        results,
        errors
      };
      
      let message = `Bulk discount applied: ${results.length}/${vehicleIds.length} vehicles updated\n`;
      message += `Total savings: €${summary.totalSavings}\n\n`;
      
      if (results.length > 0) {
        message += 'Updated vehicles:\n';
        results.forEach(r => {
          message += `• ${r.make} ${r.model} (ID: ${r.vehicleId}): €${r.originalPrice} → €${r.newPrice} (-€${r.discountAmount})`;
          if (republishToPortals && r.republished) {
            message += ` [Republished to: ${r.republishedPortals.join(', ')}]`;
          }
          message += '\n';
        });
      }
      
      if (errors.length > 0) {
        message += '\nErrors:\n';
        errors.forEach(e => {
          message += `• Vehicle ${e.vehicleId}: ${e.error}\n`;
        });
      }
      
      return {
        content: [
          {
            type: 'text',
            text: message,
          },
        ],
      };
      
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to apply bulk discount: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },

  analyze_inventory_health: async (args) => {
    try {
      // Fetch all vehicles (list API doesn't include image counts)
      const allVehiclesResponse = await vehicleAPI.listVehicles({ size: 1000 });
      const vehicleList = allVehiclesResponse.vehicles || [];
      
      // Get detailed vehicle data for accurate image counts
      const vehicles = [];
      const limit = Math.min(vehicleList.length, 50); // Process max 50 vehicles for performance
      
      for (let i = 0; i < limit; i++) {
        try {
          const fullVehicle = await vehicleAPI.getVehicle(vehicleList[i].vehicleId);
          vehicles.push(fullVehicle);
        } catch (error) {
          console.error(`Failed to get vehicle ${vehicleList[i].vehicleId}:`, error.message);
          // Use list data as fallback
          vehicles.push(vehicleList[i]);
        }
      }
      
      if (vehicles.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No vehicles found in inventory',
            },
          ],
        };
      }
      
      const report = formatInventoryHealthReport(vehicles, {
        includeDetails: args.includeDetails || false
      });
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(report, null, 2),
          },
        ],
      };
      
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to analyze inventory health: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },

  get_pricing_recommendations: async (args) => {
    try {
      const recommendations = [];
      
      if (args.vehicleId) {
        // Analyze specific vehicle
        const vehicle = await vehicleAPI.getVehicle(args.vehicleId);
        const analysis = analyzeVehiclePerformance(vehicle, {
          priceAdjustmentRange: args.priceAdjustmentRange || 15
        });
        
        const currentPrice = vehicle.priceGross?.consumerPrice || 0;
        const maxAdjustment = args.priceAdjustmentRange || 15;
        
        // Generate recommendations based on performance
        if (analysis.daysInStock > 90) {
          const suggestedDiscount = Math.min(15, maxAdjustment);
          const newPrice = Math.round(currentPrice * (1 - suggestedDiscount / 100));
          recommendations.push({
            vehicleId: args.vehicleId,
            type: 'price_reduction',
            reason: `Vehicle has been in stock for ${analysis.daysInStock} days`,
            currentPrice,
            suggestedPrice: newPrice,
            discountPercentage: suggestedDiscount,
            priority: 'high'
          });
        } else if (analysis.daysInStock > 60) {
          const suggestedDiscount = Math.min(8, maxAdjustment);
          const newPrice = Math.round(currentPrice * (1 - suggestedDiscount / 100));
          recommendations.push({
            vehicleId: args.vehicleId,
            type: 'price_reduction',
            reason: `Vehicle has been in stock for ${analysis.daysInStock} days`,
            currentPrice,
            suggestedPrice: newPrice,
            discountPercentage: suggestedDiscount,
            priority: 'medium'
          });
        }
        
        if (analysis.imageCount < 3) {
          recommendations.push({
            vehicleId: args.vehicleId,
            type: 'add_images',
            reason: `Only ${analysis.imageCount} images - add more for better performance`,
            priority: 'high'
          });
        }
        
      } else {
        // General recommendations
        const allVehiclesResponse = await vehicleAPI.listVehicles({ size: 100 });
        const vehicles = allVehiclesResponse.vehicles || [];
        
        const analyses = vehicles.map(v => analyzeVehiclePerformance(v));
        const underperforming = analyses
          .filter(a => a.needsAttention)
          .sort((a, b) => b.performanceScore - a.performanceScore)
          .slice(0, args.maxRecommendations || 10);
        
        underperforming.forEach(analysis => {
          if (analysis.daysInStock > 60) {
            const discountPercent = Math.min(
              Math.floor(analysis.daysInStock / 30) * 3,
              args.priceAdjustmentRange || 15
            );
            
            recommendations.push({
              vehicleId: analysis.vehicleId,
              make: analysis.make,
              model: analysis.model,
              type: 'price_reduction',
              reason: `${analysis.daysInStock} days in stock, performance score: ${analysis.performanceScore}`,
              currentPrice: analysis.price,
              suggestedPrice: Math.round(analysis.price * (1 - discountPercent / 100)),
              discountPercentage: discountPercent,
              priority: analysis.performanceCategory === 'poor' ? 'high' : 'medium'
            });
          }
          
          if (analysis.imageCount < 3) {
            recommendations.push({
              vehicleId: analysis.vehicleId,
              make: analysis.make,
              model: analysis.model,
              type: 'add_images',
              reason: `Only ${analysis.imageCount} images`,
              priority: 'medium'
            });
          }
        });
      }
      
      const result = {
        totalRecommendations: recommendations.length,
        generatedAt: new Date().toISOString(),
        recommendations: recommendations.slice(0, args.maxRecommendations || 10)
      };
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
      
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to get pricing recommendations: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },

  // Reference data tools
  get_available_makes: wrapHandler('get_available_makes', async (args) => {
    const result = await referenceAPI.getMakes(args.search);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }),

  get_available_models: wrapHandler('get_available_models', async (args) => {
    const { validateRequired } = require('./utils/errors');
    
    validateRequired(args.make, 'make');
    
    const result = await referenceAPI.getModels(args.make, args.search);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }),


  search_reference_data: wrapHandler('search_reference_data', async (args) => {
    const { validateRequired } = require('./utils/errors');
    
    validateRequired(args.query, 'query');
    
    const result = await referenceAPI.searchAll(
      args.query, 
      args.type || 'all', 
      args.limit || 20
    );
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }),

  compile_vehicle_by_trim: wrapHandler('compile_vehicle_by_trim', async (args) => {
    const { validateRequired } = require('./utils/errors');
    
    validateRequired(args.providerCode, 'providerCode');
    validateRequired(args.vehicleClass, 'vehicleClass');
    
    const companyId = args.companyId || process.env.STOCKSPARK_COMPANY_ID;
    if (!companyId) {
      throw new Error('companyId is required (either as parameter or STOCKSPARK_COMPANY_ID environment variable)');
    }
    
    const result = await referenceAPI.compileVehicleByTrim(
      companyId,
      args.providerCode,
      args.vehicleClass,
      args.provider
    );
    
    return {
      content: [
        {
          type: 'text',
          text: `✅ Vehicle template compiled from trim data\n\n${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  }),

  get_fuel_types: wrapHandler('get_fuel_types', async () => {
    const result = await referenceAPI.getFuelTypes();
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }),

  get_transmission_types: wrapHandler('get_transmission_types', async () => {
    const result = await referenceAPI.getTransmissionTypes();
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }),

  // Vehicle navigation functions
  get_vehicle_makes: wrapHandler('get_vehicle_makes', async (args) => {
    const country = args.country || process.env.STOCKSPARK_COUNTRY || 'it';
    const vehicleClass = args.vehicle_class || 'car';
    const result = await referenceAPI.getVehicleMakes(country, vehicleClass);
    
    if (result.count === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No vehicle makes found for country: ${country} (${vehicleClass})`,
          },
        ],
      };
    }
    
    const message = `Found ${result.count} vehicle makes for ${country.toUpperCase()} (${vehicleClass}):\n\n` +
      result.makes.map((make, idx) => `${idx + 1}. ${make.name} (ID: ${make.id})`).join('\n');
    
    return {
      content: [
        {
          type: 'text',
          text: message,
        },
      ],
    };
  }),

  get_vehicle_models: wrapHandler('get_vehicle_models', async (args) => {
    const { validateRequired } = require('./utils/errors');
    
    validateRequired(args.make, 'make');
    
    const country = args.country || process.env.STOCKSPARK_COUNTRY || 'it';
    const vehicleClass = args.vehicle_class || 'car';
    
    const result = await referenceAPI.getVehicleModels(country, vehicleClass, args.make);
    
    if (result.count === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No models found for make "${args.make}" in ${country.toUpperCase()} (${vehicleClass})`,
          },
        ],
      };
    }
    
    const message = `Found ${result.count} models for ${args.make} ${vehicleClass}s in ${country.toUpperCase()}:\n\n` +
      result.models.map((model, idx) => 
        `${idx + 1}. ${model.name} (ID: ${model.id})`
      ).join('\n');
    
    return {
      content: [
        {
          type: 'text',
          text: message,
        },
      ],
    };
  }),

  get_vehicle_trims: wrapHandler('get_vehicle_trims', async (args) => {
    const { validateRequired } = require('./utils/errors');
    
    validateRequired(args.model_id, 'model_id');
    
    const country = args.country || process.env.STOCKSPARK_COUNTRY || 'it';
    
    const result = await referenceAPI.getVehicleTrims(
      country, 
      args.model_id, 
      args.body_type, 
      args.fuel_type, 
      args.manufacture_date
    );
    
    if (result.count === 0) {
      let filterInfo = '';
      if (args.body_type || args.fuel_type || args.manufacture_date) {
        const filters = [];
        if (args.body_type) filters.push(`body: ${args.body_type}`);
        if (args.fuel_type) filters.push(`fuel: ${args.fuel_type}`);
        if (args.manufacture_date) filters.push(`year: ${args.manufacture_date}`);
        filterInfo = ` with filters (${filters.join(', ')})`;
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `No trims found for model ID "${args.model_id}"${filterInfo} in ${country.toUpperCase()}`,
          },
        ],
      };
    }
    
    const message = `Found ${result.count} trims for model ${args.model_id} in ${country.toUpperCase()}:\n\n` +
      result.trims.map((trim, idx) => 
        `${idx + 1}. ${trim.name}\n   ID: ${trim.id} | Source: ${trim.source}\n   Fuel: ${trim.fuelType} | Engine: ${trim.engineSize} | Power: ${trim.power}`
      ).join('\n\n');
    
    return {
      content: [
        {
          type: 'text',
          text: message,
        },
      ],
    };
  }),

  find_models_by_make: wrapHandler('find_models_by_make', async (args) => {
    const { validateRequired } = require('./utils/errors');
    
    validateRequired(args.make_name, 'make_name');
    
    const country = args.country || process.env.STOCKSPARK_COUNTRY || 'it';
    const vehicleClass = args.vehicle_class || 'car';
    
    const result = await referenceAPI.findModelsByMake(country, args.make_name, vehicleClass);
    
    if (result.count === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No models found for make "${args.make_name}" in ${country.toUpperCase()} (${vehicleClass}). Try checking spelling or use get_vehicle_makes to see available makes.`,
          },
        ],
      };
    }
    
    const message = `Found ${result.count} models for "${args.make_name}" ${vehicleClass}s in ${country.toUpperCase()}:\n\n` +
      result.models.map((model, idx) => 
        `${idx + 1}. ${model.name} (ID: ${model.id})\n   Body: ${model.bodyType} | Fuel: ${model.fuelType}`
      ).join('\n\n');
    
    return {
      content: [
        {
          type: 'text',
          text: message,
        },
      ],
    };
  }),

  get_vehicle_bodies: wrapHandler('get_vehicle_bodies', async (args) => {
    const country = args.country || process.env.STOCKSPARK_COUNTRY || 'it';
    const vehicleClass = args.vehicle_class || 'car';
    
    const result = await referenceAPI.getVehicleBodies(country, vehicleClass);
    
    const message = `Found ${result.count} body types for ${country.toUpperCase()} (${vehicleClass}):\n\n` +
      result.bodies.map((body, idx) => `${idx + 1}. ${body.name} (Key: ${body.key})`).join('\n');
    
    return {
      content: [
        {
          type: 'text',
          text: message,
        },
      ],
    };
  }),

  get_vehicle_fuels: wrapHandler('get_vehicle_fuels', async (args) => {
    const country = args.country || process.env.STOCKSPARK_COUNTRY || 'it';
    const vehicleClass = args.vehicle_class || 'car';
    
    const result = await referenceAPI.getVehicleFuels(country, vehicleClass);
    
    const message = `Found ${result.count} fuel types for ${country.toUpperCase()} (${vehicleClass}):\n\n` +
      result.fuels.map((fuel, idx) => `${idx + 1}. ${fuel.name} (Key: ${fuel.key})`).join('\n');
    
    return {
      content: [
        {
          type: 'text',
          text: message,
        },
      ],
    };
  }),

  start_vehicle_creation: wrapHandler('start_vehicle_creation', async (args) => {
    const { validateRequired } = require('./utils/errors');
    
    validateRequired(args.make_name, 'make_name');
    
    const country = args.country || process.env.STOCKSPARK_COUNTRY || 'it';
    const vehicleClass = args.vehicle_class || 'car';
    
    // Step 1: Find models for the make
    const modelsResult = await referenceAPI.findModelsByMake(country, args.make_name, vehicleClass);
    
    if (modelsResult.count === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ No models found for make "${args.make_name}" in ${country.toUpperCase()}.\n\nTry:\n• Checking the spelling\n• Using get_vehicle_makes to see available makes\n• Using a different country code`,
          },
        ],
      };
    }
    
    // Step 2: If model_name provided, find specific model and show trims
    if (args.model_name) {
      const targetModel = modelsResult.models.find(model => 
        model.name.toLowerCase().includes(args.model_name.toLowerCase())
      );
      
      if (!targetModel) {
        const availableModels = modelsResult.models.slice(0, 10).map(m => m.name).join(', ');
        return {
          content: [
            {
              type: 'text',
              text: `❌ No "${args.model_name}" model found for ${args.make_name}.\n\nAvailable models: ${availableModels}\n\nUse start_vehicle_creation with just the make_name to see all models, or try a different model name.`,
            },
          ],
        };
      }
      
      // Get trims for the specific model with optional filters
      // Convert year to manufacture_date format if provided
      const manufactureDate = args.year ? `01-${args.year}` : args.manufacture_date;
      
      const trimsResult = await referenceAPI.getVehicleTrims(
        country, 
        targetModel.id, 
        args.body_type, 
        args.fuel_type, 
        manufactureDate
      );
      
      if (trimsResult.count === 0) {
        let filterInfo = '';
        if (args.body_type || args.fuel_type || args.manufacture_date || args.year) {
          const filters = [];
          if (args.body_type) filters.push(`body: ${args.body_type}`);
          if (args.fuel_type) filters.push(`fuel: ${args.fuel_type}`);
          if (args.year) filters.push(`year: ${args.year}`);
          else if (args.manufacture_date) filters.push(`date: ${args.manufacture_date}`);
          filterInfo = ` with filters (${filters.join(', ')})`;
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `❌ No trims found for ${args.make_name} ${targetModel.name}${filterInfo}.\n\nTry:\n• Removing some filters\n• Using get_vehicle_bodies or get_vehicle_fuels to see available options\n• Using a different manufacture date (MM-YYYY format)`,
            },
          ],
        };
      }
      
      // Show filter information and suggest narrowing down if too many results
      let message = '';
      
      if (trimsResult.count > 20) {
        message += `⚠️  Found ${trimsResult.count} trims for ${args.make_name} ${targetModel.name} - this is quite a lot!\n\n`;
        if (!args.manufacture_date && !args.year) {
          message += `🔍 **Consider adding a year filter to narrow down results:**\n`;
          message += `• Specify year parameter (e.g., year: 2021)\n`;
          message += `• This will show only trims available for that model year\n\n`;
          message += `📋 **Use start_vehicle_creation again with year parameter.**\n\n`;
        } else {
          message += `📋 **Showing filtered results below. Choose a specific trim to proceed.**\n\n`;
        }
      }
      
      message += `🚗 Available trims for ${args.make_name} ${targetModel.name}`;
      
      if (args.body_type || args.fuel_type || args.manufacture_date || args.year) {
        const filters = [];
        if (args.body_type) filters.push(`Body: ${args.body_type}`);
        if (args.fuel_type) filters.push(`Fuel: ${args.fuel_type}`);
        if (args.year) filters.push(`Year: ${args.year}`);
        else if (args.manufacture_date) filters.push(`Date: ${args.manufacture_date}`);
        message += ` (${filters.join(', ')})`;
      }
      
      message += `:\n\n`;
      
      trimsResult.trims.slice(0, 15).forEach((trim, idx) => {
        message += `${idx + 1}. **${trim.name}**\n`;
        message += `   • ID: ${trim.id}\n`;
        message += `   • Engine: ${trim.engineSize}cc, ${trim.powerKw}kW (${trim.powerHp}hp)\n`;
        message += `   • Fuel: ${trim.fuelType?.name || 'N/A'}\n`;
        message += `   • Transmission: ${trim.transmission?.name || 'N/A'}\n`;
        message += `   • Price: €${trim.listPrice || 'N/A'}\n\n`;
      });
      
      if (trimsResult.count > 15) {
        message += `... and ${trimsResult.count - 15} more trims.\n\n`;
      }
      
      // Check if there are multiple similar variants (same base model name)
      const baseModelName = args.model_name;
      const similarTrims = baseModelName ? trimsResult.trims.filter(trim => 
        trim.name.toLowerCase().includes(baseModelName.toLowerCase())
      ) : [];
      
      message += `📋 **Next Steps - RECOMMENDED WORKFLOW:**\n`;
      
      if (similarTrims.length > 3) {
        message += `🔍 **Multiple ${baseModelName} variants found!** For easier selection, use:\n`;
        message += `**compare_trim_variants** with:\n`;
        message += `   • model_id: "${targetModel.id}"\n`;
        message += `   • base_model_name: "${baseModelName}"\n`;
        if (args.year) {
          message += `   • year: ${args.year}\n`;
        }
        message += `\nThis will show variants side-by-side for easy comparison.\n\n`;
        message += `**Alternative:** Choose directly from the list above, then:\n`;
      } else {
        message += `1. Choose a trim from the list above\n`;
      }
      
      message += `2. **Use create_vehicle_from_trim** (creates vehicle with complete specifications):\n`;
      message += `   • providerCode: [trim ID from above]\n`;
      message += `   • provider: "datak"\n`;
      message += `   • vehicleClass: "car"\n`;
      message += `   • price: [your selling price]\n`;
      message += `   • condition: "NEW" or "USED"\n`;
      message += `   • year: [optional - override construction year from trim]\n`;
      message += `   • mileage: [required for USED vehicles]\n`;
      message += `\n💡 **This is better than add_vehicle because it includes complete equipment lists and accurate specifications!**\n`;
      
      return {
        content: [
          {
            type: 'text',
            text: message,
          },
        ],
      };
    }
    
    // Step 3: If no model_name, show available models
    let message = `🚗 Found ${modelsResult.count} models for ${args.make_name}:\n\n`;
    
    modelsResult.models.slice(0, 20).forEach((model, idx) => {
      message += `${idx + 1}. **${model.name}** (ID: ${model.id})\n`;
      if (model.bodyType) message += `   • Body: ${model.bodyType}\n`;
      if (model.fuelType) message += `   • Fuel: ${model.fuelType}\n`;
      message += `\n`;
    });
    
    if (modelsResult.count > 20) {
      message += `... and ${modelsResult.count - 20} more models.\n\n`;
    }
    
    message += `📋 **Next Steps:**\n`;
    message += `• Use start_vehicle_creation again with both make_name and model_name to see available trims\n`;
    message += `• Example: start_vehicle_creation with make_name="${args.make_name}" and model_name="[choose from above]"\n`;
    
    return {
      content: [
        {
          type: 'text',
          text: message,
        },
      ],
    };
  }),

  create_vehicle_from_trim: wrapHandler('create_vehicle_from_trim', async (args) => {
    const { validateRequired, validatePrice } = require('./utils/errors');
    
    validateRequired(args.providerCode, 'providerCode');
    validateRequired(args.provider, 'provider');
    validateRequired(args.vehicleClass, 'vehicleClass');
    validateRequired(args.price, 'price');
    validateRequired(args.condition, 'condition');
    validatePrice(args.price);
    
    // Get current organization context
    const context = organizationAPI.getCurrentContext();
    const companyId = args.companyId || context.companyId || process.env.STOCKSPARK_COMPANY_ID;
    const dealerId = context.dealerId || process.env.STOCKSPARK_DEALER_ID;
    
    if (!companyId) {
      throw new Error('No company selected. Use get_user_context to check, then select_company as needed.');
    }
    if (!dealerId) {
      throw new Error('No dealer selected. Use list_company_dealers and select_dealer as needed.');
    }
    
    // Step 1: Compile vehicle template from trim
    const compiledVehicle = await referenceAPI.compileVehicleByTrim(
      companyId,
      args.providerCode,
      args.vehicleClass,
      args.provider
    );
    
    // Create a minimal vehicle data object with only essential fields - REMOVE DESCRIPTIONS AND FIX NULL BODY
    const vehicleData = {
      companyId: compiledVehicle.companyId,
      dealerId: dealerId ? parseInt(dealerId) : null,
      // Clean vehicleClass - remove description field
      vehicleClass: { name: "car" },
      status: { name: 'FREE' }, // Required field
      wheelFormula: { name: 'FRONT' }, // Required field
      vatRate: 0, // Required field
      // Clean make/model/version - remove id/code fields
      make: { name: compiledVehicle.make.name },
      model: { name: compiledVehicle.model.name },
      version: { name: compiledVehicle.version.name },
      constructionYear: (args.year || compiledVehicle.constructionYear).toString(), // Use user's year if provided
      constructionDate: `${args.year || compiledVehicle.constructionYear}-01-01T00:00:00.000Z`, // Required field
      firstRegistration: `${args.year || compiledVehicle.constructionYear}01`, // CRITICAL: Required field!
      // Clean fuel/gearbox - remove description fields
      fuel: { name: compiledVehicle.fuel.name },
      gearbox: { name: compiledVehicle.gearbox.name },
      // FIX NULL BODY - provide a default body type
      body: compiledVehicle.body && compiledVehicle.body.name ? { name: compiledVehicle.body.name } : { name: "SEDAN" },
      doors: compiledVehicle.doors,
      power: compiledVehicle.power,
      powerHp: compiledVehicle.powerHp,
      cubicCapacity: compiledVehicle.cubicCapacity,
      cylinders: compiledVehicle.cylinders,
      seat: compiledVehicle.seat,
      // Simplified price objects - keep only consumerPrice
      priceGross: {
        consumerPrice: args.price
      },
      priceNet: {
        consumerPrice: args.price
      },
      condition: { name: args.condition },
      // Required boolean fields
      accidentDamaged: false,
      billable: true,
      comingSoon: false,
      corporate: false,
      deductible: false,
      demo: false,
      lastMinuteOffer: false,
      luxury: false,
      negotiable: true,
      noviceDrivable: true,
      onSale: true,
      promptDelivery: false,
      reservedNegotiation: false,
      servicingDoc: false,
      visibility: true,
      warranty: false
    };
    
    // Add optional fields
    if (args.mileage !== undefined) {
      vehicleData.mileage = args.mileage;
    }
    
    if (args.plate) {
      vehicleData.numberPlate = args.plate;
    }
    
    // SKIP COLOR for now (causes validation errors)
    // if (args.color) {
    //   vehicleData.color = { name: args.color };
    // }
    
    if (args.doors !== undefined) {
      vehicleData.doors = args.doors;
    }
    
    // Step 3: Create the vehicle
    const result = await vehicleAPI.addVehicle(vehicleData);
    
    return {
      content: [
        {
          type: 'text',
          text: `✅ Vehicle created successfully using ideal API flow!\n🚗 View vehicle: https://carspark.dealerk.it/vehicle/show/${result.vehicleId}\n📋 Compiled from trim ID: ${args.providerCode}\n🏭 Provider: ${args.provider}\n💰 Price: €${args.price}\n🔧 Condition: ${args.condition}\n📅 Year: ${args.year || compiledVehicle.constructionYear}${args.year && args.year !== compiledVehicle.constructionYear ? ` (overridden from trim's ${compiledVehicle.constructionYear})` : ''}`,
        },
      ],
    };
  }),

  compare_trim_variants: wrapHandler('compare_trim_variants', async (args) => {
    const { validateRequired } = require('./utils/errors');
    
    validateRequired(args.model_id, 'model_id');
    validateRequired(args.base_model_name, 'base_model_name');
    
    const country = args.country || process.env.STOCKSPARK_COUNTRY || 'it';
    const manufactureDate = args.year ? `01-${args.year}` : null;
    
    // Get all trims for the model
    const trimsResult = await referenceAPI.getVehicleTrims(
      country, 
      args.model_id, 
      null, // no body filter
      null, // no fuel filter
      manufactureDate
    );
    
    if (trimsResult.count === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ No trims found for model ID ${args.model_id}${args.year ? ` from ${args.year}` : ''}`,
          },
        ],
      };
    }
    
    // Filter trims that match the base model name
    const baseModelLower = args.base_model_name.toLowerCase();
    const matchingTrims = trimsResult.trims.filter(trim => 
      trim.name.toLowerCase().includes(baseModelLower)
    );
    
    if (matchingTrims.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ No trims found matching "${args.base_model_name}" for model ID ${args.model_id}${args.year ? ` from ${args.year}` : ''}`,
          },
        ],
      };
    }
    
    // Limit to max_variants
    const maxVariants = args.max_variants || 10;
    const variantsToShow = matchingTrims.slice(0, maxVariants);
    
    // Group variants by key characteristics
    const variants = variantsToShow.map((trim, idx) => {
      // Extract variant info from trim name
      const name = trim.name;
      const isLong = name.toLowerCase().includes('lungo') || name.toLowerCase().includes('p.lungo');
      const trimLevel = name.includes('Business') ? 'Business' : 
                      name.includes('Premium Plus') ? 'Premium Plus' :
                      name.includes('Premium') ? 'Premium' : 'Standard';
      
      return {
        index: idx + 1,
        id: trim.id,
        name: name,
        trimLevel,
        wheelbase: isLong ? 'Long' : 'Standard',
        engine: `${trim.engineSize}cc`,
        power: `${trim.powerKw}kW (${trim.powerHp}hp)`,
        fuel: trim.fuelType?.name || 'N/A',
        transmission: trim.transmission?.name || 'N/A',
        listPrice: trim.listPrice ? `€${trim.listPrice.toLocaleString()}` : 'N/A'
      };
    });
    
    // Create comparison message
    let message = `🚗 Found ${matchingTrims.length} "${args.base_model_name}" variants${args.year ? ` from ${args.year}` : ''}`;
    if (matchingTrims.length > maxVariants) {
      message += ` (showing top ${maxVariants})`;
    }
    message += `:\n\n`;
    
    // Show variants in a clear format
    variants.forEach(variant => {
      message += `**${variant.index}. ${variant.name}**\n`;
      message += `   • ID: ${variant.id}\n`;
      message += `   • Trim Level: ${variant.trimLevel}\n`;
      message += `   • Wheelbase: ${variant.wheelbase}\n`;
      message += `   • Engine: ${variant.engine}, ${variant.power}\n`;
      message += `   • Fuel: ${variant.fuel} | Transmission: ${variant.transmission}\n`;
      message += `   • Original Price: ${variant.listPrice}\n\n`;
    });
    
    // Provide selection guidance
    message += `🤔 **Please choose which variant you prefer:**\n\n`;
    message += `**Trim Levels:**\n`;
    message += `• **Business** = Base trim with essential features\n`;
    message += `• **Premium** = Mid-level with comfort features\n`;
    message += `• **Premium Plus** = Top trim with luxury features\n\n`;
    message += `**Wheelbase:**\n`;
    message += `• **Standard** = Regular length (easier parking)\n`;
    message += `• **Long** = Extended rear passenger space\n\n`;
    message += `📋 **Next Step:** Use **create_vehicle_from_trim** with:\n`;
    message += `• **providerCode**: [ID from your chosen variant above]\n`;
    message += `• **provider**: "datak"\n`;
    message += `• **vehicleClass**: "car"\n`;
    message += `• **price**: [your selling price]\n`;
    message += `• **condition**: "USED" or "NEW"\n`;
    if (args.year) {
      message += `• **year**: ${args.year} (to ensure correct construction year)\n`;
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

  // Leads tools
  get_vehicle_leads: wrapHandler('get_vehicle_leads', leadsTools[0].handler),
  analyze_lead_trends: wrapHandler('analyze_lead_trends', leadsTools[1].handler),
};

// Register tools with priority ordering
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'test_connection',
        description: 'Test connection to StockSpark API',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // 📊 PERFORMANCE MONITORING
      ...performanceTools,
      
      // 📸 IMAGE TOOLS:
      // upload_vehicle_images (UNIFIED - supports files, URLs, and Claude UI pasted images)
      ...imageTools,
      
      // 🏢 ORGANIZATION TOOLS
      ...organizationTools,
      
      // 🚗 VEHICLE TOOLS
      ...vehicleTools,
      
      // 🌐 PUBLISHING TOOLS
      ...publishTools,
      
      // 📊 ANALYTICS TOOLS
      ...analyticsTools,
      
      // 🔗 LEADS TOOLS
      ...leadsTools,
      
      // 🔍 REFERENCE TOOLS
      ...referenceTools,
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (!toolHandlers[name]) {
    throw new Error(`Unknown tool: ${name}`);
  }
  
  try {
    const result = await toolHandlers[name](args);
    return result;
  } catch (error) {
    console.error(`Tool ${name} error:`, error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Main function
async function main() {
  try {
    // Initialize services
    authManager = new AuthManager();
    apiClient = new StockSparkClient(authManager);
    vehicleAPI = new VehicleAPI(apiClient);
    imageAPI = new ImageAPI(apiClient);
    publicationAPI = new PublicationAPI(apiClient);
    referenceAPI = new ReferenceAPI(apiClient);
    organizationAPI = new OrganizationAPI(apiClient);
    
    // Test authentication on startup
    logger.info('Initializing StockSpark MCP server...');
    await authManager.getToken();
    logger.info('Authentication successful');
    
    // Initialize organization context
    logger.info('Discovering user organization context...');
    const context = await organizationAPI.initializeContext();
    logger.info('Organization context initialized', {
      companies: context.companies.length,
      selectedCompany: context.selectedCompany?.name,
      selectedDealer: context.selectedDealer?.name,
      requiresSelection: context.requiresCompanySelection || context.requiresDealerSelection
    });
    
    // Start the server
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.info('StockSpark MCP server running');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Run the server
main();
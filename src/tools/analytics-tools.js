const { VehicleAPI } = require('../api/vehicles');
const { PublicationAPI } = require('../api/publications');
const { analyzeVehiclePerformance, formatInventoryHealthReport } = require('../utils/mappers');
const { logger } = require('../utils/logger');

const analyticsTools = [
  {
    name: "get_underperforming_vehicles",
    description: `Identify underperforming vehicles needing attention

When to use: Regular inventory health checks, discount campaigns
Analysis factors: Days in stock, image count, price point, number of leads
Returns: Scored list with actionable recommendations
Default thresholds: 30+ days, <5 images

Sort options: performance_score (default), days_in_stock, price
Pro tip: Run weekly to prevent stale inventory buildup
Next steps: apply_bulk_discount or upload_vehicle_images`,
    inputSchema: {
      type: "object",
      properties: {
        minDaysInStock: {
          type: "number",
          default: 30,
          description: "Minimum days in stock to consider a vehicle underperforming"
        },
        maxImageCount: {
          type: "number", 
          default: 5,
          description: "Maximum number of images - vehicles with fewer images score lower"
        },
        priceThreshold: {
          type: "number",
          description: "Optional price threshold - vehicles above this price get higher priority for discounts"
        },
        limit: {
          type: "number",
          default: 20,
          description: "Maximum number of vehicles to return"
        },
        sortBy: {
          type: "string",
          enum: ["performance_score", "days_in_stock", "price"],
          default: "performance_score",
          description: "How to sort the results"
        }
      }
    },
    handler: async (args, { vehicleAPI }) => {
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
            
            const { getLeads } = require('../api/leads');
            
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
    }
  },

  {
    name: "apply_bulk_discount",
    description: `Apply percentage discounts to multiple vehicles at once

When to use: Clear slow-moving inventory, seasonal promotions
Prerequisites: Vehicle IDs from get_underperforming_vehicles
Batch limit: 1-50 vehicles per operation
Discount range: 1-50% off current price

Options: Auto-republish to update all active listings
Effect: Updates prices and optionally refreshes listings
Warning: Price changes are immediate across all channels`,
    inputSchema: {
      type: "object",
      properties: {
        vehicleIds: {
          type: "array",
          items: { type: "number" },
          description: "Array of vehicle IDs to apply discount to",
          minItems: 1,
          maxItems: 50
        },
        discountPercentage: {
          type: "number",
          minimum: 1,
          maximum: 50,
          description: "Discount percentage to apply (1-50%)"
        },
        republishToPortals: {
          type: "boolean",
          default: false,
          description: "Whether to republish vehicles to their active portals after price update"
        },
        reason: {
          type: "string",
          default: "Bulk discount applied",
          description: "Reason for the price change"
        }
      },
      required: ["vehicleIds", "discountPercentage"]
    },
    handler: async (args, { vehicleAPI, publicationAPI }) => {
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
    }
  },

  {
    name: "analyze_inventory_health",
    description: `Get comprehensive inventory health dashboard

When to use: Daily/weekly management reports, performance tracking
Metrics included: Average days in stock, image coverage %, price distribution
Optional: Detailed breakdown by brand, model, price range

Insights: Identifies bottlenecks, opportunities, trends
Use for: Strategic decisions, inventory optimization
Pro tip: Set includeDetails=true for actionable insights`,
    inputSchema: {
      type: "object",
      properties: {
        includeDetails: {
          type: "boolean",
          default: false,
          description: "Include detailed breakdown by brand, price range, etc."
        }
      }
    },
    handler: async (args, { vehicleAPI }) => {
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
    }
  },

  {
    name: "get_pricing_recommendations",
    description: `Get smart pricing recommendations based on performance

When to use: Optimize individual vehicle pricing, market alignment
Analysis: Days in stock, market trends, competition
Returns: Specific price suggestions with reasoning

Options: Analyze single vehicle or get bulk recommendations
Adjustment range: Default ±15%, customizable
Next steps: update_vehicle_price or apply_bulk_discount`,
    inputSchema: {
      type: "object",
      properties: {
        vehicleId: {
          type: "number",
          description: "Specific vehicle ID to analyze, or omit for general recommendations"
        },
        maxRecommendations: {
          type: "number",
          default: 10,
          description: "Maximum number of recommendations to return"
        },
        priceAdjustmentRange: {
          type: "number",
          default: 15,
          description: "Maximum percentage price adjustment to recommend"
        }
      }
    },
    handler: async (args, { vehicleAPI }) => {
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
    }
  }
];

// Create analytics handlers object for dependency injection
const analyticsHandlers = {};
analyticsTools.forEach(tool => {
  if (tool.handler) {
    analyticsHandlers[tool.name] = tool.handler;
  }
});

module.exports = { analyticsTools, analyticsHandlers };
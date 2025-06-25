const vehicleTools = [
  {
    name: "add_vehicle",
    description: `Create vehicle with template or basic data.

PREFERRED: Use with template from get_vehicle_template for complete specifications
FALLBACK: Use with basic data when no template available

Template mode includes: Complete technical specs, emissions, equipment
Basic mode: Manual entry when no reference data exists`,
    inputSchema: {
      type: "object",
      oneOf: [
        {
          properties: {
            template: {
              type: "object",
              description: "Vehicle template from get_vehicle_template"
            },
            userOverrides: {
              type: "object",
              properties: {
                price: {
                  type: "number",
                  description: "Sale price in EUR (required)"
                },
                condition: {
                  type: "string",
                  enum: ["NEW", "USED", "KM0"],
                  description: "Vehicle condition (required)"
                },
                mileage: {
                  type: "number",
                  description: "Current mileage in kilometers (required for USED)"
                },
                plate: {
                  type: "string",
                  description: "License plate number (optional)"
                },
                color: {
                  type: "string",
                  description: "External color (optional)"
                }
              },
              required: ["price", "condition"]
            }
          },
          required: ["template", "userOverrides"]
        },
        {
          properties: {
            basicData: {
              type: "object",
              properties: {
                make: {
                  type: "string",
                  description: "Vehicle manufacturer (e.g., 'Alfa Romeo', 'Fiat', 'BMW')"
                },
                model: {
                  type: "string",
                  description: "Vehicle model (e.g., 'MiTo', '500', 'Serie 3')"
                },
                version: {
                  type: "string",
                  description: "Trim level/version (optional)"
                },
                year: {
                  type: "number",
                  description: "Construction year (e.g., 2018)"
                },
                price: {
                  type: "number",
                  description: "Sale price in EUR (consumer price)"
                },
                fuel: {
                  type: "string",
                  enum: ["PETROL", "DIESEL", "ELECTRIC", "HYBRID", "LPG", "METHANE"],
                  description: "Fuel type"
                },
                transmission: {
                  type: "string",
                  enum: ["MANUAL", "AUTOMATIC"],
                  description: "Transmission type"
                },
                condition: {
                  type: "string",
                  enum: ["NEW", "USED", "KM0"],
                  description: "Vehicle condition"
                },
                mileage: {
                  type: "number",
                  description: "Current mileage in kilometers (required for used vehicles)"
                },
                plate: {
                  type: "string",
                  description: "License plate number (optional)"
                },
                color: {
                  type: "string",
                  description: "External color (optional)"
                },
                doors: {
                  type: "number",
                  enum: [2, 3, 4, 5],
                  description: "Number of doors (optional)"
                }
              },
              required: ["make", "model", "year", "price", "fuel", "transmission", "condition"]
            }
          },
          required: ["basicData"]
        }
      ]
    }
  },
  
  {
    name: "get_vehicle",
    description: `Get complete details for a specific vehicle

When to use: Verify vehicle data before updates or publishing
Prerequisites: Valid vehicle ID from list_vehicles or after creation
Returns: Full vehicle data including specs, images, and status
Use for: Checking before price updates, image uploads, or publishing`,
    inputSchema: {
      type: "object",
      properties: {
        vehicleId: { 
          type: "number", 
          description: "Vehicle ID in the system" 
        }
      },
      required: ["vehicleId"]
    }
  },
  
  {
    name: "list_vehicles",
    description: `List vehicles in stock with filtering and sorting

When to use: Browse inventory, find vehicles needing updates
Pagination: Default 10 per page, max 50
Filters: make, model, numberPlate, price/mileage range, condition, image status
Sorting: Use format 'field:direction' (e.g., 'creationDate:desc', 'price:asc')
Returns: Vehicle summaries with IDs for other operations
Pro tip: Use hasImages=false to find vehicles needing photos`,
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "number", default: 0 },
        size: { type: "number", default: 10, maximum: 50 },
        make: { type: "string", description: "Filter by make" },
        model: { type: "string", description: "Filter by model" },
        modelName: { type: "string", description: "Filter by model name (specific variant)" },
        numberPlate: { type: "string", description: "Filter by license plate" },
        vehicleType: { 
          type: "string", 
          enum: ["USED", "NEW", "KM0"],
          description: "Filter by vehicle condition" 
        },
        hasImages: { type: "boolean", description: "Only vehicles with/without images" },
        minPrice: { type: "number", description: "Minimum price filter" },
        maxPrice: { type: "number", description: "Maximum price filter" },
        kmMin: { type: "number", description: "Minimum mileage filter" },
        kmMax: { type: "number", description: "Maximum mileage filter" },
        sort: { 
          type: "string", 
          description: "Sort format: 'field:direction'. Fields: creationDate, price, mileage. Directions: asc, desc",
          pattern: "^(creationDate|price|mileage):(asc|desc)$"
        }
      }
    }
  },
  
  {
    name: "update_vehicle_price",
    description: `Update vehicle sale price (consumer facing)

When to use: Price adjustments, promotions, or corrections
Prerequisites: Vehicle ID from list_vehicles or get_vehicle
Effect: Updates price across all active publications
Note: Price is in EUR, includes taxes (consumer price)`,
    inputSchema: {
      type: "object",
      properties: {
        vehicleId: { type: "number" },
        newPrice: { type: "number", description: "New consumer price in EUR" }
      },
      required: ["vehicleId", "newPrice"]
    }
  },
  
  {
    name: "update_vehicle",
    description: `Update multiple vehicle attributes (POC - no validation)

When to use: Update any vehicle field beyond just price
Prerequisites: Vehicle ID from list_vehicles or get_vehicle
Note: This is a POC implementation without field validation
Available fields: mileage, numberPlate, description, color, any vehicle attribute

💡 For color updates: Use get_vehicle_colors first to see available options, then use the exact color name.`,
    inputSchema: {
      type: "object",
      properties: {
        vehicleId: { type: "number", description: "Vehicle ID to update" },
        updates: { 
          type: "object",
          description: "Object with fields to update (e.g., {mileage: 50000, numberPlate: 'AB123CD'})",
          additionalProperties: true
        }
      },
      required: ["vehicleId", "updates"]
    }
  },

  {
    name: "delete_vehicle",
    description: `Delete a vehicle from the stock permanently

⚠️  **WARNING**: This action is irreversible! The vehicle will be permanently removed from the stock.

When to use: Remove vehicles that are sold, no longer available, or added by mistake
Prerequisites: Vehicle ID from list_vehicles or get_vehicle
Security: Vehicle info is fetched first for confirmation before deletion`,
    inputSchema: {
      type: "object",
      properties: {
        vehicleId: { 
          type: "number", 
          description: "Vehicle ID to delete permanently" 
        },
        confirm: {
          type: "boolean",
          description: "Confirmation that you want to permanently delete this vehicle",
          default: false
        }
      },
      required: ["vehicleId", "confirm"]
    }
  }
];

const vehicleHandlers = {
  add_vehicle: async (args, { vehicleAPI, organizationAPI, mapInputToVehicle }) => {
    const { validateRequired } = require('../utils/errors');
    
    // Get current organization context
    const context = organizationAPI.getCurrentContext();
    if (!context.companyId || !context.dealerId) {
      throw new Error('No company or dealer selected. Use get_user_context to check, then select_company and select_dealer as needed.');
    }
    
    let vehicleData;
    let vehicleInfo;
    
    // Parse JSON strings if needed (MCP client sometimes sends strings instead of objects)
    let template = args.template;
    let userOverrides = args.userOverrides;
    let basicData = args.basicData;
    
    if (typeof template === 'string') {
      try {
        template = JSON.parse(template);
      } catch (e) {
        throw new Error('Invalid template JSON format');
      }
    }
    
    if (typeof userOverrides === 'string') {
      try {
        userOverrides = JSON.parse(userOverrides);
      } catch (e) {
        throw new Error('Invalid userOverrides JSON format');
      }
    }
    
    if (typeof basicData === 'string') {
      try {
        basicData = JSON.parse(basicData);
      } catch (e) {
        throw new Error('Invalid basicData JSON format');
      }
    }
    
    // Template mode - preferred for complete specs
    if (template && userOverrides) {
      validateRequired(userOverrides.price, 'userOverrides.price');
      validateRequired(userOverrides.condition, 'userOverrides.condition');
      
      // Create vehicle data from template + user overrides
      vehicleData = {
        companyId: context.companyId,
        dealerId: parseInt(context.dealerId),
        vehicleClass: { name: "car" },
        status: { name: 'FREE' },
        wheelFormula: { name: 'FRONT' },
        vatRate: 0,
        // Template data
        make: { name: template.make },
        model: { name: template.model },
        version: { name: template.version },
        constructionYear: template.year.toString(),
        constructionDate: `${template.year}-01-01T00:00:00.000Z`,
        firstRegistration: `${template.year}01`,
        fuel: { name: template.fuel },
        gearbox: { name: template.transmission },
        body: { name: template.body || "SEDAN" },
        doors: template.doors,
        power: template.engine?.power,
        powerHp: template.engine?.powerHp,
        cubicCapacity: template.engine?.size,
        seat: template.seats,
        // User overrides
        priceGross: { consumerPrice: userOverrides.price },
        priceNet: { consumerPrice: userOverrides.price },
        condition: { name: userOverrides.condition },
        // Optional fields
        mileage: userOverrides.mileage,
        numberPlate: userOverrides.plate,
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
      
      vehicleInfo = `${template.make} ${template.model} ${template.version}`;
    }
    // Basic mode - fallback for manual entry
    else if (basicData) {
      validateRequired(basicData.make, 'basicData.make');
      validateRequired(basicData.model, 'basicData.model');
      validateRequired(basicData.price, 'basicData.price');
      validateRequired(basicData.condition, 'basicData.condition');
      
      vehicleData = mapInputToVehicle(basicData, context);
      vehicleInfo = `${basicData.make} ${basicData.model}`;
    }
    else {
      throw new Error('Either template+userOverrides or basicData must be provided');
    }
    
    const result = await vehicleAPI.addVehicle(vehicleData);
    
    const mode = template ? 'template' : 'basic';
    const price = template ? userOverrides.price : basicData.price;
    
    return {
      content: [
        {
          type: 'text',
          text: `✅ Vehicle added successfully (${mode} mode)!\n\n🆔 **Vehicle ID:** ${result.vehicleId}\n🚗 **View Vehicle:** https://carspark.dealerk.it/vehicle/show/${result.vehicleId}\n📋 **Details:** ${vehicleInfo} - €${price}\n\n💡 **Next Steps:** You can now add images, update details, or publish this vehicle.`,
        },
      ],
    };
  },

  get_vehicle: async (args, { vehicleAPI, formatVehicleResponse }) => {
    const { validateVehicleId } = require('../utils/errors');
    
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
  },

  list_vehicles: async (args, { vehicleAPI, referenceAPI, formatVehicleListResponse }) => {
    const result = await vehicleAPI.listVehicles(args, referenceAPI);
    const formatted = formatVehicleListResponse(result);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(formatted, null, 2),
        },
      ],
    };
  },

  update_vehicle_price: async (args, { vehicleAPI }) => {
    const { validateVehicleId, validatePrice } = require('../utils/errors');
    
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
  },

  update_vehicle: async (args, { vehicleAPI }) => {
    const { validateVehicleId } = require('../utils/errors');
    
    validateVehicleId(args.vehicleId);
    
    if (!args.updates || typeof args.updates !== 'object' || Object.keys(args.updates).length === 0) {
      throw new Error('Updates object must contain at least one field to update');
    }
    
    // Create a copy of updates to modify
    const processedUpdates = { ...args.updates };
    
    try {
      await vehicleAPI.updateVehicle(args.vehicleId, processedUpdates);
      
      const updatedFields = Object.keys(args.updates).join(', ');
      let message = `✅ Vehicle ${args.vehicleId} updated successfully!\n📝 Updated fields: ${updatedFields}`;
      
      // Add helpful note for color updates
      if (args.updates.color) {
        message += `\n\n💡 Color updated to: ${args.updates.color}`;
        message += `\nNote: Both color and colorBase fields were updated for consistency.`;
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
      // Provide helpful error message for color updates
      if (args.updates.color && error.message.includes('color')) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Color update failed: ${error.message}\n\n💡 **Tip:** Use get_vehicle_colors to see all available color options, then use the exact color name.`,
            },
          ],
          isError: true,
        };
      }
      throw error;
    }
  },

  delete_vehicle: async (args, { vehicleAPI }) => {
    const { validateVehicleId } = require('../utils/errors');
    
    validateVehicleId(args.vehicleId);
    
    // Safety check: require explicit confirmation
    if (!args.confirm) {
      return {
        content: [
          {
            type: 'text',
            text: `⚠️ **DELETION BLOCKED**: Confirmation required.\n\n` +
                  `To delete vehicle ${args.vehicleId}, you must explicitly confirm:\n` +
                  `\`delete_vehicle({vehicleId: ${args.vehicleId}, confirm: true})\`\n\n` +
                  `⚠️ **WARNING**: This action is irreversible! The vehicle will be permanently removed.`,
          },
        ],
        isError: true,
      };
    }

    try {
      const result = await vehicleAPI.deleteVehicle(args.vehicleId);
      
      return {
        content: [
          {
            type: 'text',
            text: `🗑️ **VEHICLE DELETED**\n\n✅ ${result.message}\n\n` +
                  `⚠️ This action cannot be undone. The vehicle has been permanently removed from the stock.`,
          },
        ],
      };
    } catch (error) {
      // Handle specific errors
      if (error.message.includes('404') || error.message.includes('not found')) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Vehicle ${args.vehicleId} not found. It may have already been deleted or never existed.`,
            },
          ],
          isError: true,
        };
      }
      
      if (error.message.includes('published') || error.message.includes('active')) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Cannot delete vehicle ${args.vehicleId}: Vehicle may be published or have active reservations.\n\n💡 **Tip**: Unpublish the vehicle first using unpublish_vehicle, then try deleting again.`,
            },
          ],
          isError: true,
        };
      }

      throw error;
    }
  }
};

module.exports = { vehicleTools, vehicleHandlers };
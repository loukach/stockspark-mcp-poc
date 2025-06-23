const vehicleTools = [
  {
    name: "add_vehicle",
    description: `Add vehicle manually with basic info (LAST RESORT ONLY)

WARNING: This creates incomplete vehicles without proper specifications
When to use: ONLY if start_vehicle_creation finds no trim data
Prerequisites: Verified no trim exists via reference tools
Missing data: No technical specs, emissions, or equipment details
Better alternative: ALWAYS use start_vehicle_creation workflow first

Required fields: make, model, year, price, fuel, transmission, condition
Optional: version, plate, mileage, color, doors
Next steps: upload_vehicle_images, then publish_vehicles`,
    inputSchema: {
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
          description: "Trim level/version (e.g., '1.3 JTDm 95 CV S&S Urban')" 
        },
        year: { 
          type: "number", 
          description: "Construction year (e.g., 2018)" 
        },
        plate: { 
          type: "string", 
          description: "License plate number",
          pattern: "^[A-Z]{2}[0-9]{3}[A-Z]{2}$"
        },
        mileage: { 
          type: "number", 
          description: "Current mileage in kilometers (required for used vehicles)" 
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
    description: `List vehicles in stock with smart filtering options

When to use: Browse inventory, find vehicles needing updates
Pagination: Default 10 per page, max 50
Filters: make, model, price range, image status
Returns: Vehicle summaries with IDs for other operations
Pro tip: Use hasImages=false to find vehicles needing photos`,
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "number", default: 0 },
        size: { type: "number", default: 10, maximum: 50 },
        make: { type: "string", description: "Filter by make" },
        model: { type: "string", description: "Filter by model" },
        hasImages: { type: "boolean", description: "Only vehicles with/without images" },
        minPrice: { type: "number", description: "Minimum price filter" },
        maxPrice: { type: "number", description: "Maximum price filter" }
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
  }
];

const vehicleHandlers = {
  add_vehicle: async (args, { vehicleAPI, organizationAPI, mapInputToVehicle }) => {
    const { validateRequired } = require('../utils/errors');
    
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

  list_vehicles: async (args, { vehicleAPI, formatVehicleListResponse }) => {
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
  }
};

module.exports = { vehicleTools, vehicleHandlers };
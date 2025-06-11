const vehicleTools = [
  {
    name: "add_vehicle",
    description: "Add a new vehicle to stock manually with basic info. WARNING: Only use this if you cannot find trim data via get_vehicle_trims. For accurate vehicle creation with complete specifications, always prefer create_vehicle_from_trim.",
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
    description: "Get detailed information about a specific vehicle",
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
    description: "List vehicles in stock with optional filters. Each vehicle includes dateAdded field showing when it was created. CRITICAL: For analysis, use 'getAllVehicles: true' to fetch complete dataset and avoid partial data errors. Response includes dataCompleteness warning if partial.",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "number", default: 0, description: "Page number for pagination (0-based)" },
        size: { type: "number", default: 50, maximum: 500, description: "Page size (50-500). For analysis, use getAllVehicles instead." },
        getAllVehicles: { type: "boolean", default: false, description: "Fetch ALL vehicles automatically (ignores page/size). RECOMMENDED for analysis to avoid subset errors." },
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
    description: "Update vehicle price",
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

module.exports = { vehicleTools };
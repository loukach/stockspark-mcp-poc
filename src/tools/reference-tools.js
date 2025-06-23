// PREFERRED VEHICLE CREATION WORKFLOW:
// 1. start_vehicle_creation (find make/model/trims)
// 2. create_vehicle_from_trim (compile + create with complete data)
// 
// ALTERNATIVE: Use add_vehicle only if no trim data available

const referenceTools = [
  // === PRIMARY VEHICLE CREATION WORKFLOW ===
  {
    name: "start_vehicle_creation",
    description: `BEST PRACTICE: Start vehicle creation with accurate specifications

Step 1 of 3 in recommended workflow
When to use: ALWAYS when creating new vehicles
Prerequisites: Know make and optionally model name
Returns: List of available trims with complete specifications

Workflow: start_vehicle_creation -> compare_trim_variants -> create_vehicle_from_trim
Pro tip: If many similar trims, use compare_trim_variants next
Note: This ensures vehicles have complete technical data`,
    inputSchema: {
      type: "object",
      properties: {
        make_name: {
          type: "string",
          description: "Make name (e.g., 'seat', 'bmw', 'volkswagen')"
        },
        model_name: {
          type: "string", 
          description: "Model name (e.g., 'ibiza', 'golf', 'polo'). Optional - if not provided, shows all models for the make."
        },
        country: {
          type: "string",
          description: "Country code (e.g., 'it', 'fr', 'de', 'es')",
          default: "it"
        },
        vehicle_class: {
          type: "string",
          enum: ["car", "lcv"],
          description: "Vehicle class",
          default: "car"
        },
        body_type: {
          type: "string",
          description: "Optional body type filter (currently not supported by API)"
        },
        fuel_type: {
          type: "string",
          description: "Optional fuel type filter (currently not supported by API)"
        },
        manufacture_date: {
          type: "string",
          description: "Optional manufacture date filter (MM-YYYY format, e.g., '01-2025')"
        },
        year: {
          type: "number",
          description: "Construction year (e.g., 2021) - automatically converted to manufacture_date filter if provided"
        }
      },
      required: ["make_name"]
    }
  },

  {
    name: "create_vehicle_from_trim",
    description: `Create vehicle with complete specifications from trim data

Step 3 of 3 in recommended workflow
When to use: After selecting trim from start_vehicle_creation
Prerequisites: Trim ID and source from previous step
Automatically includes: All technical specs, emissions, equipment

Required: providerCode (trim id), provider (source), price, condition
Optional: mileage (for USED), plate, color, doors, year override
Next steps: upload_vehicle_images_claude, then publish_vehicles`,
    inputSchema: {
      type: "object",
      properties: {
        providerCode: {
          type: "string",
          description: "Use the 'id' field from get_vehicle_trims result (e.g. '100037390420221105')"
        },
        provider: {
          type: "string",
          description: "Use the 'source' field from get_vehicle_trims result (e.g. 'datak')"
        },
        vehicleClass: {
          type: "string",
          description: "Vehicle class (typically 'car' in lowercase)"
        },
        price: {
          type: "number",
          description: "Sale price in EUR (consumer price)"
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
          description: "License plate number"
        },
        color: {
          type: "string",
          description: "External color (optional)"
        },
        doors: {
          type: "number",
          enum: [2, 3, 4, 5],
          description: "Number of doors (optional)"
        },
        year: {
          type: "number",
          description: "Construction year (e.g., 2021) - overrides the year from trim data if provided"
        },
        companyId: {
          type: "number",
          description: "Company ID (use environment STOCKSPARK_COMPANY_ID if not specified)"
        }
      },
      required: ["providerCode", "provider", "vehicleClass", "price", "condition"]
    }
  },

  {
    name: "compare_trim_variants",
    description: `Compare similar trim variants side-by-side

Step 2 of 3 (optional) in vehicle creation workflow
When to use: Multiple similar trims found (e.g., multiple Golf GTI variants)
Prerequisites: Model ID and base name from start_vehicle_creation
Returns: Comparison table of specs, engines, equipment

Helps distinguish: Engine variants, equipment levels, model years
Next step: Use selected trim ID in create_vehicle_from_trim`,
    inputSchema: {
      type: "object",
      properties: {
        country: {
          type: "string",
          description: "Country code (e.g., 'it', 'fr', 'de', 'es')",
          default: "it"
        },
        model_id: {
          type: "string",
          description: "Model ID from get_vehicle_models result"
        },
        base_model_name: {
          type: "string",
          description: "Base model name to filter variants (e.g., 'S 500', 'Golf GTI')"
        },
        year: {
          type: "number",
          description: "Construction year filter (e.g., 2021)"
        },
        max_variants: {
          type: "number",
          default: 10,
          description: "Maximum number of variants to show for comparison"
        }
      },
      required: ["model_id", "base_model_name"]
    }
  },

  // === SUPPORTING NAVIGATION TOOLS ===
  {
    name: "get_available_makes",
    description: "Get list of all available vehicle makes/manufacturers",
    inputSchema: {
      type: "object",
      properties: {
        search: {
          type: "string",
          description: "Optional search term to filter makes (case-insensitive)"
        }
      }
    }
  },

  {
    name: "get_vehicle_makes",
    description: "Get vehicle makes for a specific country using vehicle navigation API (/{country}/vehicle/makes)",
    inputSchema: {
      type: "object",
      properties: {
        country: {
          type: "string",
          description: "Country code (e.g., 'it', 'fr', 'de', 'es')",
          default: "it"
        },
        vehicle_class: {
          type: "string",
          enum: ["car", "lcv"],
          description: "Vehicle class - 'car' for cars, 'lcv' for light commercial vehicles",
          default: "car"
        }
      }
    }
  },
  
  {
    name: "get_available_models",
    description: "Get list of available models for a specific make using reference data API",
    inputSchema: {
      type: "object",
      properties: {
        make: {
          type: "string",
          description: "Vehicle make/manufacturer name (e.g., 'SEAT', 'BMW', 'Fiat')"
        },
        search: {
          type: "string",
          description: "Optional search term to filter models (case-insensitive)"
        }
      },
      required: ["make"]
    }
  },

  {
    name: "get_vehicle_models", 
    description: "Get vehicle models using navigation API (/{country}/vehicle/models) with vehicle class support",
    inputSchema: {
      type: "object",
      properties: {
        country: {
          type: "string", 
          description: "Country code (e.g., 'it', 'fr', 'de', 'es')",
          default: "it"
        },
        vehicle_class: {
          type: "string",
          enum: ["car", "lcv"],
          description: "Vehicle class - 'car' for cars, 'lcv' for light commercial vehicles",
          default: "car"
        },
        make: {
          type: "string",
          description: "Vehicle make name (e.g., 'Seat', 'BMW', 'Volkswagen')"
        }
      },
      required: ["make"]
    }
  },
  

  {
    name: "get_vehicle_trims",
    description: "Get vehicle trims using navigation API (/{country}/vehicle/trims). Returns trim data with 'id' and 'source' fields needed for compile_vehicle_by_trim and create_vehicle_from_trim. Use this instead of get_available_trims.", 
    inputSchema: {
      type: "object",
      properties: {
        country: {
          type: "string",
          description: "Country code (e.g., 'it', 'fr', 'de', 'es')", 
          default: "it"
        },
        model_id: {
          type: "string",
          description: "Model ID from get_vehicle_models result"
        },
        body_type: {
          type: "string",
          description: "Optional body type filter (e.g., 'Hatchback', 'Sedan')"
        },
        fuel_type: {
          type: "string", 
          description: "Optional fuel type filter (e.g., 'PETROL', 'DIESEL')"
        },
        manufacture_date: {
          type: "string",
          description: "Optional manufacture date filter (MM-YYYY format, e.g., '01-2025')"
        }
      },
      required: ["model_id"]
    }
  },

  {
    name: "find_models_by_make",
    description: "Find models by make name with fuzzy matching - helpful when user says 'seat ibiza'",
    inputSchema: {
      type: "object", 
      properties: {
        country: {
          type: "string",
          description: "Country code (e.g., 'it', 'fr', 'de', 'es')",
          default: "it"
        },
        make_name: {
          type: "string",
          description: "Make name to search (e.g., 'seat', 'bmw') - supports fuzzy matching"
        },
        vehicle_class: {
          type: "string",
          enum: ["car", "lcv"],
          description: "Vehicle class",
          default: "car"
        }
      },
      required: ["make_name"]
    }
  },
  
  {
    name: "search_reference_data",
    description: "Search across makes, models, and trims with a general query",
    inputSchema: {
      type: "object", 
      properties: {
        query: {
          type: "string",
          description: "Search term to find matching makes, models, or trims"
        },
        type: {
          type: "string",
          enum: ["makes", "models", "trims", "all"],
          description: "Type of data to search (default: all)"
        },
        limit: {
          type: "number",
          default: 20,
          maximum: 100,
          description: "Maximum number of results to return"
        }
      },
      required: ["query"]
    }
  },

  {
    name: "compile_vehicle_by_trim",
    description: "Preview vehicle data from trim - shows what vehicle will be created. Use this to verify trim data before create_vehicle_from_trim. Note: create_vehicle_from_trim automatically calls this internally.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "number",
          description: "Company ID (use environment STOCKSPARK_COMPANY_ID if not specified)"
        },
        providerCode: {
          type: "string",
          description: "Use the 'id' field from get_vehicle_trims result (e.g. '100037390420221105')"
        },
        vehicleClass: {
          type: "string",
          description: "Vehicle class (typically 'car' in lowercase)"
        },
        provider: {
          type: "string",
          description: "Use the 'source' field from get_vehicle_trims result (e.g. 'datak')"
        }
      },
      required: ["providerCode", "vehicleClass"]
    }
  },

  {
    name: "get_fuel_types",
    description: "Get list of available fuel types for vehicles",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },

  {
    name: "get_transmission_types", 
    description: "Get list of available transmission types for vehicles",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },


  {
    name: "get_vehicle_bodies",
    description: "Get available body types for vehicles (e.g., Hatchback, Sedan, SUV) for filtering trims",
    inputSchema: {
      type: "object",
      properties: {
        country: {
          type: "string",
          description: "Country code (e.g., 'it', 'fr', 'de', 'es')",
          default: "it"
        },
        vehicle_class: {
          type: "string",
          enum: ["car", "lcv"],
          description: "Vehicle class",
          default: "car"
        }
      }
    }
  },

  {
    name: "get_vehicle_fuels",
    description: "Get available fuel types for vehicles (e.g., PETROL, DIESEL, ELECTRIC) for filtering trims",
    inputSchema: {
      type: "object",
      properties: {
        country: {
          type: "string",
          description: "Country code (e.g., 'it', 'fr', 'de', 'es')",
          default: "it"
        },
        vehicle_class: {
          type: "string",
          enum: ["car", "lcv"],
          description: "Vehicle class",
          default: "car"
        }
      }
    }
  }
];

// Reference tool handlers
const referenceHandlers = {
  get_available_makes: async (args, { referenceAPI }) => {
    const result = await referenceAPI.getMakes(args.search);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },

  get_available_models: async (args, { referenceAPI }) => {
    const { validateRequired } = require('../utils/errors');
    
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
  },

  search_reference_data: async (args, { referenceAPI }) => {
    const { validateRequired } = require('../utils/errors');
    
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
  },

  compile_vehicle_by_trim: async (args, { referenceAPI, organizationAPI }) => {
    const { validateRequired } = require('../utils/errors');
    
    validateRequired(args.providerCode, 'providerCode');
    validateRequired(args.vehicleClass, 'vehicleClass');
    
    const context = organizationAPI.getCurrentContext();
    const companyId = args.companyId || context.companyId || process.env.STOCKSPARK_COMPANY_ID;
    
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
  },

  get_fuel_types: async (args, { referenceAPI }) => {
    const result = await referenceAPI.getFuelTypes();
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },

  get_transmission_types: async (args, { referenceAPI }) => {
    const result = await referenceAPI.getTransmissionTypes();
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },

  get_vehicle_makes: async (args, { referenceAPI }) => {
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
  },

  get_vehicle_models: async (args, { referenceAPI }) => {
    const { validateRequired } = require('../utils/errors');
    
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
  },

  get_vehicle_trims: async (args, { referenceAPI }) => {
    const { validateRequired } = require('../utils/errors');
    
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
  },

  find_models_by_make: async (args, { referenceAPI }) => {
    const { validateRequired } = require('../utils/errors');
    
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
  },

  get_vehicle_bodies: async (args, { referenceAPI }) => {
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
  },

  get_vehicle_fuels: async (args, { referenceAPI }) => {
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
  },

  start_vehicle_creation: async (args, { referenceAPI }) => {
    const { validateRequired } = require('../utils/errors');
    
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
  },

  create_vehicle_from_trim: async (args, { referenceAPI, vehicleAPI, organizationAPI }) => {
    const { validateRequired, validatePrice } = require('../utils/errors');
    
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
  },

  compare_trim_variants: async (args, { referenceAPI }) => {
    const { validateRequired } = require('../utils/errors');
    
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
  }
};

module.exports = { referenceTools, referenceHandlers };
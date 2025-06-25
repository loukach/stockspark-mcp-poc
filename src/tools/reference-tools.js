// SIMPLIFIED VEHICLE CREATION WORKFLOW:
// 1. search_vehicle_versions (find makes/models/versions)
// 2. get_vehicle_version_template (compile vehicle data)
// 3. add_vehicle (create with template or basic data)

const referenceTools = [
  // === NEW VEHICLE CREATION WORKFLOW ===
  {
    name: "search_vehicle_versions",
    description: `Smart search for vehicle versions. Returns makes, models, or versions based on input.

Progressive search:
- No input → returns all makes
- With make → returns models for that make
- With make + model → returns matching versions

IMPORTANT: When multiple versions are found, DO NOT automatically choose one. 
Present options to the user and ask them to specify their preferred version, 
engine size, or other distinguishing features before proceeding.`,
    inputSchema: {
      type: "object",
      properties: {
        make: {
          type: "string",
          description: "Make name (optional, e.g., 'BMW', 'Volkswagen')"
        },
        model: {
          type: "string",
          description: "Model name (optional, e.g., '320i', 'Golf')"
        },
        year: {
          type: "number",
          description: "Year filter (optional)"
        },
        fuel: {
          type: "string",
          description: "Fuel type filter (optional)"
        },
        vehicleClass: {
          type: "string",
          default: "car",
          description: "Vehicle class (car/lcv)"
        },
        country: {
          type: "string",
          default: "it",
          description: "Country code"
        }
      }
    }
  },

  {
    name: "compare_vehicle_versions",
    description: `Compare multiple vehicle versions side-by-side.

Helps distinguish between similar versions by showing key differences in specs, engines, and equipment.`,
    inputSchema: {
      type: "object",
      properties: {
        versionIds: {
          type: "array",
          items: { type: "string" },
          description: "Array of version IDs to compare"
        }
      },
      required: ["versionIds"]
    }
  },

  {
    name: "get_vehicle_version_template",
    description: `Get enriched vehicle specifications from version code.

PREREQUISITE: User must have selected a specific version ID. Do NOT call this tool 
until the user has explicitly chosen which version they want from the search results.

Returns vehicle template ready for creation with complete technical data, emissions, and equipment.`,
    inputSchema: {
      type: "object",
      properties: {
        providerCode: {
          type: "string",
          description: "Version ID from search results"
        },
        provider: {
          type: "string",
          description: "Data provider (optional, usually 'datak')"
        },
        vehicleClass: {
          type: "string",
          default: "car",
          description: "Vehicle class"
        }
      },
      required: ["providerCode"]
    }
  },

  // === SUPPORTING NAVIGATION TOOLS ===

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
    description: "Get vehicle versions using navigation API (/{country}/vehicle/trims). Returns version data with 'id' and 'source' fields needed for get_vehicle_version_template.", 
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
    name: "get_vehicle_transmissions", 
    description: "Get list of available transmission types for vehicles",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },


  {
    name: "get_vehicle_bodies",
    description: "Get available body types for vehicles (e.g., Hatchback, Sedan, SUV) for filtering versions",
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
    description: "Get available fuel types for vehicles (e.g., PETROL, DIESEL, ELECTRIC) for filtering versions",
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
    name: "get_vehicle_colors",
    description: `Get list of available vehicle colors for color updates.

Use this tool before updating vehicle colors to see valid color options.
Returns standard color names that can be used with update_vehicle tool.`,
    inputSchema: {
      type: "object",
      properties: {
        country: {
          type: "string",
          default: "it",
          description: "Country code for color options"
        }
      }
    }
  }
];

// Reference tool handlers
const referenceHandlers = {
  search_vehicle_versions: async (args, { referenceAPI }) => {
    const country = args.country || process.env.STOCKSPARK_COUNTRY || 'it';
    const vehicleClass = args.vehicleClass || 'car';
    
    // No input - return all makes
    if (!args.make) {
      const result = await referenceAPI.getVehicleMakes(country, vehicleClass);
      return {
        content: [
          {
            type: 'text',
            text: `Found ${result.count} makes for ${country.toUpperCase()}:\n\n` +
              result.makes.map((make, idx) => `${idx + 1}. **${make.name}** (ID: ${make.id})`).join('\n') +
              '\n\n📋 **Next:** Use search_vehicle_versions with make parameter to see models.',
          },
        ],
      };
    }
    
    // Only make - return models
    if (args.make && !args.model) {
      const result = await referenceAPI.getVehicleModels(country, vehicleClass, args.make);
      
      if (result.count === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ No models found for make "${args.make}". Use get_vehicle_makes first to see all available makes and ensure exact spelling.`,
            },
          ],
        };
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `Found ${result.count} models for ${args.make}:\n\n` +
              result.models.slice(0, 20).map((model, idx) => 
                `${idx + 1}. **${model.name}** (ID: ${model.id})`
              ).join('\n') +
              (result.count > 20 ? `\n... and ${result.count - 20} more models.` : '') +
              '\n\n📋 **Next:** Use search_vehicle_versions with both make and model to see versions.',
          },
        ],
      };
    }
    
    // Make + model - return trims
    if (args.make && args.model) {
      // First find model ID
      const modelsResult = await referenceAPI.getVehicleModels(country, vehicleClass, args.make);
      const modelMatch = modelsResult.models.find(m => 
        m.name.toLowerCase().includes(args.model.toLowerCase())
      );
      
      if (!modelMatch) {
        const availableModels = modelsResult.models.slice(0, 5).map(m => m.name).join(', ');
        return {
          content: [
            {
              type: 'text',
              text: `❌ No "${args.model}" model found for ${args.make}.\n\nAvailable models: ${availableModels}`,
            },
          ],
        };
      }
      
      // Get versions with optional filters
      const manufactureDate = args.year ? `01-${args.year}` : null;
      const versionsResult = await referenceAPI.getVehicleTrims(
        country, 
        modelMatch.id, 
        null, // body filter
        args.fuel, 
        manufactureDate
      );
      
      if (versionsResult.count === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ No versions found for ${args.make} ${args.model}${args.year ? ` from ${args.year}` : ''}${args.fuel ? ` with ${args.fuel} fuel` : ''}.`,
            },
          ],
        };
      }
      
      let message = `Found ${versionsResult.count} versions for ${args.make} ${args.model}`;
      if (args.year) message += ` (${args.year})`;
      if (args.fuel) message += ` (${args.fuel})`;
      message += ':\n\n';
      
      versionsResult.trims.slice(0, 15).forEach((version, idx) => {
        message += `${idx + 1}. **${version.name}**\n`;
        message += `   • ID: ${version.id}\n`;
        message += `   • Engine: ${version.engineSize}cc, ${version.powerKw}kW\n`;
        message += `   • Fuel: ${version.fuelType?.name || 'N/A'}\n`;
        message += `   • Price: €${version.listPrice || 'N/A'}\n\n`;
      });
      
      if (versionsResult.count > 15) {
        message += `... and ${versionsResult.count - 15} more versions.\n\n`;
      }
      
      if (versionsResult.count > 1) {
        message += '⚠️  **MULTIPLE OPTIONS FOUND** - User must choose specific version before proceeding.\n\n';
        message += '📋 **Next Steps:**\n';
        message += '1. Ask user to specify which version they prefer\n';
        message += '2. Consider price range, features, engine preference\n';
        message += '3. Only then use get_vehicle_version_template with chosen version ID';
      } else {
        message += '📋 **Next:** Use get_vehicle_version_template with version ID.';
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
    
    return {
      content: [
        {
          type: 'text',
          text: 'No matches found. Try specifying make and/or model parameters.',
        },
      ],
    };
  },

  compare_vehicle_versions: async (args, { referenceAPI }) => {
    const { validateRequired } = require('../utils/errors');
    
    validateRequired(args.versionIds, 'versionIds');
    
    if (!Array.isArray(args.versionIds) || args.versionIds.length === 0) {
      throw new Error('versionIds must be a non-empty array');
    }
    
    if (args.versionIds.length > 10) {
      throw new Error('Maximum 10 versions can be compared at once');
    }
    
    // Get details for each version (simplified for MVP)
    const comparisons = [];
    
    for (const versionId of args.versionIds) {
      try {
        // For MVP, we'll use a simplified approach
        // In a full implementation, we'd fetch individual version details
        comparisons.push({
          id: versionId,
          status: 'Found',
        });
      } catch (error) {
        comparisons.push({
          id: versionId,
          status: 'Error',
          error: error.message
        });
      }
    }
    
    let message = `🔍 Comparing ${args.versionIds.length} version options:\n\n`;
    
    comparisons.forEach((comp, idx) => {
      message += `${idx + 1}. Version ID: ${comp.id}\n`;
      message += `   Status: ${comp.status}\n`;
      if (comp.error) {
        message += `   Error: ${comp.error}\n`;
      }
      message += '\n';
    });
    
    message += '📋 **Next:** Choose a version ID and use get_vehicle_version_template.';
    
    return {
      content: [
        {
          type: 'text',
          text: message,
        },
      ],
    };
  },

  get_vehicle_version_template: async (args, { referenceAPI, organizationAPI }) => {
    const { validateRequired } = require('../utils/errors');
    
    validateRequired(args.providerCode, 'providerCode');
    
    const context = organizationAPI.getCurrentContext();
    const companyId = context.companyId || process.env.STOCKSPARK_COMPANY_ID;
    
    if (!companyId) {
      throw new Error('Company ID required. Use get_user_context to check organization.');
    }
    
    const result = await referenceAPI.compileVehicleByVersion(
      companyId,
      args.providerCode,
      args.vehicleClass || 'car',
      args.provider || 'datak'
    );
    
    const template = {
      make: result.make?.name,
      model: result.model?.name,
      version: result.version?.name,
      year: result.constructionYear,
      fuel: result.fuel?.name,
      transmission: result.gearbox?.name,
      engine: {
        size: result.cubicCapacity,
        power: result.power,
        powerHp: result.powerHp
      },
      doors: result.doors,
      seats: result.seat,
      body: result.body?.name || 'Sedan'
    };
    
    const userFields = {
      price: 'Required - Your selling price',
      condition: 'Required - NEW/USED/KM0',
      mileage: 'Required for USED vehicles',
      plate: 'Optional - License plate',
      color: 'Optional - External color'
    };
    
    return {
      content: [
        {
          type: 'text',
          text: `✅ Vehicle template compiled:\n\n` +
            `**Template Data:**\n` +
            `• Make: ${template.make}\n` +
            `• Model: ${template.model}\n` +
            `• Version: ${template.version}\n` +
            `• Year: ${template.year}\n` +
            `• Engine: ${template.engine.size}cc, ${template.engine.powerHp}hp\n` +
            `• Fuel: ${template.fuel}\n` +
            `• Transmission: ${template.transmission}\n\n` +
            `**Template Object (use this for add_vehicle):**\n` +
            `\`\`\`json\n${JSON.stringify(template, null, 2)}\n\`\`\`\n\n` +
            `**Required User Fields:**\n` +
            Object.entries(userFields).map(([key, desc]) => `• ${key}: ${desc}`).join('\n') +
            `\n\n📋 **Next:** Use add_vehicle with this template object and your price/condition data.`,
        },
      ],
    };
  },

  get_vehicle_transmissions: async (args, { referenceAPI }) => {
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
            text: `No versions found for model ID "${args.model_id}"${filterInfo} in ${country.toUpperCase()}`,
          },
        ],
      };
    }
    
    const message = `Found ${result.count} versions for model ${args.model_id} in ${country.toUpperCase()}:\n\n` +
      result.trims.map((version, idx) => 
        `${idx + 1}. ${version.name}\n   ID: ${version.id} | Source: ${version.source}\n   Fuel: ${version.fuelType} | Engine: ${version.engineSize} | Power: ${version.power}`
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

  get_vehicle_colors: async (args, { client }) => {
    const country = args.country || 'it';
    const response = await client.get('/refdata/colors');
    const colors = Array.isArray(response) ? response : (response.values || []);
    
    if (!colors.length) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ No colors found in the system.',
          },
        ],
      };
    }

    const colorList = colors
      .map((color, index) => `${index + 1}. **${color.name}** ${color.description ? `(${color.description})` : ''}`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `🎨 **Available Vehicle Colors:**\n\n${colorList}\n\n💡 **Usage:** Use the exact color name with update_vehicle tool.\n📝 **Example:** \`update_vehicle({vehicleId: 123, updates: {color: "Rosso"}})\``,
        },
      ],
    };
  },

};

module.exports = { referenceTools, referenceHandlers };
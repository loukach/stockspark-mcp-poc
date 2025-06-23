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

module.exports = { referenceTools };
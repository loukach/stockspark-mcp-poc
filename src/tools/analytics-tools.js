const analyticsTools = [
  {
    name: "get_underperforming_vehicles",
    description: "Analyze vehicle inventory to identify underperforming vehicles based on days in stock, image count, and other factors",
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
    }
  },

  {
    name: "apply_bulk_discount",
    description: "Apply percentage discount to multiple vehicles and optionally republish them to active portals",
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
    }
  },

  {
    name: "analyze_inventory_health",
    description: "Get overall inventory health metrics including average days in stock, image coverage, and pricing analysis",
    inputSchema: {
      type: "object",
      properties: {
        includeDetails: {
          type: "boolean",
          default: false,
          description: "Include detailed breakdown by brand, price range, etc."
        }
      }
    }
  },

  {
    name: "get_pricing_recommendations",
    description: "Get AI-powered pricing recommendations based on market data and vehicle performance",
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
    }
  }
];

module.exports = { analyticsTools };
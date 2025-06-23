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
    }
  }
];

module.exports = { analyticsTools };
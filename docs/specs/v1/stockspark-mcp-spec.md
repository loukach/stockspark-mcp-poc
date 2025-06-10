# StockSpark MCP Server POC Specification

## Overview
Minimal MCP (Model Context Protocol) server for AI agents to interact with StockSpark/Carspark vehicle inventory management system.

## Configuration

### MCP Server Registration (claude_desktop_config.json)
```json
{
  "mcpServers": {
    "stockspark": {
      "command": "node",
      "args": ["path/to/stockspark-mcp/src/index.js"],
      "env": {
        "STOCKSPARK_USERNAME": "lucas.gros+demo@motork.io",
        "STOCKSPARK_PASSWORD": "ZDU8qty4fjg-qwx7apv",
        "STOCKSPARK_CLIENT_ID": "carspark-api",
        "STOCKSPARK_AUTH_URL": "https://auth.motork.io/realms/prod/protocol/openid-connect/token",
        "STOCKSPARK_API_URL": "https://carspark-api.dealerk.com",
        "STOCKSPARK_COUNTRY": "it",
        "STOCKSPARK_COMPANY_ID": "35430",
        "STOCKSPARK_DEALER_ID": "196036",
        "MYPORTAL_ACTIVATION_CODE": "myportal",
        "AUTOMOBILE_IT_ACTIVATION_CODE": "ebayClassifiedsGroup"
      }
    }
  }
}
```

## Project Structure
```
stockspark-mcp/
├── package.json
├── src/
│   ├── index.js          # MCP server entry point
│   ├── auth.js           # Keycloak authentication
│   ├── api/
│   │   ├── client.js     # API client with auth
│   │   ├── vehicles.js   # Vehicle operations
│   │   ├── images.js     # Image operations
│   │   └── publications.js # Publishing operations
│   ├── tools/
│   │   ├── vehicle-tools.js
│   │   ├── image-tools.js
│   │   ├── publish-tools.js
│   │   └── analytics-tools.js
│   └── utils/
│       └── mappers.js    # Data mapping utilities
└── README.md
```

## Core Components

### 1. Authentication Manager
```javascript
// src/auth.js
class AuthManager {
  constructor() {
    this.token = null;
    this.tokenExpiry = null;
  }

  async getToken() {
    if (this.token && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.token;
    }
    
    const response = await fetch(process.env.STOCKSPARK_AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'password',
        client_id: process.env.STOCKSPARK_CLIENT_ID,
        username: process.env.STOCKSPARK_USERNAME,
        password: process.env.STOCKSPARK_PASSWORD
      })
    });
    
    if (!response.ok) {
      throw new Error(`Auth failed: ${response.status}`);
    }
    
    const data = await response.json();
    this.token = data.access_token;
    this.tokenExpiry = new Date(Date.now() + (data.expires_in - 60) * 1000);
    return this.token;
  }
}

module.exports = { AuthManager };
```

### 2. API Client
```javascript
// src/api/client.js
class StockSparkClient {
  constructor(authManager) {
    this.auth = authManager;
  }
  
  async request(path, options = {}) {
    const token = await this.auth.getToken();
    const url = `${process.env.STOCKSPARK_API_URL}/${process.env.STOCKSPARK_COUNTRY}${path}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      const error = new Error(`API Error: ${response.status} ${response.statusText}`);
      error.status = response.status;
      error.response = response;
      throw error;
    }
    
    return response.json();
  }
}

module.exports = { StockSparkClient };
```

## MCP Tools Definition

### 1. Vehicle Management Tools

```javascript
// src/tools/vehicle-tools.js
const vehicleTools = [
  {
    name: "add_vehicle",
    description: "Add a new vehicle to stock. Supports basic info like make, model, year, price.",
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
    description: "List vehicles in stock with optional filters",
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
```

### 2. Image Management Tools

```javascript
// src/tools/image-tools.js
const imageTools = [
  {
    name: "upload_vehicle_images",
    description: "Upload images to a vehicle gallery from URLs",
    inputSchema: {
      type: "object",
      properties: {
        vehicleId: { type: "number" },
        imageUrls: { 
          type: "array", 
          items: { type: "string", format: "uri" },
          description: "Array of image URLs to upload"
        },
        mainImageIndex: { 
          type: "number", 
          default: 0,
          description: "Index of the main image (0-based)"
        }
      },
      required: ["vehicleId", "imageUrls"]
    }
  },
  
  {
    name: "get_vehicle_images",
    description: "Get all images for a vehicle",
    inputSchema: {
      type: "object",
      properties: {
        vehicleId: { type: "number" }
      },
      required: ["vehicleId"]
    }
  }
];

module.exports = { imageTools };
```

### 3. Publishing Tools

```javascript
// src/tools/publish-tools.js
const publishTools = [
  {
    name: "publish_vehicle",
    description: "Publish vehicle to specified portals (MyPortal and/or automobile.it)",
    inputSchema: {
      type: "object",
      properties: {
        vehicleId: { type: "number" },
        portals: { 
          type: "array", 
          items: { 
            type: "string", 
            enum: ["myportal", "automobile.it"] 
          },
          description: "Portals to publish to"
        }
      },
      required: ["vehicleId", "portals"]
    }
  },
  
  {
    name: "unpublish_vehicle",
    description: "Remove vehicle from specified portals",
    inputSchema: {
      type: "object",
      properties: {
        vehicleId: { type: "number" },
        portals: { 
          type: "array", 
          items: { 
            type: "string", 
            enum: ["myportal", "automobile.it", "all"] 
          }
        }
      },
      required: ["vehicleId", "portals"]
    }
  },
  
  {
    name: "get_publication_status",
    description: "Check where a vehicle is currently published",
    inputSchema: {
      type: "object",
      properties: {
        vehicleId: { type: "number" }
      },
      required: ["vehicleId"]
    }
  }
];

module.exports = { publishTools };
```

### 4. Analytics Tools

```javascript
// src/tools/analytics-tools.js
const analyticsTools = [
  {
    name: "get_underperforming_vehicles",
    description: "Find vehicles that need attention based on age in stock and image count",
    inputSchema: {
      type: "object",
      properties: {
        daysInStock: { 
          type: "number", 
          default: 60,
          description: "Minimum days in stock to consider underperforming"
        },
        minImages: { 
          type: "number", 
          default: 5,
          description: "Minimum number of images expected"
        },
        limit: { 
          type: "number", 
          default: 10,
          description: "Maximum number of results"
        }
      }
    }
  },
  
  {
    name: "apply_bulk_discount",
    description: "Apply discount to multiple vehicles",
    inputSchema: {
      type: "object",
      properties: {
        vehicleIds: { 
          type: "array", 
          items: { type: "number" },
          description: "List of vehicle IDs to discount"
        },
        discountPercent: { 
          type: "number", 
          minimum: 0, 
          maximum: 50,
          description: "Discount percentage to apply"
        },
        discountTitle: {
          type: "string",
          default: "Special Offer",
          description: "Title for the discount"
        },
        discountDescription: { 
          type: "string",
          description: "Description of the discount"
        }
      },
      required: ["vehicleIds", "discountPercent"]
    }
  }
];

module.exports = { analyticsTools };
```

## Data Mapping Functions

### Vehicle Data Mapper
```typescript
export function mapInputToVehicle(input: any): any {
  const baseData = {
    companyId: parseInt(process.env.STOCKSPARK_COMPANY_ID!),
    dealerId: parseInt(process.env.STOCKSPARK_DEALER_ID!),
    vehicleClass: { name: "CAR" },
    status: { name: "FREE" },
    wheelFormula: { name: "FRONT" },
    body: { name: "HATCHBACK" }, // Default, should be enhanced
    power: 100, // Default kW
    powerHp: 136, // Default HP
    seat: 5, // Default seats
    doors: input.doors || 4,
    priceGross: { 
      consumerPrice: input.price,
      listPrice: Math.round(input.price * 1.2) // Estimate
    },
    priceNet: { 
      consumerPrice: input.price 
    },
    vatRate: 0,
    make: { name: input.make },
    model: { name: input.model },
    version: { name: input.version },
    fuel: { name: input.fuel },
    gearbox: { name: input.transmission },
    condition: { name: input.condition }
  };

  // Add year/date fields
  if (input.year) {
    baseData.constructionYear = input.year.toString();
    baseData.constructionDate = `${input.year}-01-01T00:00:00.000+00:00`;
  }

  // Add fields for used vehicles
  if (input.condition === "USED") {
    baseData.mileage = input.mileage;
    baseData.numberPlate = input.plate;
    baseData.firstRegistration = `${input.year}01`; // Default to January
  }

  // Add optional fields
  if (input.color) {
    baseData.color = input.color;
  }

  return baseData;
}
```

### Stock Analysis Function
```typescript
export function analyzeVehiclePerformance(vehicle: any): any {
  const enteredDate = new Date(vehicle.enteredInStockDate);
  const daysInStock = Math.floor((Date.now() - enteredDate.getTime()) / (1000 * 60 * 60 * 24));
  const imageCount = vehicle.images?.GALLERY_ITEM?.length || 0;
  const hasDiscount = !!vehicle.discount;
  const price = vehicle.priceGross?.consumerPrice || 0;
  
  const issues = [];
  
  if (daysInStock > 60) issues.push(`Old stock (${daysInStock} days)`);
  if (imageCount < 5) issues.push(`Few images (${imageCount})`);
  if (!hasDiscount && daysInStock > 30) issues.push("No discount applied");
  if (price === 0) issues.push("No price set");
  
  return {
    vehicleId: vehicle.vehicleId,
    plate: vehicle.numberPlate || "N/A",
    make: vehicle.make?.name || "Unknown",
    model: vehicle.model?.name || "Unknown",
    year: vehicle.constructionYear || "Unknown",
    price,
    daysInStock,
    imageCount,
    hasDiscount,
    issues,
    score: calculatePerformanceScore(daysInStock, imageCount, hasDiscount)
  };
}

function calculatePerformanceScore(daysInStock: number, imageCount: number, hasDiscount: boolean): number {
  let score = 100;
  
  // Deduct points for age
  if (daysInStock > 30) score -= Math.min(30, daysInStock - 30);
  
  // Deduct points for few images
  if (imageCount < 10) score -= (10 - imageCount) * 3;
  
  // Bonus for having discount when old
  if (hasDiscount && daysInStock > 30) score += 10;
  
  return Math.max(0, score);
}
```

## Error Handling

```javascript
// src/utils/errors.js
class StockSparkError extends Error {
  constructor(message, code, details) {
    super(message);
    this.name = 'StockSparkError';
    this.code = code;
    this.details = details;
  }
}

function handleApiError(error) {
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;
    
    switch (status) {
      case 401:
        return new StockSparkError('Authentication failed', 'AUTH_FAILED', data);
      case 404:
        return new StockSparkError('Resource not found', 'NOT_FOUND', data);
      case 409:
        return new StockSparkError('Conflict - resource already exists', 'CONFLICT', data);
      case 412:
        return new StockSparkError('Validation failed', 'VALIDATION_ERROR', data);
      default:
        return new StockSparkError(`API error: ${status}`, 'API_ERROR', data);
    }
  }
  
  return new StockSparkError('Network error', 'NETWORK_ERROR', error.message);
}

module.exports = {
  StockSparkError,
  handleApiError
};
```

## Example Usage Flows

### 1. Add Vehicle with Images
```
User: "Add Alfa Romeo MiTo 1.3 JTDm from 2018, plate FP370JX"
Agent: Uses add_vehicle tool
Agent: "Vehicle added with ID 12345. What price should I set?"
User: "9,900 EUR"
Agent: Uses update_vehicle_price tool
Agent: "Price set. Do you have images to upload?"
User: [Provides image URLs]
Agent: Uses upload_vehicle_images tool
Agent: "Uploaded 8 images. Should I publish to MyPortal and automobile.it?"
User: "Yes"
Agent: Uses publish_vehicle tool
Agent: "Published successfully to both portals."
```

### 2. Stock Optimization
```
User: "Which vehicles aren't selling well?"
Agent: Uses get_underperforming_vehicles tool
Agent: "Found 10 vehicles needing attention:
1. Fiat 500 (AB123CD) - 75 days in stock, only 3 images
2. Ford Fiesta (EF456GH) - 62 days, no discount
...
Should I apply a 10% discount to boost visibility?"
User: "Yes, apply to all"
Agent: Uses apply_bulk_discount tool
Agent: "Applied 10% discount to all 10 vehicles and republished them."
```

## Testing

```javascript
// test-connection.js
const { AuthManager } = require('./src/auth');
const { StockSparkClient } = require('./src/api/client');

async function testConnection() {
  const auth = new AuthManager();
  const client = new StockSparkClient(auth);
  
  try {
    // Test auth
    console.log('Testing authentication...');
    const token = await auth.getToken();
    console.log('✓ Authentication successful');
    
    // Test vehicle list
    console.log('Testing vehicle list...');
    const vehicles = await client.request('/vehicle?page=0&size=1');
    console.log(`✓ Found ${vehicles.totalVehicles} vehicles`);
    
    // Test reference data
    console.log('Testing reference data...');
    const makes = await client.request('/refdata/CAR/makes');
    console.log(`✓ Found ${makes.values.length} car makes`);
    
  } catch (error) {
    console.error('✗ Test failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  testConnection();
}
```
# StockSpark MCP HTTP Server Deployment

## Overview

This HTTP wrapper allows the StockSpark MCP server to be deployed as a web service on Render.com, making it accessible via REST API endpoints instead of just local stdio transport.

## Quick Start

### Local Development
```bash
# Install dependencies
npm install

# Start HTTP server (demo mode)
npm run start:http

# Server runs on http://localhost:3000
```

### Deployment to Render.com

1. **Create Render Service**
   - Connect your GitHub repository to Render
   - Create a new Web Service
   - Use the `render.yaml` configuration

2. **Set Environment Variables**
   Required variables in Render dashboard:
   ```
   STOCKSPARK_USERNAME=your_username
   STOCKSPARK_PASSWORD=your_password
   STOCKSPARK_CLIENT_ID=your_client_id
   STOCKSPARK_AUTH_URL=https://your-auth-url
   STOCKSPARK_API_URL=https://your-api-url
   STOCKSPARK_COMPANY_ID=your_company_id (optional)
   STOCKSPARK_DEALER_ID=your_dealer_id (optional)
   ```

3. **Deploy**
   - Push to your repository
   - Render will automatically deploy using `render.yaml`

## API Endpoints

### Health Check
```bash
GET /
```

### List Available Tools
```bash
GET /tools
```

### Read Operations (GET)
For retrieving data - use query parameters:
```bash
GET /tools/:toolName?param1=value1&param2=value2
```

**GET Tools:** test_connection, get_user_context, list_user_companies, list_company_dealers, get_vehicle, list_vehicles, get_vehicle_images, get_publication_status, list_available_portals, get_underperforming_vehicles, analyze_inventory_health, get_pricing_recommendations, get_available_makes, get_available_models, search_reference_data, compile_vehicle_by_trim, get_fuel_types, get_transmission_types, get_vehicle_makes, get_vehicle_models, get_vehicle_trims, find_models_by_make, get_vehicle_bodies, get_vehicle_fuels

### Write Operations (POST)
For creating/modifying data - use JSON body:
```bash
POST /tools/:toolName
Content-Type: application/json

{
  "arguments": {
    "param1": "value1",
    "param2": "value2"
  }
}
```

**POST Tools:** select_company, select_dealer, add_vehicle, update_vehicle_price, upload_vehicle_images, upload_vehicle_images_claude, upload_vehicle_images_from_data, delete_vehicle_image, set_main_image, publish_vehicle, unpublish_vehicle, apply_bulk_discount, start_vehicle_creation, create_vehicle_from_trim, compare_trim_variants

## Example Usage

```bash
# Test connection (GET)
curl https://your-app.onrender.com/tools/test_connection

# Get user context (GET)
curl https://your-app.onrender.com/tools/get_user_context

# List vehicles with filters (GET)
curl "https://your-app.onrender.com/tools/list_vehicles?page=0&size=10&make=BMW"

# Get specific vehicle (GET)
curl https://your-app.onrender.com/tools/get_vehicle?vehicleId=123

# Add vehicle (POST)
curl -X POST -H "Content-Type: application/json" \
  -d '{"arguments": {"make": "BMW", "model": "X3", "price": 45000, "condition": "USED"}}' \
  https://your-app.onrender.com/tools/add_vehicle

# Update vehicle price (POST)
curl -X POST -H "Content-Type: application/json" \
  -d '{"arguments": {"vehicleId": 123, "newPrice": 42000}}' \
  https://your-app.onrender.com/tools/update_vehicle_price
```

## Response Format

All responses follow this format:
```json
{
  "success": true|false,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Response content"
      }
    ]
  },
  "error": "Error message if success=false"
}
```

## Demo Mode

When environment variables are not configured, the server runs in demo mode:
- Only `test_connection` tool works
- Other tools return helpful error messages
- Useful for testing deployment without credentials

## Architecture

- `src/http-server.js` - Express HTTP server wrapper
- `src/mcp-tool-handlers.js` - Extracted tool handlers for reuse
- `src/index.js` - Original MCP stdio server (unchanged)
- All existing MCP logic preserved and reused
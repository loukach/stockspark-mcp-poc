# StockSpark MCP API Reference

Quick reference guide for all 41 MCP tools available in StockSpark MCP Server.

## 🏢 Organization Management Tools (5)

### `get_user_context`
Get current organization context (selected company and dealer).
```javascript
// No parameters required
// Returns: { companyId, companyName, dealerId, dealerName, country }
```

### `list_user_companies`
List all companies the user has access to.
```javascript
{ country: "it" }  // Optional: it, fr, de, es
// Returns: Array of company objects
```

### `select_company`
Select a specific company to work with.
```javascript
{ 
  companyId: 12345,
  country: "it"  // Optional
}
// Returns: Confirmation with selected company details
```

### `list_company_dealers`
List all dealers for the selected company.
```javascript
{ 
  companyId: 12345,  // Optional, uses current if not provided
  country: "it"      // Optional
}
// Returns: Array of dealer objects
```

### `select_dealer`
Select a specific dealer to work with.
```javascript
{ 
  dealerId: 67890,
  country: "it"  // Optional
}
// Returns: Confirmation with selected dealer details
```

## 🚗 Vehicle Management Tools (5)

### `search_vehicles`
Search vehicles with advanced filtering and pagination.
```javascript
{
  query: "BMW",           // Optional search term
  status: "active",       // active, sold, reserved
  page: 1,                // Page number
  limit: 20,              // Results per page
  sort: "created_desc"    // Sort order
}
```

### `get_vehicle_details`
Get complete details for a specific vehicle.
```javascript
{ vehicle_id: "abc123" }
// Returns: Full vehicle object with all data
```

### `update_vehicle`
Update vehicle information.
```javascript
{
  vehicle_id: "abc123",
  updates: {
    price: 25000,
    description: "Updated description",
    status: "reserved"
  }
}
```

### `delete_vehicle`
Remove a vehicle from inventory.
```javascript
{ vehicle_id: "abc123" }
// Returns: Deletion confirmation
```

### `get_vehicle_health`
Analyze vehicle listing health and get improvement suggestions.
```javascript
{ vehicle_id: "abc123" }
// Returns: Health score and recommendations
```

## 📸 Image Tools (6)

### `analyze_vehicle_images`
Analyze images using AI to categorize and assess quality.
```javascript
{
  images: ["path/to/image1.jpg", "path/to/image2.jpg"],
  vehicle_context: {
    brand: "BMW",
    model: "Series 3"
  }
}
```

### `upload_vehicle_images`
Upload multiple images to a vehicle listing.
```javascript
{
  vehicle_id: "abc123",
  images: [
    { path: "path/to/image.jpg", category: "exterior", position: 1 },
    { path: "path/to/image2.jpg", category: "interior", position: 2 }
  ]
}
```

### `get_vehicle_gallery`
Retrieve all images for a vehicle.
```javascript
{ vehicle_id: "abc123" }
// Returns: Array of image objects with URLs
```

### `update_image_order`
Reorder images in vehicle gallery.
```javascript
{
  vehicle_id: "abc123",
  image_order: ["img_id_1", "img_id_2", "img_id_3"]
}
```

### `delete_vehicle_image`
Remove specific image from vehicle.
```javascript
{
  vehicle_id: "abc123",
  image_id: "img_123"
}
```

### `replace_vehicle_image`
Replace an existing image with a new one.
```javascript
{
  vehicle_id: "abc123",
  image_id: "img_123",
  new_image: { path: "path/to/new.jpg", category: "exterior" }
}
```

## 🔍 Reference Data Tools (19)

### Brand Tools
- `get_all_brands` - List all available brands
- `search_brands` - Search brands by name
- `get_popular_brands` - Get most popular brands

### Model Tools
- `get_models_by_brand` - List models for a brand
- `search_models` - Search across all models
- `get_model_details` - Detailed model information

### Trim Tools
- `get_trims_by_model` - List trim levels
- `get_trim_details` - Detailed trim information
- `compare_trim_variants` - Compare trim options

### Vehicle Creation Tools
- `start_vehicle_creation` - Initialize creation workflow
- `get_trim_variants` - Get variant options
- `create_vehicle_from_trim` - Create vehicle from trim data

### Equipment Tools
- `get_standard_equipment` - Standard features by trim
- `get_optional_equipment` - Available options
- `get_equipment_packages` - Equipment packages

### Market Data Tools
- `get_fuel_types` - Available fuel types
- `get_transmissions` - Transmission types
- `get_colors` - Color options
- `get_body_types` - Body style options

## 📊 Analytics Tools (4)

### `get_performance_analytics`
Get key performance indicators for inventory.
```javascript
{
  date_range: "last_30_days",  // last_7_days, last_30_days, custom
  metrics: ["views", "leads", "conversion_rate"]
}
```

### `get_inventory_insights`
Analyze inventory composition and trends.
```javascript
{
  group_by: "brand",  // brand, model, price_range, age
  include_trends: true
}
```

### `get_pricing_recommendations`
Get AI-powered pricing suggestions.
```javascript
{
  vehicle_id: "abc123",
  market: "local",  // local, regional, national
  strategy: "competitive"  // competitive, quick_sale, maximum_profit
}
```

### `get_underperforming_vehicles`
Identify vehicles that need attention.
```javascript
{
  threshold_days: 60,  // Days in inventory
  min_price_deviation: 10  // Percentage from market
}
```

## 🌐 Publishing Tools (4)

### `configure_publications`
Set up portal configurations for publishing.
```javascript
{
  portals: [
    { name: "myportal", activation_code: "ABC123" },
    { name: "automobile_it", activation_code: "XYZ789" }
  ]
}
```

### `publish_vehicles`
Publish vehicles to configured portals.
```javascript
{
  vehicle_ids: ["abc123", "def456"],
  portals: ["myportal", "automobile_it"],
  schedule: "immediate"  // immediate or scheduled
}
```

### `get_publication_status`
Check publication status across portals.
```javascript
{
  vehicle_ids: ["abc123"],
  portals: ["myportal"]  // Optional filter
}
```

### `unpublish_vehicles`
Remove vehicles from portals.
```javascript
{
  vehicle_ids: ["abc123"],
  portals: ["myportal"],
  reason: "sold"  // sold, error, manual
}
```

## 📝 Common Patterns

### Pagination
Most list endpoints support pagination:
```javascript
{
  page: 1,      // Page number (1-based)
  limit: 20,    // Items per page
  sort: "field_asc"  // Sort order
}
```

### Error Responses
All tools return consistent error format:
```javascript
{
  error: {
    message: "User-friendly error message",
    code: "ERROR_CODE",
    details: { /* Additional context */ }
  }
}
```

### Date Formats
- ISO 8601 format: `2024-01-15T10:30:00Z`
- Date ranges: `last_7_days`, `last_30_days`, `custom`

### Status Values
- Vehicles: `active`, `reserved`, `sold`, `draft`
- Publications: `pending`, `published`, `failed`, `removed`
- Images: `processing`, `ready`, `error`

## 🔧 Best Practices

1. **Use Reference Data** - Always use reference data tools for accurate brand/model/trim information
2. **Bulk Operations** - Use bulk endpoints when handling multiple items
3. **Error Handling** - Check error responses and handle appropriately
4. **Image Optimization** - Images are automatically optimized, no pre-processing needed
5. **Pagination** - Use pagination for large result sets to improve performance
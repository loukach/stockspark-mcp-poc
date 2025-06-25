# StockSpark MCP API Reference

Quick reference guide for all 36 MCP tools available in StockSpark MCP Server.

## 📊 Current Tool Overview

### Tool Categories & Counts
- 🏢 **Organization Management**: 5 tools
- 🔍 **Vehicle Reference Data**: 10 tools (consolidated from 17)
- 🚗 **Vehicle Management**: 6 tools (added delete functionality)
- 📸 **Image Operations**: 4 tools (consolidated from multiple tools)
- 📊 **Analytics & Intelligence**: 4 tools
- 👥 **Leads Management**: 2 tools
- 🌐 **Multi-Channel Publishing**: 4 tools
- 📈 **Performance Analytics**: 1 tool

**Total: 36 tools** (reduced from 41 through consolidation)

## 🚀 Recent Updates

### ✅ Major Consolidation Completed
- **Tool Reduction**: 41 → 36 tools (12% reduction)
- **Reference Tools**: Streamlined from 17 to 10 tools
- **Naming Consistency**: All tools follow `category_action` pattern
- **Terminology Fix**: Replaced "trims" with "versions" throughout

### ✅ New Features Added
- **Vehicle Deletion**: Secure deletion with confirmation (`delete_vehicle`)
- **Enhanced Filtering**: Advanced sorting and filtering for `list_vehicles`
- **Color Updates**: Fixed and enhanced vehicle color update functionality

### ✅ Issues Resolved
- Vehicle list sorting and filtering
- Date field mapping (creation date vs stock date)
- Vehicle color update failures
- Tool naming inconsistencies

## 🔧 Key Tool Groups

### Vehicle Management Core
- `add_vehicle` - Create vehicles with template or basic data
- `get_vehicle` - Get complete vehicle details
- `list_vehicles` - List with advanced filtering/sorting
- `update_vehicle` - Update any vehicle attribute
- `update_vehicle_price` - Specific price updates
- `delete_vehicle` - **NEW**: Secure vehicle deletion

### Enhanced Vehicle Creation Workflow
1. `search_vehicle_versions` - Find vehicle specifications
2. `get_vehicle_version_template` - Get complete template data  
3. `add_vehicle` - Create with template + user overrides

### Reference Data (Consolidated)
- `get_vehicle_makes` - Get all vehicle makes
- `get_vehicle_models` - Get models for a make
- `get_vehicle_versions` - Get versions for a model
- `get_vehicle_colors` - Get available colors
- `get_vehicle_fuels` - Get fuel types
- `get_vehicle_transmissions` - Get transmission types
- `get_vehicle_bodies` - Get body types
- `get_vehicle_categories` - Get vehicle categories
- `get_vehicle_equipment` - Get equipment options
- `compare_vehicle_versions` - Compare multiple versions

### Image Operations (Unified)
- `upload_vehicle_images` - **Unified**: Handles files and URLs
- `analyze_vehicle_images` - AI-powered image analysis
- `get_vehicle_images` - List vehicle images
- `set_vehicle_main_image` - Set main image

## 📚 Detailed Documentation

For complete API documentation, parameter schemas, and usage examples:

- **[README.md](../README.md)** - Complete tool list with descriptions
- **[CLAUDE.md](../CLAUDE.md)** - AI agent guide with examples
- **[COLOR_UPDATE_GUIDE.md](COLOR_UPDATE_GUIDE.md)** - Color update documentation
- **[DELETE_VEHICLE_GUIDE.md](DELETE_VEHICLE_GUIDE.md)** - Vehicle deletion guide
- **[IMAGE_UPLOAD_GUIDE.md](IMAGE_UPLOAD_GUIDE.md)** - Image upload documentation

## 🎯 Common Workflows

### 1. Create Vehicle (Template Mode)
```javascript
// 1. Search for specifications
search_vehicle_versions({ make: "BMW", model: "320i" })

// 2. Get template for chosen version
get_vehicle_version_template({ providerCode: "trim-id-from-search" })

// 3. Create vehicle with overrides
add_vehicle({
  template: template,
  userOverrides: { price: 35000, condition: "NEW" }
})
```

### 2. Upload and Manage Images
```javascript
// Upload images
upload_vehicle_images({
  vehicleId: 12345,
  images: ["path/to/image1.jpg", "path/to/image2.jpg"]
})

// Set main image
set_vehicle_main_image({ vehicleId: 12345, imageId: "img-id" })
```

### 3. Update Vehicle Details
```javascript
// Update color (automatic colorBase handling)
update_vehicle({
  vehicleId: 12345,
  updates: { color: "Rosso" }
})

// Update price
update_vehicle_price({ vehicleId: 12345, newPrice: 25000 })
```

### 4. Advanced Vehicle Search
```javascript
// List with sorting and filtering
list_vehicles({
  sort: "creationDate:desc",
  make: "Mercedes-Benz",
  vehicleType: "USED",
  maxPrice: 50000
})
```

### 5. Secure Vehicle Deletion
```javascript
// Two-step confirmation required
delete_vehicle({ vehicleId: 12345, confirm: true })
```

## 🔍 Finding Specific Tools

Use the MCP server's built-in tool discovery:
```bash
# List all available tools
mcp list-tools

# Get tool schema
mcp describe-tool <tool_name>
```

## 📋 Legacy Tool Mapping

### Removed/Consolidated Tools
- ~~`get_available_makes`~~ → Use `get_vehicle_makes`
- ~~`get_available_models`~~ → Use `get_vehicle_models`
- ~~`start_vehicle_creation`~~ → Use `search_vehicle_versions`
- ~~`create_vehicle_from_trim`~~ → Use `add_vehicle` with template
- ~~`upload_vehicle_images_claude`~~ → Use `upload_vehicle_images`
- ~~`upload_vehicle_images_from_data`~~ → Use `upload_vehicle_images`

### Renamed Tools
- `search_vehicle_specs` → `search_vehicle_versions`
- `compare_vehicle_options` → `compare_vehicle_versions`
- `get_vehicle_template` → `get_vehicle_version_template`
- `set_main_image` → `set_vehicle_main_image`
- `get_transmission_types` → `get_vehicle_transmissions`

## 🎉 Project Status

✅ **Production Ready**: All 36 tools are fully functional  
✅ **Well Tested**: 8/8 test suites passing (100%)  
✅ **Clean Architecture**: Organized, consolidated, and documented  
✅ **User Friendly**: Consistent naming and comprehensive guides  

For the latest updates and issue tracking, see [KNOWN_ISSUES.md](../KNOWN_ISSUES.md).
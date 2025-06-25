# StockSpark MCP - AI Agent Guide

## 🎯 Project Overview
StockSpark MCP is a Model Context Protocol server that provides AI agents with 36 specialized tools to manage vehicle dealerships, including advanced lead analytics and customer inquiry tracking. This guide helps AI agents understand the codebase and work effectively with it.

**Recent Update**: Major tool consolidation completed - reduced from 41 to 36 tools (15% reduction). Reference tools consolidated from 17 to 10, added vehicle deletion, and fixed critical issues.

## 🏗️ Project Structure

```
stockspark-mcp-poc/
├── src/
│   ├── index.js              # Main MCP server entry point
│   ├── auth.js               # OAuth2 authentication handling
│   ├── api/                  # API client modules
│   │   ├── client.js         # Base HTTP client with auth
│   │   ├── vehicles.js       # Vehicle CRUD operations
│   │   ├── images.js         # Image upload and management
│   │   ├── reference.js      # Reference data (brands, models)
│   │   ├── publications.js   # Multi-channel publishing
│   │   ├── organization.js   # Company/dealer management
│   │   └── leads.js          # Customer leads and inquiries
│   ├── tools/                # MCP tool implementations
│   │   ├── vehicle-tools.js         # Vehicle management (6 tools)
│   │   ├── image-tools.js           # Image operations (4 tools)
│   │   ├── reference-tools.js       # Reference data (10 tools)
│   │   ├── organization-tools.js    # Organization (5 tools)
│   │   ├── analytics-tools.js       # Analytics (4 tools)
│   │   ├── leads-tools.js           # Lead analysis (2 tools)
│   │   ├── publish-tools.js         # Publishing (4 tools)
│   │   └── performance-tools.js     # Performance analytics (1 tool)
│   └── utils/                # Utility functions
│       ├── errors.js         # Error handling
│       ├── logger.js         # Logging configuration
│       ├── mappers.js        # Data transformation
│       └── temp-files.js     # Temporary file management
├── tests/                    # Test suites
├── docs/                     # Documentation
└── package.json             # Dependencies and scripts
```

## 🛠️ Working with the Codebase

### Key Files to Understand

1. **src/index.js** - MCP server setup, tool registration
2. **src/auth.js** - OAuth2 token management (auto-refresh)
3. **src/api/client.js** - HTTP client with retry logic
4. **src/tools/*.js** - Tool implementations grouped by domain

### Important Patterns

1. **Tool Structure**: Each tool follows this pattern:
   ```javascript
   {
     name: "tool_name",
     description: "What it does",
     inputSchema: { /* JSON schema */ },
     handler: async (params) => { /* implementation */ }
   }
   ```

2. **Error Handling**: All errors are wrapped in user-friendly messages:
   ```javascript
   throw new ApiError('User-friendly message', statusCode, details);
   ```

3. **API Calls**: Use the authenticated client:
   ```javascript
   const response = await makeApiRequest('/endpoint', { method: 'POST', body: data });
   ```

## 📋 Development Guidelines

### When Adding New Features

1. **Follow existing patterns** - Check similar tools for implementation examples
2. **Use existing utilities** - Don't reinvent error handling, logging, etc.
3. **Test first** - Run `npm test` before making changes
4. **Validate inputs** - Use JSON schema for all tool parameters
5. **Handle errors gracefully** - Always provide helpful error messages

### Code Style

- Use async/await for all asynchronous operations
- Keep functions focused and small
- Use descriptive variable names
- Add JSDoc comments for complex functions
- Follow existing file organization patterns

### Testing

Run tests with: `npm test`
- Unit tests: `tests/unit/`
- Integration tests: `tests/integration/`
- Workflow tests: `tests/workflows/`

### Common Tasks

1. **Add a new tool**: Add to appropriate `tools/*.js` file
2. **Modify API calls**: Update in `api/*.js` modules
3. **Change error messages**: Update in tool handlers
4. **Add logging**: Use `logger.info()`, `logger.error()`, etc.
5. **Handle new API endpoints**: Add to relevant API module

## 🔑 Environment Variables

Required in `.env`:
- `STOCKSPARK_USERNAME` - API username
- `STOCKSPARK_PASSWORD` - API password
- `STOCKSPARK_CLIENT_ID` - OAuth client ID
- `STOCKSPARK_AUTH_URL` - Auth endpoint
- `STOCKSPARK_API_URL` - API base URL

Optional:
- `LOG_LEVEL` - Logging verbosity (debug/info/warn/error)
- `MYPORTAL_ACTIVATION_CODE` - For MyPortal publishing
- `AUTOMOBILE_IT_ACTIVATION_CODE` - For Automobile.it publishing
- `STOCKSPARK_API_KEY` - For leads API access (enables customer inquiry tracking)

## 🚨 Important Notes

1. **Authentication**: OAuth2 tokens auto-refresh - don't manually handle
2. **Rate Limiting**: API has rate limits - client handles retries
3. **Image Uploads**: Use bulk upload for multiple images (more efficient)
4. **Multi-tenancy**: Tools auto-detect company/dealer from auth
5. **Error Recovery**: All tools have built-in retry logic

## 📚 Documentation Map

- **README.md** - User-facing documentation, setup guide
- **CLAUDE.md** - This file, AI agent guide
- **docs/specs/** - Detailed API specifications
- **docs/*.md** - Topic-specific guides
- **tests/README.md** - Testing documentation

## 🎯 Common Workflows

1. **Create a vehicle** (NEW SIMPLIFIED WORKFLOW): 
   - `search_vehicle_specs` → `get_vehicle_template` → `add_vehicle`

2. **Upload images**:
   - `analyze_vehicle_images` → `upload_vehicle_images`

3. **Publish vehicle**:
   - `configure_publications` → `publish_vehicles` → `get_publication_status`

4. **Analyze performance**:
   - `get_performance_analytics` → `get_underperforming_vehicles`

5. **Enhanced vehicle search and filtering**:
   - `list_vehicles` with sorting: `{"sort": "creationDate:desc"}` 
   - `list_vehicles` with make/model: `{"make": "Mercedes-Benz", "model": "Classe S"}`
   - `list_vehicles` with conditions: `{"vehicleType": "USED", "kmMax": 50000}`

6. **Image upload workflow**:
   - For files/URLs: `upload_vehicle_images` directly
   - For all image types: Use `upload_vehicle_images` (handles files, URLs, and MCP resources)

7. **Lead analysis** (NEW):
   - `get_vehicle_leads` → `analyze_lead_trends` → correlate with vehicle performance

8. **Enhanced analytics with leads**:
   - `get_underperforming_vehicles` (now includes lead metrics automatically)

## 🚀 NEW: Simplified Vehicle Creation Workflow

The vehicle creation process has been simplified to 3 clear steps:

⚠️ **IMPORTANT**: When multiple trim options are found, NEVER automatically select one. 
Always ask the user to choose their preferred trim level, engine size, features, or price range.

### 1. Search for Specifications
```javascript
// Progressive search - adapts to your input level
await search_vehicle_specs(); // Returns all makes
await search_vehicle_specs({ make: "BMW" }); // Returns BMW models  
await search_vehicle_specs({ make: "BMW", model: "320i" }); // Returns trims
```

### 2. Get Vehicle Template
```javascript
// Get complete vehicle data from chosen trim ID
const template = await get_vehicle_template({ 
  providerCode: "trim-id-from-search-results" 
});
```

### 3. Create Vehicle
```javascript
// Template mode (PREFERRED) - includes complete technical specs
await add_vehicle({
  template: template.template,
  userOverrides: {
    price: 35000,
    condition: "NEW",
    mileage: 0  // if USED
  }
});

// Basic mode (FALLBACK) - when no template available
await add_vehicle({
  basicData: {
    make: "Fiat",
    model: "500", 
    year: 2023,
    price: 15000,
    fuel: "PETROL",
    transmission: "MANUAL",
    condition: "NEW"
  }
});
```

### Benefits of New Workflow
- **Simpler**: 3 tools instead of 5
- **Progressive**: Search adapts to input detail level
- **Clear separation**: Search → Template → Create
- **Complete data**: Template mode includes full technical specs
- **Fallback option**: Basic mode when reference data unavailable

## 🐛 Debugging Tips

1. Check logs in console output
2. Verify `.env` credentials are correct
3. Use `LOG_LEVEL=debug` for verbose output
4. Test individual tools before complex workflows
5. Check `KNOWN_ISSUES.md` for common problems

## 💡 Best Practices

1. **Batch Operations**: Use bulk endpoints when available
2. **Reference Data**: Cache brand/model lookups when possible
3. **Image Optimization**: Images are auto-optimized, no pre-processing needed
4. **Error Messages**: Always provide context in error responses
5. **Tool Naming**: Follow existing `category_action` pattern

## 🔄 Maintenance Tasks

- Run tests before commits: `npm test`
- Update dependencies: `npm update`
- Check for security issues: `npm audit`
- Format code consistently
- Keep documentation in sync with code changes

## 🚧 Known Issues & Next Steps

### **✅ Recently Resolved Issues**

1. **Vehicle List Sorting and Enhanced Filtering** ✅ **FIXED**
   - **Was**: `list_vehicles` tool lacked sorting and comprehensive filtering
   - **Now**: Full sorting (`creationDate:desc`, `price:asc`, etc.) and enhanced filtering
   - **Added**: Smart make/model name-to-ID resolution with direct API parameters
   - **Result**: Efficient inventory management with proper API parameter usage

2. **Date Field Mapping Issue** ✅ **FIXED**
   - **Was**: Exposing `enteredInStockDate` instead of `creationDate` in vehicle data
   - **Now**: Vehicle responses include proper `creationDate` field showing when vehicle was added
   - **Fixed**: Performance analysis now uses creation date for accurate days-in-stock calculations
   - **Result**: Proper temporal tracking for vehicle lifecycle analytics

3. **Vehicle Color Updates Failing** ✅ **FIXED**
   - **Was**: Color updates failed due to inconsistent `color` and `colorBase` fields
   - **Now**: Automatic lookup and synchronization of both color fields
   - **Added**: Case-insensitive matching and comprehensive error handling
   - **Result**: Reliable color updates with user-friendly guidance

4. **Tool Naming and Terminology** ✅ **FIXED**
   - **Was**: Inconsistent naming patterns and incorrect "trim" terminology
   - **Now**: All tools follow `category_action` pattern, "versions" instead of "trims"
   - **Added**: Consistent MCP best practices across all 36 tools
   - **Result**: Clear, professional tool interface

5. **Vehicle Deletion Feature** ✅ **ADDED**
   - **New**: Secure vehicle deletion with two-step confirmation
   - **Safety**: Explicit confirmation required to prevent accidents
   - **Complete**: Error handling, documentation, and integration
   - **Result**: Full vehicle lifecycle management capability

### **High Priority Fixes Still Needed**

1. **Auto-Main Image Not Working**
   - **Problem**: First uploaded image not being set as main image automatically
   - **Impact**: Vehicles have no main image despite having images
   - **Fix**: Debug and fix the auto-main image logic in upload handlers

2. **hasImages Flag Always False**
   - **Problem**: `hasImages` field in `list_vehicles` response always shows false
   - **Impact**: Cannot filter vehicles that need images vs those that have them
   - **Fix**: Update vehicle list response to correctly calculate `hasImages`

### **When Working on Remaining Issues**
- Focus on the API response mapping in `src/utils/mappers.js`
- Check the vehicle list logic in `src/api/vehicles.js` 
- Verify image upload logic in `src/api/images.js`
- Test changes with existing test suite in `tests/`

### **Enhanced Vehicle Filtering Implementation Details**
The `list_vehicles` tool now supports:
- **Sorting**: `sort: "creationDate:desc"` → API: `?sort=creationDate;desc`
- **Make/Model**: Auto-resolves names to IDs → API: `?make=6&model=393`
- **Other Filters**: `vehicleType`, `kmMin/Max`, `numberPlate` → API: `?filter=...`

## 🏗️ Tool Consolidation Achievements

### **Before: 41 Tools → After: 36 Tools (12% Reduction)**

The MCP server has been successfully consolidated by removing duplicate and legacy tools while maintaining full functionality.

### **1. Image Upload Consolidation (COMPLETED)**
**Was**: 3 confusing tools
- ~~`upload_vehicle_images_claude`~~ (removed)
- `upload_vehicle_images` (kept)
- ~~`upload_vehicle_images_from_data`~~ (removed)

**Now**: Single `upload_vehicle_images` tool
- Handles file paths and URLs only
- Auto-detects input type
- Reduced confusion and code by ~400 lines

### **2. Reference Data Consolidation (COMPLETED)**
**Was**: 7 duplicate/redundant tools
- ~~`get_available_makes`~~ (removed - use `get_vehicle_makes`)
- ~~`get_available_models`~~ (removed - use `get_vehicle_models`)
- ~~`get_fuel_types`~~ (removed - use `get_vehicle_fuels`)
- ~~`start_vehicle_creation`~~ (removed - use `search_vehicle_versions`)
- ~~`create_vehicle_from_trim`~~ (removed - use `add_vehicle` template mode)
- ~~`find_models_by_make`~~ (removed - use `get_vehicle_makes` → `get_vehicle_models`)
- ~~`search_reference_data`~~ (removed - use specific get_* tools for each data type)

**Now**: Streamlined reference tools (17 → 10 tools)
- Single modern navigation API tools
- Removed legacy reference API duplicates
- Cleaner naming conventions and workflows

### **Achieved Benefits**
- **12% tool reduction** (41 → 36 tools)
- **Improved user experience** - less confusion between duplicate/overlapping tools
- **Cleaner codebase** - removed ~700 lines of redundant code
- **Better maintenance** - single purpose tools with clear responsibilities
- **Proper validation flow** - encourages using exact reference values

### **Remaining Opportunities**
Further consolidation possible by:
- Combining overlapping vehicle search tools
- Streamlining analytics tool groupings
- Additional workflow optimizations

Target: 36 → ~30 tools (20% total reduction)
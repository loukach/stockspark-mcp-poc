# StockSpark MCP Code Structure Guide

This document provides a detailed overview of the codebase structure, architecture patterns, and implementation details.

## 📁 Directory Structure

```
stockspark-mcp-poc/
├── src/                      # Source code
│   ├── index.js             # MCP server entry point
│   ├── auth.js              # OAuth2 authentication
│   ├── api/                 # API client modules
│   ├── tools/               # MCP tool implementations
│   └── utils/               # Utility functions
├── tests/                   # Test suites
├── docs/                    # Documentation
└── config files            # .env, package.json, etc.
```

## 🏛️ Architecture Overview

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                        MCP Server                            │
│                      (src/index.js)                          │
├─────────────────────────────────────────────────────────────┤
│                    Tool Registry                             │
│              (41 tools across 6 categories)                  │
├─────────────────────────────────────────────────────────────┤
│                   API Client Layer                           │
│                   (src/api/*.js)                             │
├─────────────────────────────────────────────────────────────┤
│                 Authentication Layer                         │
│                    (src/auth.js)                             │
├─────────────────────────────────────────────────────────────┤
│                  Utility Functions                           │
│                  (src/utils/*.js)                            │
└─────────────────────────────────────────────────────────────┘
```

## 📄 File Descriptions

### Core Files

#### `src/index.js`
- **Purpose**: MCP server initialization and tool registration
- **Key Functions**:
  - Sets up MCP server instance
  - Registers all 41 tools
  - Handles server lifecycle
  - Configures error handling

#### `src/auth.js`
- **Purpose**: OAuth2 authentication with automatic token refresh
- **Key Functions**:
  - `getAccessToken()` - Retrieves valid access token
  - `refreshAccessToken()` - Handles token refresh
  - Token caching and expiry management
  - Company/dealer ID extraction from auth response

### API Client Modules (`src/api/`)

#### `client.js`
- **Purpose**: Base HTTP client with authentication and retry logic
- **Key Functions**:
  - `makeApiRequest()` - Authenticated API calls
  - Automatic retry on 401/429/5xx errors
  - Request/response logging
  - Error standardization

#### `vehicles.js`
- **Endpoints**: Vehicle CRUD operations
- **Key Methods**:
  - `searchVehicles()` - Advanced search with filters
  - `getVehicle()` - Retrieve single vehicle
  - `createVehicle()` - Create from trim data
  - `updateVehicle()` - Update vehicle details
  - `deleteVehicle()` - Remove vehicle

#### `images.js`
- **Endpoints**: Image upload and management
- **Key Methods**:
  - `uploadImages()` - Bulk image upload
  - `analyzeImages()` - AI image analysis
  - `getGallery()` - Retrieve image gallery
  - `updateImageOrder()` - Reorder images
  - Supports both file paths and base64

#### `reference.js`
- **Endpoints**: Reference data for vehicle creation
- **Key Methods**:
  - `getBrands()` - List all brands
  - `getModels()` - Models by brand
  - `getTrims()` - Trim levels
  - `getVariants()` - Trim variants
  - `getEquipment()` - Available equipment

#### `publications.js`
- **Endpoints**: Multi-channel publishing
- **Key Methods**:
  - `configurePublications()` - Set portal configs
  - `publishVehicles()` - Publish to channels
  - `getPublicationStatus()` - Check status
  - `unpublishVehicles()` - Remove from channels

#### `organization.js`
- **Endpoints**: Company and dealer management
- **Key Methods**:
  - `getCompanyInfo()` - Company details
  - `listDealers()` - All dealers
  - `getDealerInfo()` - Single dealer
  - `switchDealer()` - Change context

### Tool Implementations (`src/tools/`)

#### Tool Structure Pattern
```javascript
module.exports = {
  name: "tool_name",
  description: "Clear description of what the tool does",
  inputSchema: {
    type: "object",
    properties: {
      // JSON Schema validation
    },
    required: ["field1", "field2"]
  },
  handler: async (params) => {
    try {
      // Input validation
      // API call(s)
      // Data transformation
      // Return formatted response
    } catch (error) {
      // Error handling with context
    }
  }
};
```

#### `vehicle-tools.js` (5 tools)
- `search_vehicles` - Advanced vehicle search
- `get_vehicle_details` - Single vehicle info
- `update_vehicle` - Modify vehicle data
- `delete_vehicle` - Remove vehicle
- `get_vehicle_health` - Health score analysis

#### `image-tools.js` (6 tools)
- `analyze_vehicle_images` - AI image analysis
- `upload_vehicle_images` - Bulk upload
- `get_vehicle_gallery` - Retrieve images
- `update_image_order` - Reorder gallery
- `delete_vehicle_image` - Remove image
- `replace_vehicle_image` - Update image

#### `reference-tools.js` (19 tools)
- Brand/Model/Trim navigation tools
- Equipment and option lookups
- Market-specific reference data
- Vehicle creation workflow tools

#### `organization-tools.js` (5 tools)
- `get_current_organization` - Active context
- `list_all_dealers` - Available dealers
- `get_dealer_info` - Dealer details
- `switch_active_dealer` - Change context
- `get_organization_settings` - Config data

#### `analytics-tools.js` (4 tools)
- `get_performance_analytics` - KPIs
- `get_inventory_insights` - Stock analysis
- `get_pricing_recommendations` - AI pricing
- `get_underperforming_vehicles` - Issues

#### `publish-tools.js` (4 tools)
- `configure_publications` - Portal setup
- `publish_vehicles` - Multi-channel
- `get_publication_status` - Check status
- `unpublish_vehicles` - Remove listings

### Utility Functions (`src/utils/`)

#### `errors.js`
- **Purpose**: Standardized error handling
- **Classes**:
  - `ApiError` - Base error class
  - `ValidationError` - Input validation
  - `AuthenticationError` - Auth failures
- **Helper Functions**:
  - `formatApiError()` - User-friendly messages
  - `isRetryableError()` - Retry logic

#### `logger.js`
- **Purpose**: Structured logging
- **Features**:
  - JSON formatted logs
  - Log levels (debug/info/warn/error)
  - Request/response logging
  - Performance tracking

#### `mappers.js`
- **Purpose**: Data transformation utilities
- **Functions**:
  - `mapVehicleResponse()` - API to tool format
  - `mapTrimToVehicle()` - Trim to vehicle data
  - `formatPrice()` - Price formatting
  - `normalizeImageData()` - Image standardization

#### `temp-files.js`
- **Purpose**: Temporary file management
- **Functions**:
  - `downloadToTemp()` - URL to temp file
  - `cleanupTempFiles()` - Remove old files
  - `getTempFilePath()` - Generate paths
  - Auto-cleanup on process exit

## 🔄 Request Flow

1. **Tool Invocation**
   ```
   AI Agent → MCP Server → Tool Handler
   ```

2. **API Request Flow**
   ```
   Tool Handler → Auth Check → API Client → StockSpark API
   ```

3. **Response Flow**
   ```
   API Response → Data Mapper → Tool Response → AI Agent
   ```

## 🛡️ Error Handling Strategy

### Error Hierarchy
1. **Network Errors** → Retry with backoff
2. **Auth Errors** → Refresh token and retry
3. **Validation Errors** → Return helpful message
4. **API Errors** → Format user-friendly response
5. **Unknown Errors** → Log and generic message

### Retry Logic
```javascript
// Retryable status codes
[401, 429, 500, 502, 503, 504]

// Retry strategy
- Max attempts: 3
- Backoff: Exponential (1s, 2s, 4s)
- 401: Refresh token before retry
- 429: Honor rate limit headers
```

## 🔐 Authentication Flow

```
1. Initial Authentication
   → POST /auth/token with credentials
   → Receive access_token + refresh_token
   → Extract company_id and dealer_id

2. Token Management
   → Cache token in memory
   → Check expiry before each request
   → Auto-refresh when expired

3. Request Authentication
   → Add "Authorization: Bearer {token}"
   → Include company/dealer in headers
```

## 📊 Performance Considerations

### Optimizations
1. **Token Caching** - Avoid unnecessary auth calls
2. **Bulk Operations** - Use batch endpoints
3. **Parallel Requests** - When independent
4. **Response Caching** - For reference data
5. **Stream Processing** - For large datasets

### Resource Management
- Temp file cleanup after operations
- Memory-efficient image handling
- Connection pooling for HTTP
- Graceful shutdown handlers

## 🧪 Testing Strategy

### Test Categories
1. **Unit Tests** (`tests/unit/`)
   - Individual function testing
   - Mock external dependencies
   - Error case coverage

2. **Integration Tests** (`tests/integration/`)
   - Real API calls (test environment)
   - End-to-end tool testing
   - Auth flow validation

3. **Workflow Tests** (`tests/workflows/`)
   - Multi-tool sequences
   - Business process validation
   - Performance benchmarks

## 🚀 Adding New Features

### Adding a New Tool
1. Choose appropriate tool file in `src/tools/`
2. Follow existing tool structure pattern
3. Add comprehensive input validation
4. Implement error handling
5. Add tests in corresponding test file
6. Update tool count in documentation

### Adding New API Endpoint
1. Add method to appropriate `src/api/*.js` file
2. Follow existing error handling patterns
3. Add data mapper if needed
4. Create corresponding tool(s)
5. Add integration tests

### Best Practices
- Keep functions focused and small
- Use descriptive names
- Add JSDoc comments for complex logic
- Handle all error cases explicitly
- Log important operations
- Write tests for new functionality
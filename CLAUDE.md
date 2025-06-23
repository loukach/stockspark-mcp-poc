# StockSpark MCP - AI Agent Guide

## 🎯 Project Overview
StockSpark MCP is a Model Context Protocol server that provides AI agents with 43 specialized tools to manage vehicle dealerships, including advanced lead analytics and customer inquiry tracking. This guide helps AI agents understand the codebase and work effectively with it.

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
│   │   ├── vehicle-tools.js         # Vehicle management (5 tools)
│   │   ├── image-tools.js           # Image operations (6 tools)
│   │   ├── reference-tools.js       # Reference data (19 tools)
│   │   ├── organization-tools.js    # Organization (5 tools)
│   │   ├── analytics-tools.js       # Analytics (4 tools)
│   │   ├── leads-tools.js           # Lead analysis (2 tools)
│   │   └── publish-tools.js         # Publishing (4 tools)
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

1. **Create a vehicle**: 
   - `start_vehicle_creation` → `compare_trim_variants` → `create_vehicle_from_trim`

2. **Upload images**:
   - `analyze_vehicle_images` → `upload_vehicle_images`

3. **Publish vehicle**:
   - `configure_publications` → `publish_vehicles` → `get_publication_status`

4. **Analyze performance**:
   - `get_performance_analytics` → `get_underperforming_vehicles`

5. **Lead analysis** (NEW):
   - `get_vehicle_leads` → `analyze_lead_trends` → correlate with vehicle performance

6. **Enhanced analytics with leads**:
   - `get_underperforming_vehicles` (now includes lead metrics automatically)

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
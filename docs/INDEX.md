# StockSpark MCP Documentation Index

This index provides a comprehensive overview of all documentation available for the StockSpark MCP project.

## 📚 Core Documentation

### Getting Started
- **[README.md](../README.md)** - Project overview, setup instructions, and quick start guide
- **[CLAUDE.md](../CLAUDE.md)** - AI agent guide for working with the codebase
- **[CLAUDE_DESKTOP_CONFIG_GUIDE.md](../CLAUDE_DESKTOP_CONFIG_GUIDE.md)** - Detailed Claude Desktop configuration

### API & Tools
- **[Tools Overview](../README.md#-available-tools)** - Complete list of 41 available MCP tools
- **[API Swagger Documentation](carspark-api-swagger.json)** - Full Carspark API specification
- **[Example API Response](example-carspark-api-get-vehicle-response_1749481980272.json)** - Sample vehicle data structure

## 🔧 Technical Guides

### Performance & Optimization
- **[IMAGE_UPLOAD_GUIDE.md](IMAGE_UPLOAD_GUIDE.md)** - Comprehensive image upload guide with all methods
- **[MCP_TOOL_PRIORITIZATION.md](MCP_TOOL_PRIORITIZATION.md)** - Tool priority system explanation

### Development & Testing
- **[Test Documentation](../tests/README.md)** - Testing guide and structure
- **[FUTURE_ENHANCEMENTS.md](../FUTURE_ENHANCEMENTS.md)** - Planned features and improvements

## 📋 Specifications

### Version 1
- **[StockSpark MCP Spec v1](specs/v1/stockspark-mcp-spec.md)** - Initial MCP specification

### Version 2
- **[Vehicle Creation Spec v2](specs/v2/vehicle-creation-mcp-spec.md)** - Enhanced vehicle creation workflow
- **[Vehicle Creation Examples](specs/v2/vehicle-creation-mcp-spec-examples-and-diagrams.md)** - Detailed examples and diagrams

## 🎯 Workflow Documentation

### Image Management
- **[IMAGE_UPLOAD_GUIDE.md](IMAGE_UPLOAD_GUIDE.md)** - Complete image upload guide with examples

### Remote Integration
- **[REMOTE_MCP_CLAUDE_DESKTOP_PLAN.md](REMOTE_MCP_CLAUDE_DESKTOP_PLAN.md)** - Remote MCP server setup

## 📊 Project Status
- **[FUTURE_ENHANCEMENTS.md](../FUTURE_ENHANCEMENTS.md)** - Roadmap and planned features

## 🧪 Test Images
- **[Test Images Directory](test-images/)** - Sample images for testing
  - `citroen-aircross-image.png`
  - `kona1.jpg`, `kona2.jpg`, `kona3.jpg`

## 📝 Quick Reference

### Environment Variables
```bash
STOCKSPARK_USERNAME      # Required: API username
STOCKSPARK_PASSWORD      # Required: API password  
STOCKSPARK_CLIENT_ID     # Required: OAuth client ID
STOCKSPARK_AUTH_URL      # Required: Auth endpoint
STOCKSPARK_API_URL       # Required: API base URL
LOG_LEVEL               # Optional: Logging level
```

### Key Commands
```bash
npm install             # Install dependencies
npm test               # Run all tests
npm start              # Start MCP server
```

### Tool Categories
1. **Organization Management** (5 tools)
2. **Vehicle Reference Data** (19 tools)
3. **Vehicle Management** (5 tools)
4. **Image Operations** (6 tools)
5. **Analytics & Intelligence** (4 tools)
6. **Multi-Channel Publishing** (4 tools)

## 🔍 Finding Information

- **Setup Issues?** → Check [KNOWN_ISSUES.md](../KNOWN_ISSUES.md)
- **API Questions?** → See [API Swagger](carspark-api-swagger.json)
- **Tool Usage?** → Read [README.md](../README.md#-available-tools)
- **Testing?** → Visit [tests/README.md](../tests/README.md)
- **Performance?** → Review [Performance Guides](#performance--optimization)
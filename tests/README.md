# StockSpark MCP Test Suite

Organized test structure for the StockSpark MCP server with centralized configuration and reusable utilities.

## Directory Structure

```
tests/
├── config/
│   └── test-config.js          # Centralized test configuration and utilities
├── unit/
│   ├── test-connection.js      # API connectivity tests
│   ├── test-vehicle-creation.js # Basic vehicle creation tests
│   ├── test-image-tools.js     # Image management tests (NEW)
│   ├── test-analytics-tools.js # Business intelligence tests (NEW)
│   ├── test-publishing-tools.js # Portal publishing tests (NEW)
│   └── test-reference-navigation.js # Vehicle reference data tests (NEW)
├── integration/
│   └── test-mcp-tools.js       # MCP tool integration tests
├── workflows/
│   └── test-complete-vehicle-creation.js # End-to-end workflow tests
├── run-all-tests.js            # Test runner
└── README.md                   # This file
```

## Quick Start

### Run All Tests
```bash
node tests/run-all-tests.js
```

### Run Specific Test Categories
```bash
# Core unit tests
npm run test:unit

# All unit tests (including new feature tests)
npm run test:unit:all

# Feature-specific unit tests
npm run test:features

# Individual feature tests
node tests/unit/test-image-tools.js
node tests/unit/test-analytics-tools.js
node tests/unit/test-publishing-tools.js
node tests/unit/test-reference-navigation.js

# Integration tests
npm run test:integration

# Workflow tests
npm run test:workflows
```

### Run with Verbose Output
```bash
node tests/run-all-tests.js --verbose
```

## Test Configuration

All tests use centralized configuration from `config/test-config.js`:

- **Environment Setup**: Authentication, API URLs, company/dealer IDs
- **Test Data**: Reusable test vehicles and payloads
- **Utilities**: Common functions for API clients, result formatting, etc.

## Test Categories

### Unit Tests
- **Connection**: Basic API authentication and connectivity
- **Vehicle Creation**: Direct API vehicle creation with known payloads
- **Image Management**: Upload, delete, set main image, and gallery operations
- **Analytics & Intelligence**: Performance analysis, pricing recommendations, inventory health
- **Publishing Tools**: Portal publishing, status checking, and publication management
- **Vehicle Reference Data**: Vehicle discovery, make/model search, trim comparison

### Integration Tests  
- **MCP Tools**: Testing MCP server tools end-to-end
- **Tool Interactions**: How tools work together

### Workflow Tests
- **Complete Vehicle Creation**: Full user workflow simulation
- **Edge Cases**: Error handling and validation

## Test Data

Common test data is defined in `test-config.js`:

- **Mercedes S 500 2021**: Complete test vehicle with known working trim ID
- **Working Vehicle Payload**: Validated payload that successfully creates vehicles
- **Test Utilities**: Helper functions for unique data generation

## Benefits of New Structure

1. **No Duplication**: Common setup code shared across all tests
2. **Centralized Configuration**: Easy to update credentials or test data
3. **Organized by Purpose**: Unit → Integration → Workflows
4. **Reusable Utilities**: Standard formatting and helper functions
5. **Single Entry Point**: `run-all-tests.js` executes everything
6. **Easy Maintenance**: Clear separation of concerns

## Legacy Tests

The old test files in the root directory can be removed after verifying the new structure works:

```bash
# Old files that can be cleaned up:
test-*.js
debug-*.js
simulate-*.js
find-*.js
verify-*.js
```

## Adding New Tests

1. Choose the appropriate category (unit/integration/workflows)
2. Import `TestUtils` and `TEST_DATA` from `../config/test-config`
3. Use `TestUtils.setupEnvironment()` and `TestUtils.createClients()`
4. Format results with `TestUtils.formatTestResult()`
5. Add the test to `run-all-tests.js` if it should run automatically
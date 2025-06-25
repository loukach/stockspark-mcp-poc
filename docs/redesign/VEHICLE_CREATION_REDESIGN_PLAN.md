# Vehicle Creation Tools Redesign Plan

## Overview
This document outlines the complete redesign of vehicle creation tools in the StockSpark MCP, moving from 5 confusing tools to 4 clear, well-separated tools.

## Current State Summary
- **5 tools** with confusing names and mixed responsibilities
- `start_vehicle_creation` doesn't create anything
- `create_vehicle_from_trim` does hidden API calls
- Two different ways to create vehicles
- Rigid workflow requirements

## Target State
- **4 tools** with clear separation of concerns
- Search/discovery separate from creation
- Flexible workflow paths
- Template-based data integrity
- AI-agent friendly design

## New Tool Design

### 1. `search_vehicle_specs`
**Purpose**: Smart progressive search for vehicle specifications

**Input Schema**:
```json
{
  "make": "string (optional)",
  "model": "string (optional)", 
  "year": "number (optional)",
  "fuel": "string (optional)",
  "vehicleClass": "string (default: 'car')",
  "country": "string (default: 'it')"
}
```

**Behavior**:
- No input → returns all makes
- Only make → returns models for that make
- Make + model → returns matching trims
- Includes fuzzy matching for make/model names
- Returns appropriate level based on input

**APIs Used**:
- `GET /{country}/vehicle/makes`
- `GET /{country}/vehicle/models?make={makeId}`
- `GET /{country}/vehicle/trims?modelId={modelId}`

### 2. `compare_vehicle_options`
**Purpose**: Compare multiple trim variants side-by-side

**Input Schema**:
```json
{
  "trimIds": ["string"],
  "comparisonFields": ["engine", "price", "equipment"] // optional
}
```

**Output**: Structured comparison table highlighting differences

### 3. `get_vehicle_template`
**Purpose**: Get enriched vehicle specifications from trim

**Input Schema**:
```json
{
  "providerCode": "string (trim ID)",
  "provider": "string (optional, e.g. 'datak')",
  "vehicleClass": "string (default: 'car')"
}
```

**Output**:
```json
{
  "template": { /* complete vehicle data */ },
  "userFields": ["price", "mileage", "condition", "color"],
  "suggestedNext": "add_vehicle"
}
```

**APIs Used**:
- `GET /{country}/vehicle/compileByTrim`

### 4. `add_vehicle`
**Purpose**: Create vehicle with template or basic data

**Input Schema**:
```json
{
  "template": { /* from get_vehicle_template */ },
  "userOverrides": {
    "price": "number",
    "mileage": "number", 
    "condition": "NEW|USED|KM0",
    "color": "string"
  }
}
// OR
{
  "basicData": {
    "make": "string",
    "model": "string",
    "year": "number",
    "price": "number",
    "fuel": "string",
    "transmission": "string",
    "condition": "string"
  }
}
```

**APIs Used**:
- `POST /{country}/vehicle`

## Implementation Tasks

### Phase 1: Create New Tools (Week 1)
1. Implement `search_vehicle_specs` with progressive logic
2. Implement `compare_vehicle_options` 
3. Implement `get_vehicle_template`
4. Update `add_vehicle` to accept templates

### Phase 2: Testing & Validation (Week 2)
1. Unit tests for each new tool
2. Integration tests for complete workflows
3. Performance testing (compare API calls)
4. AI agent testing with various inputs

### Phase 3: Migration Support (Week 3)
1. Add deprecation warnings to old tools
2. Create migration guide
3. Update documentation
4. Create compatibility layer

### Phase 4: Rollout (Week 4)
1. Deploy new tools alongside old ones
2. Monitor usage patterns
3. Support early adopters
4. Fix issues based on feedback

## Migration Strategy

### For AI Agents
```javascript
// Old flow
start_vehicle_creation(make="BMW", model="320i")
→ create_vehicle_from_trim(trimId="12345", price=25000)

// New flow  
search_vehicle_specs(make="BMW", model="320i")
→ get_vehicle_template(providerCode="12345")
→ add_vehicle(template=..., userOverrides={price: 25000})
```

### Backwards Compatibility
- Keep old tools for 6 months with deprecation warnings
- Log usage to identify migration blockers
- Provide automated migration suggestions

## Success Metrics
1. Reduced AI agent confusion (fewer support tickets)
2. Decreased failed vehicle creation attempts
3. Improved code maintainability
4. Faster onboarding for new developers

## Risk Mitigation
1. **Breaking changes**: Phased rollout with compatibility layer
2. **Performance impact**: Cache template responses
3. **User confusion**: Clear documentation and examples
4. **Data integrity**: Validate template+overrides combination

## Files to Modify
1. `/src/tools/vehicle-tools.js` - Update add_vehicle
2. `/src/tools/reference-tools.js` - Replace with new tools
3. `/src/api/reference.js` - Add new search methods
4. `/src/utils/mappers.js` - Add template mapping
5. `/tests/` - New test suites

## Next Session Checklist
- [ ] Review this plan
- [ ] Start with Phase 1 implementation
- [ ] Create new tool files
- [ ] Update handler implementations
- [ ] Write comprehensive tests
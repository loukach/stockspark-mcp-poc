# Prompt for Next Session - Vehicle Creation Tools Redesign

## Context
I need to implement a redesigned vehicle creation system for the StockSpark MCP project. The current implementation has 5 confusing tools that need to be replaced with 4 cleaner, simpler tools. This is an MVP - focus on simplicity and functionality over perfection.

## Current State
The project has 5 vehicle creation tools spread across `reference-tools.js` and `vehicle-tools.js` that are confusing and have unclear responsibilities. Full analysis is in `/docs/redesign/CURRENT_IMPLEMENTATION_ANALYSIS.md`.

## Task
Replace the current vehicle creation tools with these 4 new tools:

### 1. `search_vehicle_specs`
- Smart search that returns makes, models, or trims based on input
- No input → returns all makes
- With make → returns models for that make
- With make + model → returns matching trims
- Use fuzzy matching for make/model names

### 2. `compare_vehicle_options`
- Takes array of trim IDs
- Returns side-by-side comparison
- Keep it simple - just show key differences

### 3. `get_vehicle_template`
- Takes a trim ID (providerCode)
- Calls GET /vehicle/compileByTrim
- Returns enriched vehicle data ready for creation

### 4. `add_vehicle` (enhance existing)
- Accept either:
  - Template from `get_vehicle_template` + user overrides (price, mileage, etc.)
  - Basic data for manual creation (current functionality)

## Implementation Requirements

1. **Delete old tools from `reference-tools.js`**:
   - `start_vehicle_creation`
   - `compare_trim_variants`
   - `compile_vehicle_by_trim`
   - `create_vehicle_from_trim`

2. **Add new tools to `reference-tools.js`**:
   - Implement the 3 new tools listed above
   - Keep handlers simple and focused

3. **Enhance `add_vehicle` in `vehicle-tools.js`**:
   - Add template support while keeping basic mode
   - Use oneOf schema for the two input modes

4. **Keep it simple**:
   - This is MVP - don't over-engineer
   - Use existing API methods where possible
   - Clear error messages when things go wrong
   - Return helpful suggestions when searches fail

5. **Testing**:
   - Update the test files to use new tools
   - Ensure the vehicle creation workflow still works end-to-end

## Key Files
- `/docs/redesign/SIMPLIFIED_IMPLEMENTATION_PLAN.md` - Full implementation details
- `/src/tools/reference-tools.js` - Where most changes happen
- `/src/tools/vehicle-tools.js` - Update add_vehicle
- `/src/api/reference.js` - Has existing fuzzy matching logic to reuse

## Example Flow
```javascript
// User wants to add a BMW 320i
const results = await search_vehicle_specs({ make: "BMW", model: "320i" });
const template = await get_vehicle_template({ providerCode: results.trims[0].id });
await add_vehicle({ template: template.template, userOverrides: { price: 35000 } });
```

## Success Criteria
- Old tools deleted
- New tools working
- Tests passing
- Clear, simple code
- AI agents can easily understand the new flow

Start by reading the implementation plan, then proceed with deleting old code and implementing the new tools. Keep it simple - this is MVP!
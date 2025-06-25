# Vehicle Creation Tools Migration Guide

## Overview
This guide helps migrate from the current 5-tool vehicle creation system to the new simplified 4-tool design.

## Tool Mapping

### Old Tools → New Tools

| Old Tool | New Tool | Notes |
|----------|----------|-------|
| `start_vehicle_creation` | `search_vehicle_specs` | Now returns progressive results |
| `compare_trim_variants` | `compare_vehicle_options` | Cleaner comparison format |
| `compile_vehicle_by_trim` | `get_vehicle_template` | Explicit preview step |
| `create_vehicle_from_trim` | `get_vehicle_template` + `add_vehicle` | Split into two steps |
| `add_vehicle` | `add_vehicle` | Enhanced to accept templates |

## Migration Examples

### Example 1: Standard Vehicle Creation

**Old Flow:**
```javascript
// Step 1: Find trims
await start_vehicle_creation({
  make_name: "BMW",
  model_name: "320i",
  year: 2023
});
// Returns: List of trims

// Step 2: Create vehicle
await create_vehicle_from_trim({
  providerCode: "100037390420230101",
  provider: "datak",
  price: 35000,
  condition: "NEW"
});
```

**New Flow:**
```javascript
// Step 1: Search specs
const specs = await search_vehicle_specs({
  make: "BMW",
  model: "320i", 
  year: 2023
});
// Returns: Progressive results with trim IDs

// Step 2: Get template
const template = await get_vehicle_template({
  providerCode: "100037390420230101"
});

// Step 3: Create vehicle
await add_vehicle({
  template: template.template,
  userOverrides: {
    price: 35000,
    condition: "NEW"
  }
});
```

### Example 2: Comparison Workflow

**Old Flow:**
```javascript
// Find similar variants
await compare_trim_variants({
  model_id: "393",
  base_model_name: "Golf GTI",
  year: 2023
});
```

**New Flow:**
```javascript
// Search first
const results = await search_vehicle_specs({
  make: "Volkswagen",
  model: "Golf GTI",
  year: 2023
});

// Compare specific trims
await compare_vehicle_options({
  trimIds: results.trims.map(t => t.id).slice(0, 5)
});
```

### Example 3: Basic Vehicle Addition

**Old Flow:**
```javascript
await add_vehicle({
  make: "Fiat",
  model: "500",
  year: 2023,
  price: 15000,
  fuel: "PETROL",
  transmission: "MANUAL",
  condition: "NEW"
});
```

**New Flow:**
```javascript
// Same call, enhanced functionality
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

## Key Differences

### 1. Progressive Search
- Old: Must know exact make/model structure
- New: Smart search adapts to input level

### 2. Explicit Template Step
- Old: Hidden compile call inside create
- New: Explicit template fetch for transparency

### 3. Data Preservation
- Old: Risk of data loss between steps
- New: Template pattern preserves integrity

### 4. Flexible Workflows
- Old: Must follow exact sequence
- New: Can skip steps if you have data

## Deprecation Timeline

| Phase | Date | Action |
|-------|------|--------|
| Phase 1 | Week 1-2 | New tools available alongside old |
| Phase 2 | Week 3-4 | Deprecation warnings added |
| Phase 3 | Month 2-3 | Old tools marked deprecated |
| Phase 4 | Month 6 | Old tools removed |

## Common Patterns

### Pattern 1: Quick Search
```javascript
// Just exploring what's available
const options = await search_vehicle_specs({
  make: "Mercedes"
});
// Returns all Mercedes models
```

### Pattern 2: Direct Creation
```javascript
// When you know the trim ID
const template = await get_vehicle_template({
  providerCode: "known-trim-id"
});

await add_vehicle({
  template: template.template,
  userOverrides: { price: 50000 }
});
```

### Pattern 3: Comparison Shopping
```javascript
// Find and compare options
const specs = await search_vehicle_specs({
  make: "Audi",
  model: "A4"
});

const comparison = await compare_vehicle_options({
  trimIds: specs.trims.filter(t => t.name.includes("Sport"))
});
```

## Error Handling

### Old Approach
```javascript
try {
  await start_vehicle_creation({ make_name: "InvalidMake" });
} catch (error) {
  // Generic error
}
```

### New Approach
```javascript
const result = await search_vehicle_specs({ make: "InvalidMake" });
// Returns: { 
//   found: 0, 
//   suggestions: ["BMW", "BYD"],
//   message: "No exact match. Did you mean..."
// }
```

## Best Practices

1. **Always check search results** before proceeding
2. **Use templates** for complete specifications
3. **Validate user overrides** match template requirements
4. **Handle progressive results** appropriately
5. **Cache search results** when doing multiple operations

## FAQ

**Q: Why the extra step for templates?**
A: Explicit template fetching improves transparency and allows verification before creation.

**Q: Can I still create basic vehicles?**
A: Yes, `add_vehicle` still accepts basic data for fallback scenarios.

**Q: What about performance?**
A: Template responses are cacheable, potentially improving performance for repeated operations.

**Q: How do I handle existing integrations?**
A: Use the compatibility layer during migration phase.

## Support

- Report issues: GitHub issues
- Documentation: /docs/redesign/
- Examples: /tests/examples/
- Migration help: Contact support team
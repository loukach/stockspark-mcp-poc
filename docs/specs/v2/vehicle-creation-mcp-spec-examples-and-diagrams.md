# Vehicle MCP API Flow Diagrams & Examples

## Table of Contents
1. [Example 1: Natural Language Search (Happy Path)](#example-1-natural-language-search-happy-path)
2. [Example 2: Handling Ambiguity](#example-2-handling-ambiguity)
3. [Example 3: Error Recovery](#example-3-error-recovery)
4. [Manufacture Year Usage](#manufacture-year-usage)
5. [Common Patterns](#common-patterns)

---

## Example 1: Natural Language Search (Happy Path)

### Scenario
User input: **"Find a 2019 BMW 3 series diesel automatic"**

### High-Level Logic
This example demonstrates the happy path where the AI agent successfully finds a high-confidence match in one go.

### API Flow Diagram
```
AI Agent                    MCP Server                         Stock API
   │                             │                                  │
   ├─"Find 2019 BMW 3           │                                  │
   │  series diesel automatic"───►                                  │
   │                             │                                  │
   │                             ├─1. Parse description              │
   │                             │   Extract: BMW, 3 series,        │
   │                             │   2019, diesel, automatic        │
   │                             │                                  │
   │                             ├─2. GET /it/vehicle/makes─────────►
   │                             │   (vehicleClass=car)             │
   │                             │◄──────[BMW, Audi, Fiat...]──────┤
   │                             │                                  │
   │                             ├─3. Fuzzy match "BMW"            │
   │                             │   Result: Exact match found     │
   │                             │                                  │
   │                             ├─4. GET /it/vehicle/models────────►
   │                             │   (make=BMW,                     │
   │                             │    manufactureDate=01-2019)     │
   │                             │◄──────[Series 1, Series 3...]────┤
   │                             │                                  │
   │                             ├─5. Fuzzy match "3 series"        │
   │                             │   Result: "Series 3" (0.9 conf) │
   │                             │                                  │
   │                             ├─6. GET /it/vehicle/trims─────────►
   │                             │   (modelId=123,                  │
   │                             │    fuelType=DIESEL,              │
   │                             │    manufactureDate=01-2019)      │
   │                             │◄──────[320d Manual, 320d Auto,──┤
   │                             │        330d xDrive...]           │
   │                             │                                  │
   │                             ├─7. Score all trims               │
   │                             │   320d Auto scores 0.92          │
   │                             │                                  │
   │                             ├─8. GET /it/vehicle/compileByTrim─►
   │                             │   (providerCode=100037...,      │
   │                             │    companyId=12345)             │
   │                             │◄──────[Complete vehicle object]──┤
   │                             │                                  │
   │◄──High confidence match───────┤                                  │
   │   with compiled vehicle       │                                  │
```

### MCP Response
```json
{
  "status": "high_confidence_match",
  "vehicle": {
    "id": "compiled-vehicle-id",
    "make": "BMW",
    "model": "Series 3",
    "trim": "320d xDrive Automatic",
    "year": 2019,
    "fuelType": "DIESEL",
    "transmission": "AUTOMATIC",
    "bodyType": "SEDAN"
  },
  "match": {
    "confidence": 0.92,
    "trim": {
      "id": "100037390420221105",
      "name": "320d xDrive Automatic",
      "provider": "datak"
    },
    "matchDetails": {
      "make": { 
        "confidence": 1.0, 
        "matchType": "exact" 
      },
      "model": { 
        "confidence": 0.9, 
        "matchType": "fuzzy", 
        "details": "3 series → Series 3" 
      },
      "fuel": { 
        "confidence": 1.0, 
        "matchType": "exact" 
      },
      "transmission": { 
        "confidence": 1.0, 
        "matchType": "inferred", 
        "details": "from trim name" 
      }
    }
  },
  "searchPath": [
    {
      "step": "make_selection",
      "input": "BMW",
      "found": { "id": 15, "name": "BMW" },
      "confidence": 1.0
    },
    {
      "step": "model_selection",
      "input": "3 series",
      "found": { "id": 123, "name": "Series 3" },
      "confidence": 0.9
    },
    {
      "step": "trim_selection",
      "candidatesFound": 8,
      "selected": "320d xDrive Automatic",
      "confidence": 0.92
    }
  ]
}
```

### Key Points
- **Single user query** triggers 4 API calls automatically
- **Fuzzy matching** handles "3 series" → "Series 3" variation
- **Scoring algorithm** identifies best trim based on all criteria
- **Automatic compilation** when confidence > 0.85
- **Manufacture year** filters results at model and trim levels

---

## Example 2: Handling Ambiguity

### Scenario
User input: **"Find a Toyota hybrid"**

### High-Level Logic
This example shows how the MCP handles incomplete information where multiple valid options exist.

### API Flow Diagram
```
AI Agent                    MCP Server                         Stock API
   │                             │                                  │
   ├─"Find Toyota hybrid"────────►                                  │
   │                             │                                  │
   │                             ├─1. Parse description              │
   │                             │   Extract: Toyota, hybrid        │
   │                             │   Missing: model, year, body     │
   │                             │                                  │
   │                             ├─2. GET /uk/vehicle/makes─────────►
   │                             │◄──────[Toyota, Honda...]─────────┤
   │                             │                                  │
   │                             ├─3. GET /uk/vehicle/models────────►
   │                             │   (make=Toyota)                  │
   │                             │◄──────[Corolla, Prius, C-HR,────┤
   │                             │        RAV4, Camry...]           │
   │                             │                                  │
   │                             ├─4. For each model:               │
   │                             │   GET /uk/vehicle/trims──────────►
   │                             │   (modelId=X, fuelType=HYBRID)   │
   │                             │◄──────[Hybrid trim variants]─────┤
   │                             │                                  │
   │                             ├─5. Aggregate results              │
   │                             │   Found 15 hybrid trims across   │
   │                             │   5 different models             │
   │                             │                                  │
   │                             ├─6. Group by model & score         │
   │                             │   All score 0.75 (only 2 criteria)
   │                             │                                  │
   │◄──Multiple candidates with────┤                                  │
   │   refinement suggestions      │                                  │
   │                             │                                  │
   ├─"I want the Corolla"──────────►                                  │
   │                             │                                  │
   │                             ├─7. GET /uk/vehicle/trims──────────►
   │                             │   (modelId=Corolla, hybrid)      │
   │                             │◄──────[1.8 Hybrid, 2.0 Hybrid]───┤
   │                             │                                  │
   │                             ├─8. GET /uk/vehicle/compileByTrim─►
   │◄──Compiled Corolla Hybrid─────┤                                  │
```

### MCP Response
```json
{
  "status": "multiple_candidates",
  "candidates": [
    {
      "trim": { 
        "id": "trim_corolla_18", 
        "name": "Corolla 1.8 Hybrid",
        "modelName": "Corolla"
      },
      "score": { 
        "total": 0.75, 
        "breakdown": { 
          "make": 1.0, 
          "fuel": 1.0 
        } 
      }
    },
    {
      "trim": { 
        "id": "trim_prius_18", 
        "name": "Prius 1.8 Hybrid",
        "modelName": "Prius"
      },
      "score": { 
        "total": 0.75, 
        "breakdown": { 
          "make": 1.0, 
          "fuel": 1.0 
        } 
      }
    },
    {
      "trim": { 
        "id": "trim_chr_18", 
        "name": "C-HR 1.8 Hybrid",
        "modelName": "C-HR"
      },
      "score": { 
        "total": 0.75, 
        "breakdown": { 
          "make": 1.0, 
          "fuel": 1.0 
        } 
      }
    }
  ],
  "refinementSuggestions": {
    "questions": [
      "Which Toyota model are you looking for?",
      "Do you prefer a sedan (Corolla), hatchback (Prius), or SUV (C-HR)?"
    ],
    "missingCriteria": ["model", "bodyType", "year"],
    "suggestedFilters": {
      "models": ["Corolla", "Prius", "C-HR", "RAV4", "Camry"],
      "bodyTypes": ["SEDAN", "HATCHBACK", "SUV"],
      "years": ["2023", "2024", "2025"]
    }
  },
  "searchPath": [
    {
      "step": "make_selection",
      "input": "Toyota",
      "found": { "id": 45, "name": "Toyota" },
      "confidence": 1.0
    },
    {
      "step": "model_search",
      "modelsChecked": 5,
      "hybridsFound": 15,
      "groupedByModel": true
    }
  ]
}
```

### Key Points
- **Insufficient criteria** leads to multiple matches
- MCP **aggregates across models** to find all hybrids
- Returns **grouped results** with smart suggestions
- **Progressive refinement** - waits for user input before compiling
- **Multiple API calls** in parallel for different models

---

## Example 3: Error Recovery

### Scenario
User input: **"Find a Tezla Model 3"** (misspelled)

### High-Level Logic
This example demonstrates intelligent error handling when no matches are found due to misspelling.

### API Flow Diagram
```
AI Agent                    MCP Server                         Stock API
   │                             │                                  │
   ├─"Find Tezla Model 3"────────►                                  │
   │                             │                                  │
   │                             ├─1. Parse description              │
   │                             │   Extract: Tezla, Model 3       │
   │                             │                                  │
   │                             ├─2. GET /de/vehicle/makes─────────►
   │                             │◄──────[BMW, Tesla, Toyota...]────┤
   │                             │                                  │
   │                             ├─3. Fuzzy match "Tezla"           │
   │                             │   No exact or high-conf match    │
   │                             │                                  │
   │                             ├─4. Run similarity algorithms:    │
   │                             │   - Levenshtein distance         │
   │                             │   - Common misspellings DB       │
   │                             │   - Phonetic matching            │
   │                             │                                  │
   │                             ├─5. Find similar makes:            │
   │                             │   Tesla: 0.83 similarity         │
   │                             │   Seat: 0.50 similarity          │
   │                             │                                  │
   │                             ├─6. Check if "Model 3" exists      │
   │                             │   for top suggestion              │
   │                             ├─GET /de/vehicle/models────────────►
   │                             │   (make=Tesla)                   │
   │                             │◄──────[Model 3, Model S...]───────┤
   │                             │                                  │
   │◄──No matches + suggestions────┤                                  │
   │   "Did you mean Tesla?"       │                                  │
   │                             │                                  │
   ├─"Yes, Tesla Model 3"──────────►                                  │
   │                             │                                  │
   │                             ├─7. GET /de/vehicle/trims──────────►
   │                             │   (modelId=Model3)               │
   │                             │◄──────[Standard Range, Long──────┤
   │                             │        Range, Performance]       │
   │                             │                                  │
   │◄──Success with trims──────────┤                                  │
```

### MCP Response
```json
{
  "status": "no_matches",
  "suggestions": {
    "similarMakes": [
      { 
        "name": "Tesla", 
        "similarity": 0.83, 
        "suggestion": "Did you mean 'Tesla'?" 
      },
      {
        "name": "Seat",
        "similarity": 0.50,
        "suggestion": "Did you mean 'Seat'?"
      }
    ],
    "commonMisspellings": [
      {
        "input": "Tezla",
        "correction": "Tesla",
        "confidence": 0.85
      }
    ],
    "recommendedAction": "Try searching with 'Tesla' instead"
  },
  "possibleIssues": [
    "Make 'Tezla' not found in database",
    "Possible misspelling detected",
    "Similar make 'Tesla' has a 'Model 3' available"
  ],
  "searchPath": [
    {
      "step": "make_selection",
      "input": "Tezla",
      "found": null,
      "alternatives": ["Tesla", "Seat"],
      "bestSimilarity": 0.83
    }
  ],
  "validation": {
    "testedAlternative": "Tesla",
    "hasModel3": true,
    "confidence": "high"
  }
}
```

### Key Points
- **Fuzzy matching fails** but calculates similarity scores
- **Multiple fallback strategies** (Levenshtein, phonetic, knowledge base)
- **Validates suggestions** by checking if Model 3 exists under Tesla
- **Helpful error messages** guide user to correct input
- **Proactive validation** of suggested alternatives

---

## Manufacture Year Usage

### How Year is Extracted and Used

#### Input Pattern Recognition
```typescript
// Natural language patterns → API format
"2019 BMW 320d"          → manufactureDate: "01-2019"
"BMW 320d '19"           → manufactureDate: "01-2019"  
"2019 model BMW"         → manufactureDate: "01-2019"
"BMW from 2019"          → manufactureDate: "01-2019"
"early 2020 BMW"         → manufactureDate: "03-2020"
"BMW 320d late 2019"     → manufactureDate: "10-2019"
```

#### Usage in Models Endpoint

```
Without manufactureDate:
GET /it/vehicle/models?vehicleClass=car&make=BMW

Returns: ALL BMW models (50+) including:
- Discontinued: E30 (1982-1994)
- Current: G20 (2019-present)
- Future: Models not yet released

With manufactureDate:
GET /it/vehicle/models?vehicleClass=car&make=BMW&manufactureDate=01-2019

Returns: Only models available in Jan 2019 (~15)
- Series 1 (F40 - just launched)
- Series 3 (G20 - new generation)
- Series 5 (G30)
- X3 (G01)
```

#### Usage in Trims Endpoint

```
Without manufactureDate:
GET /it/vehicle/trims?modelId=123

Returns: ALL trims for Series 3 (100+) including:
- Old: 320d 163HP (2015-2018)
- Current: 320d 190HP (2019-2023)
- Future: 320d 200HP mild hybrid (2020+)

With manufactureDate:
GET /it/vehicle/trims?modelId=123&manufactureDate=01-2019

Returns: Only 2019-available trims (~25):
- 318d (150 HP) - Euro 6d
- 320d xDrive (190 HP) - New for 2019
- 330d (265 HP)
- Missing: Old 163HP variant (discontinued)
- Missing: 2020 mild hybrid variants
```

### Real Example: BMW Model Generation Change

```typescript
// 2018 vs 2019 BMW 3 Series - Different Generations!

// Query for 2018
GET /vehicle/models?make=BMW&manufactureDate=01-2018
→ Returns: Series 3 (F30 generation)

GET /vehicle/trims?modelId=F30&manufactureDate=01-2018
→ Trims: 320d (163 HP), 320d EfficientDynamics (163 HP)

// Query for 2019  
GET /vehicle/models?make=BMW&manufactureDate=01-2019
→ Returns: Series 3 (G20 generation - completely new!)

GET /vehicle/trims?modelId=G20&manufactureDate=01-2019
→ Trims: 320d (190 HP), 320d xDrive (190 HP) - all new engines
```

### Smart Year Handling Strategies

```typescript
// Progressive fallback when year is too restrictive
async searchWithYearFallback(params) {
  const strategies = [
    // 1. Exact month-year
    { manufactureDate: "01-2019", strategy: "exact" },
    
    // 2. Different month same year (model year vs calendar year)
    { manufactureDate: "09-2019", strategy: "model_year" },
    
    // 3. Adjacent years (user might be off by one)
    { manufactureDate: "01-2020", strategy: "next_year" },
    { manufactureDate: "01-2018", strategy: "prev_year" },
    
    // 4. No year filter (but score by proximity)
    { manufactureDate: undefined, strategy: "no_filter" }
  ];
  
  for (const { manufactureDate, strategy } of strategies) {
    const results = await this.searchTrims({
      ...params,
      manufactureDate
    });
    
    if (results.length > 0) {
      return {
        results,
        strategy,
        yearUsed: manufactureDate
      };
    }
  }
}
```

### Benefits of Using Manufacture Year

1. **Reduces Response Size**
   - Without: 100+ trims across all years
   - With: 20-30 trims for specific year

2. **Ensures Correct Generation**
   - Critical for model changes (F30 → G20)
   - Avoids mixing old and new platforms

3. **Handles Regulatory Changes**
   ```
   2018: Euro 6c engines
   2019: Euro 6d-TEMP required
   2021: Euro 6d mandatory
   ```

4. **Improves Match Accuracy**
   - Same name, different specs by year
   - Equipment levels change annually

---

## Common Patterns

### 1. Progressive API Call Chain
```
Makes API → Filter/Match → Models API → Filter/Match → Trims API → Score → Compile
     ↓                           ↓                           ↓            ↓
Fuzzy Match                Year Filter                 Multi-Filter    Confidence
                          (optional)                    (fuel, year)    Threshold
```

### 2. Confidence-Based Decision Tree
```
Score > 0.85  → Auto-compile and return
Score 0.5-0.85 → Return candidates for user selection  
Score < 0.5   → Provide alternatives and suggestions
No matches    → Fuzzy search alternatives → Validate → Suggest
```

### 3. API Call Optimization
- **Caching**: Makes/models cached (change rarely)
- **Parallel Requests**: When checking multiple models
- **Early Termination**: Stop on high-confidence match
- **Smart Filtering**: Use all available filters to reduce payload

### 4. Error Handling Cascade
```
1. Exact match
   ↓ (fail)
2. Case-insensitive match
   ↓ (fail)
3. Fuzzy match (Levenshtein)
   ↓ (fail)
4. Knowledge base (abbreviations, misspellings)
   ↓ (fail)
5. Phonetic matching
   ↓ (fail)
6. Return best alternatives with explanations
```

### 5. Match Types and Confidence
```typescript
{
  "exact":     1.00,  // Perfect string match
  "fuzzy":     0.90,  // Close match (3 series → Series 3)
  "inferred":  0.80,  // Derived from context (automatic from trim name)
  "partial":   0.70,  // Some criteria match
  "suggested": 0.60   // Best guess from alternatives
}
```
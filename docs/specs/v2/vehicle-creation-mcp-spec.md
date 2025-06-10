# AI-Assisted Vehicle Selection MCP: Technical Specification

## Context

The vehicle stock management industry faces a common challenge: creating vehicle entries requires navigating a complex hierarchy of makes, models, and trims. The traditional API structure follows a cascading pattern:

```
Makes → Models → Trims → Compile Vehicle
```

Each step requires specific IDs from the previous step, and users must navigate through potentially hundreds of options. For example:
- A make like "BMW" might have 50+ models
- Each model might have 20-100 trim variants
- Trim names often include technical codes that are not user-friendly

This creates friction for users who typically think in terms like "2019 BMW 3 Series diesel" rather than navigating through hierarchical menus.

## Motivation

### Current Pain Points

1. **User Experience Friction**
   - Multiple API calls required for simple vehicle creation
   - Users must know exact naming conventions
   - High abandonment rate due to complexity

2. **Data Quality Issues**
   - Users select wrong trims due to confusion
   - Inconsistent naming across different data providers
   - Technical trim codes vs. common names mismatch

3. **Integration Challenges**
   - Direct API integration requires complex UI flows
   - Error handling at each step is cumbersome
   - No intelligent fallbacks for partial information

### Why AI Assistance?

AI agents excel at:
- Understanding natural language descriptions
- Fuzzy matching and similarity detection
- Making intelligent selections from large datasets
- Providing context-aware recommendations

By creating an MCP that leverages these capabilities, we can transform a complex hierarchical selection process into a simple natural language interaction.

## Goal

Create an MCP server that enables AI agents to efficiently navigate the vehicle selection hierarchy using natural language, while maintaining high accuracy and providing transparent decision-making processes.

### Key Objectives

1. **Natural Language Understanding**: Accept descriptions like "2019 BMW 320d automatic"
2. **Intelligent Matching**: Use fuzzy logic to handle variations and typos
3. **Progressive Refinement**: Guide through ambiguous cases with smart suggestions
4. **Confidence Scoring**: Provide transparency about match quality
5. **Single-Call Efficiency**: Compile vehicles in one interaction when possible

## Implementation

### Architecture Overview

```typescript
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   AI Agent      │────▶│   MCP Server     │────▶│  Stock API      │
│                 │◀────│                  │◀────│                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                        │
        │                        ├── Natural Language Parser
        │                        ├── Fuzzy Matching Engine
        │                        ├── Confidence Scorer
        │                        └── Progressive Search Logic
        │
        └── "Find a 2019 BMW 3 series diesel"
```

### Core MCP Implementation

```typescript
// mcp-server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

interface VehicleHints {
  make?: string;
  makeAlternatives?: string[];
  model?: string;
  modelAlternatives?: string[];
  year?: string;
  fuelType?: string;
  bodyType?: string;
  transmission?: string;
  engineSize?: string;
  manufactureDate?: string;
  rawDescription: string;
}

interface MatchResult {
  confidence: number;
  matchType: 'exact' | 'fuzzy' | 'partial' | 'inferred';
  details: string;
}

class VehicleManagementMCP {
  private server: Server;
  private apiClient: VehicleAPIClient;
  private knowledgeBase: VehicleKnowledgeBase;
  
  constructor(config: MCPConfig) {
    this.server = new Server({
      name: "vehicle-stock-manager",
      version: "1.0.0",
      description: "AI-assisted vehicle selection and management"
    });
    
    this.apiClient = new VehicleAPIClient(config.apiEndpoint, config.apiKey);
    this.knowledgeBase = new VehicleKnowledgeBase();
    
    this.setupTools();
    this.setupResourceProviders();
  }

  private setupTools() {
    this.server.setRequestHandler("tools/list", async () => ({
      tools: this.getToolDefinitions()
    }));

    this.server.setRequestHandler("tools/call", async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        switch (name) {
          case "find_vehicle_by_description":
            return await this.findVehicleByDescription(args);
          
          case "search_and_compile_vehicle":
            return await this.searchAndCompileVehicle(args);
          
          case "get_vehicle_suggestions":
            return await this.getVehicleSuggestions(args);
          
          case "validate_vehicle_selection":
            return await this.validateVehicleSelection(args);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          error: {
            code: "TOOL_ERROR",
            message: error.message,
            details: error
          }
        };
      }
    });
  }

  /**
   * Main AI-friendly tool that handles natural language descriptions
   */
  private async findVehicleByDescription(args: {
    description: string;
    country: string;
    vehicleClass?: string;
    companyId: number;
    options?: {
      requireExactMatch?: boolean;
      maxCandidates?: number;
      includeAlternatives?: boolean;
    }
  }) {
    // Step 1: Parse the natural language description
    const hints = this.parseVehicleDescription(args.description);
    
    // Step 2: Progressive search through the hierarchy
    const searchResult = await this.performProgressiveSearch({
      hints,
      country: args.country,
      vehicleClass: args.vehicleClass || 'car',
      companyId: args.companyId
    });
    
    // Step 3: Analyze and rank results
    const rankedResults = await this.rankSearchResults(searchResult, hints);
    
    // Step 4: Prepare response based on confidence
    if (rankedResults.topMatch && rankedResults.topMatch.confidence > 0.85) {
      // High confidence - suggest direct compilation
      const compiled = await this.compileVehicleByTrim({
        country: args.country,
        companyId: args.companyId,
        providerCode: rankedResults.topMatch.trim.id,
        vehicleClass: args.vehicleClass || 'car',
        provider: rankedResults.topMatch.trim.provider
      });
      
      return {
        status: "high_confidence_match",
        vehicle: compiled,
        match: rankedResults.topMatch,
        alternatives: rankedResults.alternatives.slice(0, 2),
        searchPath: searchResult.path
      };
    } else if (rankedResults.candidates.length > 0) {
      // Multiple candidates - need selection
      return {
        status: "multiple_candidates",
        candidates: rankedResults.candidates.slice(0, args.options?.maxCandidates || 5),
        recommendation: rankedResults.topMatch,
        searchPath: searchResult.path,
        refinementSuggestions: this.generateRefinementSuggestions(rankedResults)
      };
    } else {
      // No matches - provide helpful alternatives
      return {
        status: "no_matches",
        suggestions: await this.generateAlternativeSuggestions(hints, args),
        searchPath: searchResult.path,
        possibleIssues: this.diagnoseSearchFailure(searchResult)
      };
    }
  }

  /**
   * Parse natural language vehicle descriptions
   */
  private parseVehicleDescription(description: string): VehicleHints {
    const normalized = description.toLowerCase().trim();
    const tokens = normalized.split(/\s+/);
    
    // Extract year patterns
    const yearPatterns = [
      /\b(19|20)\d{2}\b/,           // 2019
      /\b'\d{2}\b/,                  // '19
      /\b\d{2}(?=\s*model|plate)\b/  // 19 model/plate
    ];
    
    let year: string | undefined;
    for (const pattern of yearPatterns) {
      const match = normalized.match(pattern);
      if (match) {
        year = match[0].startsWith("'") ? 
          `20${match[0].substring(1)}` : 
          match[0].length === 2 ? `20${match[0]}` : match[0];
        break;
      }
    }
    
    // Fuel type detection with common variations
    const fuelMappings: Record<string, string> = {
      'diesel': 'DIESEL',
      'gasoil': 'DIESEL',
      'tdi': 'DIESEL',
      'hdi': 'DIESEL',
      'cdti': 'DIESEL',
      'crdi': 'DIESEL',
      'petrol': 'PETROL',
      'gasoline': 'PETROL',
      'benzina': 'PETROL',
      'tfsi': 'PETROL',
      'tsi': 'PETROL',
      'electric': 'ELECTRIC',
      'ev': 'ELECTRIC',
      'elettrica': 'ELECTRIC',
      'hybrid': 'HYBRID',
      'ibrida': 'HYBRID',
      'phev': 'PLUG_IN_HYBRID',
      'gpl': 'LPG',
      'lpg': 'LPG',
      'metano': 'METHANE',
      'cng': 'METHANE'
    };
    
    const fuelType = this.findMapping(normalized, fuelMappings);
    
    // Body type detection
    const bodyMappings: Record<string, string> = {
      'sedan': 'SEDAN',
      'berlina': 'SEDAN',
      'saloon': 'SEDAN',
      'hatchback': 'HATCHBACK',
      'hatch': 'HATCHBACK',
      'suv': 'SUV',
      'crossover': 'SUV',
      'estate': 'ESTATE',
      'wagon': 'ESTATE',
      'station wagon': 'ESTATE',
      'sw': 'ESTATE',
      'touring': 'ESTATE',
      'coupe': 'COUPE',
      'coupé': 'COUPE',
      'convertible': 'CONVERTIBLE',
      'cabrio': 'CONVERTIBLE',
      'cabriolet': 'CONVERTIBLE',
      'spider': 'CONVERTIBLE',
      'van': 'VAN',
      'minivan': 'MINIVAN',
      'mpv': 'MINIVAN'
    };
    
    const bodyType = this.findMapping(normalized, bodyMappings);
    
    // Transmission detection
    const transmissionMappings: Record<string, string> = {
      'automatic': 'AUTOMATIC',
      'auto': 'AUTOMATIC',
      'automatica': 'AUTOMATIC',
      'dsg': 'AUTOMATIC',
      'dct': 'AUTOMATIC',
      'manual': 'MANUAL',
      'manuale': 'MANUAL',
      'stick': 'MANUAL'
    };
    
    const transmission = this.findMapping(normalized, transmissionMappings);
    
    // Engine size extraction (1.5, 2.0L, etc.)
    const engineMatch = normalized.match(/\b\d+\.\d+\s*(?:l|litre|liter|litri)?\b/);
    const engineSize = engineMatch ? engineMatch[0].replace(/[^\d.]/g, '') : undefined;
    
    // Make and model extraction using knowledge base
    const { make, makeAlternatives } = this.extractMakeFromDescription(normalized);
    const { model, modelAlternatives } = this.extractModelFromDescription(normalized, make);
    
    return {
      make,
      makeAlternatives,
      model,
      modelAlternatives,
      year,
      fuelType,
      bodyType,
      transmission,
      engineSize,
      manufactureDate: year ? `01-${year}` : undefined,
      rawDescription: description
    };
  }

  /**
   * Perform progressive search through make → model → trim hierarchy
   */
  private async performProgressiveSearch(params: {
    hints: VehicleHints;
    country: string;
    vehicleClass: string;
    companyId: number;
  }): Promise<SearchResult> {
    const path: SearchStep[] = [];
    
    // Step 1: Find make
    const makeResult = await this.searchForMake({
      hint: params.hints.make,
      alternatives: params.hints.makeAlternatives,
      country: params.country,
      vehicleClass: params.vehicleClass
    });
    
    path.push({
      level: 'make',
      input: params.hints.make,
      result: makeResult,
      timestamp: new Date()
    });
    
    if (!makeResult.selected) {
      return { path, status: 'failed_at_make' };
    }
    
    // Step 2: Find model
    const modelResult = await this.searchForModel({
      makeId: makeResult.selected.id,
      makeName: makeResult.selected.name,
      hint: params.hints.model,
      alternatives: params.hints.modelAlternatives,
      year: params.hints.year,
      country: params.country
    });
    
    path.push({
      level: 'model',
      input: params.hints.model,
      result: modelResult,
      timestamp: new Date()
    });
    
    if (!modelResult.selected) {
      return { path, status: 'failed_at_model' };
    }
    
    // Step 3: Find trims
    const trimResult = await this.searchForTrims({
      modelId: modelResult.selected.id,
      hints: params.hints,
      country: params.country,
      companyId: params.companyId
    });
    
    path.push({
      level: 'trim',
      input: this.formatTrimSearch(params.hints),
      result: trimResult,
      timestamp: new Date()
    });
    
    return {
      path,
      status: trimResult.candidates.length > 0 ? 'success' : 'failed_at_trim',
      candidates: trimResult.candidates
    };
  }

  /**
   * Fuzzy matching for makes with intelligent fallbacks
   */
  private async searchForMake(params: {
    hint?: string;
    alternatives?: string[];
    country: string;
    vehicleClass: string;
  }): Promise<MakeSearchResult> {
    // Get all available makes
    const makes = await this.apiClient.getMakes({
      country: params.country,
      vehicleClass: params.vehicleClass
    });
    
    if (!params.hint) {
      return {
        status: 'no_hint',
        candidates: makes,
        selected: undefined
      };
    }
    
    // Try exact match first
    const exactMatch = makes.find(m => 
      m.name.toLowerCase() === params.hint.toLowerCase()
    );
    
    if (exactMatch) {
      return {
        status: 'exact_match',
        selected: exactMatch,
        confidence: 1.0,
        candidates: [exactMatch]
      };
    }
    
    // Try fuzzy matching
    const fuzzyResults = this.performFuzzyMatch(makes, params.hint, 'name');
    
    if (fuzzyResults.bestMatch && fuzzyResults.bestMatch.score > 0.8) {
      return {
        status: 'fuzzy_match',
        selected: fuzzyResults.bestMatch.item,
        confidence: fuzzyResults.bestMatch.score,
        candidates: fuzzyResults.topMatches.map(m => m.item)
      };
    }
    
    // Try alternatives
    if (params.alternatives) {
      for (const alt of params.alternatives) {
        const altResults = this.performFuzzyMatch(makes, alt, 'name');
        if (altResults.bestMatch && altResults.bestMatch.score > 0.8) {
          return {
            status: 'alternative_match',
            selected: altResults.bestMatch.item,
            confidence: altResults.bestMatch.score,
            candidates: altResults.topMatches.map(m => m.item),
            matchedAlternative: alt
          };
        }
      }
    }
    
    // Return top fuzzy matches even if low confidence
    return {
      status: 'low_confidence',
      selected: undefined,
      candidates: fuzzyResults.topMatches.map(m => m.item),
      scores: fuzzyResults.topMatches.map(m => m.score)
    };
  }

  /**
   * Enhanced trim scoring algorithm
   */
  private scoreTrim(trim: TrimDto, hints: VehicleHints): TrimScore {
    const scores: Record<string, number> = {};
    let totalScore = 0;
    let maxPossibleScore = 0;
    
    // Fuel type matching (high weight)
    if (hints.fuelType) {
      maxPossibleScore += 0.25;
      if (trim.fuelType === hints.fuelType) {
        scores.fuelType = 0.25;
        totalScore += 0.25;
      }
    }
    
    // Body type matching
    if (hints.bodyType) {
      maxPossibleScore += 0.15;
      if (trim.bodyType === hints.bodyType) {
        scores.bodyType = 0.15;
        totalScore += 0.15;
      }
    }
    
    // Engine size matching
    if (hints.engineSize) {
      maxPossibleScore += 0.2;
      const engineMatch = this.matchEngineSize(trim.name, hints.engineSize);
      scores.engineSize = engineMatch * 0.2;
      totalScore += scores.engineSize;
    }
    
    // Transmission matching
    if (hints.transmission) {
      maxPossibleScore += 0.15;
      const transMatch = this.matchTransmission(trim.name, hints.transmission);
      scores.transmission = transMatch * 0.15;
      totalScore += scores.transmission;
    }
    
    // Year compatibility
    if (hints.year && trim.productionYears) {
      maxPossibleScore += 0.15;
      const yearScore = this.scoreYearMatch(hints.year, trim.productionYears);
      scores.year = yearScore * 0.15;
      totalScore += scores.year;
    }
    
    // Trim level matching (Sport, Luxury, etc.)
    const trimLevelScore = this.matchTrimLevel(trim.name, hints.rawDescription);
    scores.trimLevel = trimLevelScore * 0.1;
    totalScore += scores.trimLevel;
    maxPossibleScore += 0.1;
    
    // Normalize score
    const normalizedScore = maxPossibleScore > 0 ? 
      totalScore / maxPossibleScore : 
      0.5; // Default score if no criteria to match
    
    return {
      total: normalizedScore,
      breakdown: scores,
      confidence: this.calculateConfidence(scores, maxPossibleScore),
      matches: this.generateMatchDescription(scores, trim, hints)
    };
  }

  /**
   * Generate helpful suggestions when no matches found
   */
  private async generateAlternativeSuggestions(
    hints: VehicleHints, 
    originalArgs: any
  ): Promise<AlternativeSuggestions> {
    const suggestions: AlternativeSuggestions = {
      similarMakes: [],
      commonMisspellings: [],
      availableOptions: {},
      recommendedAction: ''
    };
    
    // Find similar makes
    if (hints.make) {
      const allMakes = await this.apiClient.getMakes({
        country: originalArgs.country,
        vehicleClass: originalArgs.vehicleClass || 'car'
      });
      
      const similar = this.performFuzzyMatch(allMakes, hints.make, 'name');
      suggestions.similarMakes = similar.topMatches
        .slice(0, 5)
        .map(m => ({
          name: m.item.name,
          similarity: m.score,
          suggestion: `Did you mean "${m.item.name}"?`
        }));
    }
    
    // Check common misspellings
    suggestions.commonMisspellings = this.checkCommonMisspellings(hints.make);
    
    // Get available options for guidance
    if (suggestions.similarMakes.length > 0) {
      const topMake = suggestions.similarMakes[0];
      const models = await this.apiClient.getModels({
        country: originalArgs.country,
        vehicleClass: originalArgs.vehicleClass || 'car',
        make: topMake.name
      });
      
      suggestions.availableOptions = {
        make: topMake.name,
        modelCount: models.length,
        sampleModels: models.slice(0, 5).map(m => m.name)
      };
    }
    
    // Generate recommended action
    if (suggestions.similarMakes.length > 0 && suggestions.similarMakes[0].similarity > 0.7) {
      suggestions.recommendedAction = `Try searching with "${suggestions.similarMakes[0].name}" instead`;
    } else if (hints.model && !hints.make) {
      suggestions.recommendedAction = "Try including the make (manufacturer) name in your search";
    } else {
      suggestions.recommendedAction = "Try browsing available makes first, or check the spelling";
    }
    
    return suggestions;
  }

  /**
   * Tool definitions for MCP
   */
  private getToolDefinitions() {
    return [
      {
        name: "find_vehicle_by_description",
        description: "Find and compile vehicles using natural language descriptions. Handles fuzzy matching and provides intelligent suggestions.",
        inputSchema: {
          type: "object",
          properties: {
            description: { 
              type: "string",
              description: "Natural language vehicle description (e.g., '2019 BMW 320d automatic sedan')"
            },
            country: { 
              type: "string",
              enum: ["it", "uk", "de", "fr", "es"],
              description: "Country code for the search"
            },
            vehicleClass: {
              type: "string",
              enum: ["car", "lcv"],
              default: "car",
              description: "Vehicle class (car or light commercial vehicle)"
            },
            companyId: {
              type: "number",
              description: "Company ID for vehicle compilation"
            },
            options: {
              type: "object",
              properties: {
                requireExactMatch: {
                  type: "boolean",
                  default: false,
                  description: "Only return exact matches"
                },
                maxCandidates: {
                  type: "number",
                  default: 5,
                  description: "Maximum number of candidates to return"
                },
                includeAlternatives: {
                  type: "boolean",
                  default: true,
                  description: "Include alternative suggestions"
                }
              }
            }
          },
          required: ["description", "country", "companyId"]
        },
        examples: [
          {
            description: "2019 BMW 320d automatic",
            country: "it",
            companyId: 12345
          },
          {
            description: "Toyota Corolla hybrid 2020",
            country: "uk",
            companyId: 12345,
            options: { maxCandidates: 3 }
          }
        ]
      },
      {
        name: "search_and_compile_vehicle",
        description: "Progressive vehicle search with step-by-step navigation through makes, models, and trims.",
        inputSchema: {
          type: "object",
          properties: {
            country: { 
              type: "string",
              enum: ["it", "uk", "de", "fr", "es"]
            },
            vehicleClass: { 
              type: "string",
              enum: ["car", "lcv"],
              default: "car"
            },
            companyId: { 
              type: "number"
            },
            makeNameOrId: { 
              type: "string",
              description: "Make name or ID (supports fuzzy matching)"
            },
            modelNameOrId: { 
              type: "string",
              description: "Model name or ID (supports fuzzy matching)"
            },
            trimDescription: { 
              type: "string",
              description: "Trim description or characteristics"
            },
            filters: {
              type: "object",
              properties: {
                year: { type: "string" },
                fuelType: { 
                  type: "string",
                  enum: ["DIESEL", "PETROL", "ELECTRIC", "HYBRID", "PLUG_IN_HYBRID", "LPG", "METHANE"]
                },
                bodyType: { 
                  type: "string",
                  enum: ["SEDAN", "HATCHBACK", "SUV", "ESTATE", "COUPE", "CONVERTIBLE", "VAN", "MINIVAN"]
                },
                transmission: {
                  type: "string",
                  enum: ["MANUAL", "AUTOMATIC"]
                },
                manufactureDate: { 
                  type: "string",
                  pattern: "\\d{2}-\\d{4}",
                  description: "Format: MM-YYYY"
                }
              }
            }
          },
          required: ["country", "companyId"]
        }
      },
      {
        name: "get_vehicle_suggestions",
        description: "Get intelligent suggestions based on partial information or when searches fail.",
        inputSchema: {
          type: "object",
          properties: {
            partialInfo: {
              type: "object",
              properties: {
                make: { type: "string" },
                model: { type: "string" },
                year: { type: "string" }
              }
            },
            country: { type: "string" },
            vehicleClass: { type: "string" },
            reason: {
              type: "string",
              enum: ["no_matches", "too_many_matches", "unclear_input"],
              description: "Why suggestions are needed"
            }
          },
          required: ["country"]
        }
      },
      {
        name: "validate_vehicle_selection",
        description: "Validate a vehicle selection before final compilation, checking availability and compatibility.",
        inputSchema: {
          type: "object",
          properties: {
            trimId: { type: "string" },
            provider: { type: "string" },
            companyId: { type: "number" },
            country: { type: "string" },
            vehicleClass: { type: "string" }
          },
          required: ["trimId", "provider", "companyId", "country"]
        }
      }
    ];
  }

  /**
   * Fuzzy matching implementation using multiple algorithms
   */
  private performFuzzyMatch<T>(
    items: T[], 
    search: string, 
    field: keyof T
  ): FuzzyMatchResult<T> {
    const normalizedSearch = search.toLowerCase().trim();
    const scored = items.map(item => {
      const itemValue = String(item[field]).toLowerCase().trim();
      
      // Calculate multiple similarity metrics
      const exactMatch = itemValue === normalizedSearch ? 1 : 0;
      const contains = itemValue.includes(normalizedSearch) || 
                      normalizedSearch.includes(itemValue) ? 0.8 : 0;
      const startsWith = itemValue.startsWith(normalizedSearch) ? 0.9 : 0;
      const levenshtein = this.levenshteinSimilarity(itemValue, normalizedSearch);
      const jaccard = this.jaccardSimilarity(itemValue, normalizedSearch);
      
      // Weighted combination
      const score = Math.max(
        exactMatch,
        contains,
        startsWith,
        (levenshtein * 0.7 + jaccard * 0.3)
      );
      
      return { item, score, field: itemValue };
    });
    
    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);
    
    return {
      bestMatch: scored[0]?.score > 0.5 ? scored[0] : undefined,
      topMatches: scored.slice(0, 10),
      allMatches: scored
    };
  }

  /**
   * Levenshtein distance-based similarity (0-1)
   */
  private levenshteinSimilarity(s1: string, s2: string): number {
    const maxLen = Math.max(s1.length, s2.length);
    if (maxLen === 0) return 1;
    const distance = this.levenshteinDistance(s1, s2);
    return 1 - (distance / maxLen);
  }

  private levenshteinDistance(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,    // deletion
            dp[i][j - 1] + 1,    // insertion
            dp[i - 1][j - 1] + 1 // substitution
          );
        }
      }
    }
    
    return dp[m][n];
  }

  /**
   * Jaccard similarity for token-based matching
   */
  private jaccardSimilarity(s1: string, s2: string): number {
    const tokens1 = new Set(s1.split(/\s+/));
    const tokens2 = new Set(s2.split(/\s+/));
    
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Knowledge base for common variations and mappings
   */
  private initializeKnowledgeBase() {
    this.knowledgeBase = {
      makeVariations: {
        'BMW': ['Bayerische Motoren Werke', 'Bavarian Motor Works'],
        'Mercedes': ['Mercedes-Benz', 'Mercedes Benz', 'MB'],
        'VW': ['Volkswagen', 'Volks Wagen'],
        'Chevy': ['Chevrolet'],
        // ... more variations
      },
      commonMisspellings: {
        'peugeot': ['peugot', 'peugeout', 'pugeot'],
        'volkswagen': ['volkswagon', 'volkwagen'],
        'mercedes': ['mercedez', 'mercedes'],
        // ... more misspellings
      },
      modelAbbreviations: {
        '3er': '3 Series',
        '5er': '5 Series',
        'C-Class': 'C Class',
        'E-Class': 'E Class',
        // ... more abbreviations
      }
    };
  }
}

// Start the MCP server
async function main() {
  const config = {
    apiEndpoint: process.env.VEHICLE_API_ENDPOINT || 'https://api.stockmanagement.com',
    apiKey: process.env.VEHICLE_API_KEY || '',
    port: parseInt(process.env.MCP_PORT || '3000')
  };
  
  const server = new VehicleManagementMCP(config);
  
  const transport = new StdioServerTransport();
  await server.start(transport);
  
  console.error('Vehicle Management MCP Server started');
}

main().catch(console.error);
```

## Usage Examples

### Example 1: Natural Language Search
```javascript
// AI Agent receives: "Find a 2019 BMW 3 series diesel automatic"
const result = await mcp.call("find_vehicle_by_description", {
  description: "2019 BMW 3 series diesel automatic",
  country: "it",
  companyId: 12345
});

// Response:
{
  status: "high_confidence_match",
  vehicle: {
    id: "compiled-vehicle-id",
    make: "BMW",
    model: "Series 3",
    trim: "320d xDrive Automatic",
    year: 2019,
    // ... full vehicle object
  },
  match: {
    confidence: 0.92,
    trim: {
      id: "100037390420221105",
      name: "320d xDrive Automatic",
      provider: "datak"
    },
    matchDetails: {
      make: { confidence: 1.0, matchType: "exact" },
      model: { confidence: 0.9, matchType: "fuzzy", details: "3 series → Series 3" },
      fuel: { confidence: 1.0, matchType: "exact" },
      transmission: { confidence: 1.0, matchType: "inferred", details: "from trim name" }
    }
  }
}
```

### Example 2: Handling Ambiguity
```javascript
// AI Agent receives: "Find a Toyota hybrid"
const result = await mcp.call("find_vehicle_by_description", {
  description: "Toyota hybrid",
  country: "uk",
  companyId: 12345
});

// Response:
{
  status: "multiple_candidates",
  candidates: [
    {
      trim: { id: "...", name: "Corolla 1.8 Hybrid" },
      score: { total: 0.75, breakdown: { make: 1.0, fuel: 1.0 } }
    },
    {
      trim: { id: "...", name: "Prius 1.8 Hybrid" },
      score: { total: 0.75, breakdown: { make: 1.0, fuel: 1.0 } }
    },
    {
      trim: { id: "...", name: "C-HR 1.8 Hybrid" },
      score: { total: 0.75, breakdown: { make: 1.0, fuel: 1.0 } }
    }
  ],
  refinementSuggestions: {
    questions: [
      "Which Toyota model are you looking for?",
      "Do you prefer a sedan (Corolla), hatchback (Prius), or SUV (C-HR)?"
    ],
    filters: ["model", "bodyType", "year"]
  }
}
```

### Example 3: Handling Errors Gracefully
```javascript
// AI Agent receives: "Find a Tezla Model 3" (misspelled)
const result = await mcp.call("find_vehicle_by_description", {
  description: "Tezla Model 3",
  country: "de",
  companyId: 12345
});

// Response:
{
  status: "no_matches",
  suggestions: {
    similarMakes: [
      { name: "Tesla", similarity: 0.83, suggestion: "Did you mean 'Tesla'?" }
    ],
    recommendedAction: "Try searching with 'Tesla' instead"
  },
  possibleIssues: [
    "Make 'Tezla' not found in database",
    "Possible misspelling detected"
  ]
}
```

## Benefits

1. **Reduced Complexity**: Single natural language query instead of multiple API calls
2. **Higher Accuracy**: AI-assisted matching reduces selection errors
3. **Better UX**: Intuitive interaction that matches how users think
4. **Flexible Integration**: Works with any AI agent that supports MCP
5. **Transparent Decision Making**: Confidence scores and match details provide clarity
6. **Graceful Degradation**: Handles partial information and provides helpful alternatives

## Future Enhancements

1. **Learning System**: Track successful selections to improve matching over time
2. **Multi-language Support**: Handle vehicle descriptions in multiple languages
3. **Image Recognition**: Accept vehicle images for identification
4. **VIN Decoding**: Automatic vehicle identification from VIN
5. **Market Intelligence**: Suggest popular configurations based on sales data
6. **Batch Operations**: Handle multiple vehicle selections efficiently
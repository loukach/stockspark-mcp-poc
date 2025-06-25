# Vehicle Creation Flow: StockSpark MCP Integration

**For Product & Tech Teams**

## Overview

This document outlines the complete flow from end-user request to vehicle creation using our Model Context Protocol (MCP) integration with AI agents. The system ensures professional-grade vehicle listings with complete technical specifications.

## Flow Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   END USER      │    │   AI AGENT      │    │   STOCKSPARK    │    │   STOCKSPARK    │
│                 │    │   (Claude)      │    │      MCP        │    │      API        │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │                       │
         │ "Add 2023 BMW 320i"   │                       │                       │
         ├──────────────────────►│                       │                       │
         │                       │ start_vehicle_creation│                       │
         │                       ├──────────────────────►│                       │
         │                       │                       │ findModelsByMake()    │
         │                       │                       ├──────────────────────►│
         │                       │                       │ GET /it/vehicle/models│
         │                       │                       │◄──────────────────────┤
         │                       │                       │ BMW models list       │
         │                       │                       │                       │
         │                       │                       │ getVehicleTrims()     │
         │                       │                       ├──────────────────────►│
         │                       │                       │ GET /it/vehicle/trims │
         │                       │                       │◄──────────────────────┤
         │                       │                       │ 320i trim variants    │
         │                       │ 4 trim options found  │                       │
         │                       │◄──────────────────────┤                       │
         │ "Which variant?"       │                       │                       │
         │◄──────────────────────┤                       │                       │
         │ "M Sport"             │                       │                       │
         ├──────────────────────►│                       │                       │
         │                       │ create_vehicle_from_  │                       │
         │                       │ trim()                │                       │
         │                       ├──────────────────────►│                       │
         │                       │                       │ createVehicle()       │
         │                       │                       ├──────────────────────►│
         │                       │                       │ POST /vehicle         │
         │                       │                       │◄──────────────────────┤
         │                       │                       │ Vehicle created       │
         │                       │ "Vehicle created!"     │                       │
         │                       │◄──────────────────────┤                       │
         │ ✅ Success + Next Steps│                       │                       │
         │◄──────────────────────┤                       │                       │
```

## Detailed Step-by-Step Flow

### **Step 1: End-User Request**
- **Input:** User message: "Add a 2023 BMW 320i to inventory"
- **Logic:** User provides vehicle details to AI Agent
- **Output:** Natural language request with vehicle info

### **Step 2: AI Agent Decision**
- **Input:** User's vehicle description
- **Logic:** AI chooses `start_vehicle_creation` tool (best practice)
- **Output:** MCP tool call: `start_vehicle_creation({ make_name: "bmw", model_name: "320i", year: 2023 })`

### **Step 3: MCP Input Validation**
- **Input:** Tool parameters from AI Agent
- **Logic:** Validate `make_name` required, set defaults (country: "it", vehicle_class: "car")
- **Output:** Validated parameters for API calls

### **Step 4: MCP → API Call #1 (Find Models)**
- **Input:** `{ make_name: "bmw", country: "it", vehicle_class: "car" }`
- **Logic:** `referenceAPI.findModelsByMake()` 
- **API Call:** `GET /it/vehicle/models?make=bmw&vehicle_class=car`
- **Output:** List of BMW models with IDs

### **Step 5: MCP Model Matching**
- **Input:** Models list + user's "320i" 
- **Logic:** Find model containing "320i" → matches "Series 3"
- **Output:** Target model object with ID

### **Step 6: MCP → API Call #2 (Get Trims)**
- **Input:** `{ model_id: "12345", manufacture_date: "01-2023" }`
- **Logic:** `referenceAPI.getVehicleTrims()`
- **API Call:** `GET /it/vehicle/trims?model_id=12345&manufacture_date=01-2023`
- **Output:** Array of trim objects with full specifications

### **Step 7: MCP Response Formatting**
- **Input:** Raw trim data from API
- **Logic:** Format into user-friendly list with specs, IDs, next steps
- **Output:** Structured response with trim options

### **Step 8: AI Agent → User**
- **Input:** MCP formatted response
- **Logic:** Present trim options, ask user to choose specific variant
- **Output:** "Found 4 BMW 320i variants. Which one: Sedan, Touring, xDrive, or M Sport?"

### **Step 9: User Selection**
- **Input:** User choice: "M Sport"
- **Logic:** User selects specific trim variant
- **Output:** User confirmation of desired trim

### **Step 10: AI Agent Second Tool Call**
- **Input:** User's trim choice + required data (price, condition, etc.)
- **Logic:** AI calls `create_vehicle_from_trim` with trim ID
- **Output:** `create_vehicle_from_trim({ providerCode: "123456", provider: "datak", price: 45000, condition: "USED" })`

### **Step 11: MCP → API Call #3 (Create Vehicle)**
- **Input:** Trim data + user's price/condition
- **Logic:** `vehicleAPI.createVehicleFromTrim()` - compiles full vehicle data
- **API Call:** `POST /vehicle` with complete specifications
- **Output:** Created vehicle object with ID

### **Step 12: Final Response**
- **Input:** Created vehicle data
- **Logic:** Format success message with vehicle ID and next steps
- **Output:** "✅ BMW 320i M Sport created (ID: 7890). Next: upload images with upload_vehicle_images_claude"

## Technical Architecture

### **Components Involved**
1. **AI Agent (Claude):** Natural language processing and workflow orchestration
2. **StockSpark MCP:** Tool definitions and business logic
3. **Reference API:** Vehicle database lookups (models, trims, specifications)
4. **Vehicle API:** Vehicle creation and management

### **Data Sources**
- **Professional automotive databases** (Datak, etc.)
- **Millions of trim records** across European markets
- **Complete technical specifications** (engine, emissions, dimensions, equipment)

## Business Benefits

### **Data Quality Advantages**

| Manual Creation (`add_vehicle`) | Guided Creation (`start_vehicle_creation`) |
|--------------------------------|-------------------------------------------|
| ❌ Basic info only | ✅ Complete technical specifications |
| ❌ No emissions data | ✅ CO2 emissions, Euro standards |
| ❌ No engine details | ✅ Engine size, power, torque |
| ❌ Missing dimensions | ✅ Length, width, height, weight |
| ❌ No equipment lists | ✅ Standard equipment included |
| ❌ Generic categorization | ✅ Precise model classification |

### **User Experience Benefits**
- **Natural language interaction:** "Add a BMW 320i" instead of form filling
- **Guided selection:** System presents exact variants available
- **Error prevention:** Database validation prevents incorrect specifications
- **Professional listings:** Complete data improves buyer trust and searchability

### **Operational Benefits**
- **Reduced errors:** Automated specification lookup
- **Faster onboarding:** No need to train users on complex forms
- **Compliance ready:** Automatic emissions and regulatory data
- **Search optimization:** Complete data improves internal and external search results

## Performance Metrics

The MCP includes built-in performance monitoring:
- **Operation tracking:** All API calls timed and logged
- **Success rates:** Error monitoring and fallback handling
- **Optimization suggestions:** AI agent receives performance feedback
- **Self-monitoring:** `get_mcp_performance` tool for diagnostics

## Next Steps for Implementation

1. **Phase 1:** Deploy guided vehicle creation workflow
2. **Phase 2:** Add image upload optimization
3. **Phase 3:** Implement bulk operations and analytics
4. **Phase 4:** Extend to publishing and marketing automation

## Questions for Discussion

1. **Product:** How does this align with our user experience goals?
2. **Tech:** What are the integration requirements with existing systems?
3. **Operations:** How do we measure success and user adoption?
4. **Compliance:** Does the automated data collection meet regulatory requirements?

---

*This flow represents a fundamental shift from manual data entry to AI-guided, database-driven vehicle creation that ensures professional-quality listings with minimal user effort.*
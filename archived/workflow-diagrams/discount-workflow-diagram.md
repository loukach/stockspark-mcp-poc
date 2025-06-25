# StockSpark MCP Discount Workflow

## User Story: "Apply 5% discount to all vehicles with 60+ days in stock and no leads"

```mermaid
flowchart TB
    Start([User Request in Claude Desktop])
    Start --> AI[Claude AI Agent<br/>Plans Workflow]
    
    AI --> T1[1. get_performance_analytics<br/>period: 30d]
    T1 --> API1[StockSpark API<br/>Returns vehicle metrics]
    API1 --> Filter[AI filters:<br/>daysInStock > 60]
    
    Filter --> T2[2. get_vehicle_leads<br/>for each vehicle]
    T2 --> API2[StockSpark API<br/>Returns lead counts]
    API2 --> Filter2[AI filters:<br/>leadCount = 0]
    
    Filter2 --> T3[3. update_vehicle<br/>price × 0.95]
    T3 --> API3[StockSpark API<br/>Updates prices]
    
    API3 --> Result[✓ 15 vehicles updated<br/>with 5% discount]
    
    style Start fill:#e1f5fe
    style AI fill:#fff3e0
    style T1 fill:#f3e5f5
    style T2 fill:#f3e5f5
    style T3 fill:#f3e5f5
    style Filter fill:#fff9c4
    style Filter2 fill:#fff9c4
    style Result fill:#c8e6c9
```

## Simplified Architecture View

```mermaid
flowchart LR
    User[User] --> CD[Claude Desktop]
    CD --> MCP[MCP Server<br/>41 Tools]
    MCP --> API[StockSpark API]
    
    subgraph Tools Used
        T1[get_performance_analytics]
        T2[get_vehicle_leads]
        T3[update_vehicle]
    end
    
    style User fill:#e3f2fd
    style CD fill:#f3e5f5
    style MCP fill:#fff3e0
    style API fill:#e8f5e9
```

## Step-by-Step Process

```mermaid
flowchart TD
    subgraph Step 1: Find Old Vehicles
        S1[get_performance_analytics] --> R1[23 vehicles with<br/>60+ days in stock]
    end
    
    subgraph Step 2: Check Leads
        R1 --> S2[get_vehicle_leads<br/>for each vehicle]
        S2 --> R2[15 vehicles have<br/>zero leads]
    end
    
    subgraph Step 3: Apply Discount
        R2 --> S3[update_vehicle<br/>Apply 5% discount]
        S3 --> R3[✓ Prices updated]
    end
    
    style S1 fill:#e1f5fe
    style S2 fill:#fff3e0
    style S3 fill:#f3e5f5
    style R3 fill:#c8e6c9
```

## Key Benefits Highlighted

```mermaid
mindmap
  root((MCP Benefits))
    Natural Language
      "Apply discount to old stock"
      No coding required
    AI Orchestration
      Chains multiple tools
      Handles complex logic
    Business Value
      Automated pricing
      Lead-based decisions
      60+ day inventory management
```
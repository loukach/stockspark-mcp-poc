# Claude Desktop Configuration Guide

## Overview

The StockSpark MCP server now features **automatic organization discovery**. You no longer need to manually specify company or dealer IDs - the system will discover them based on your user credentials.

## Minimal Configuration

Copy the contents of `claude_desktop_config.example.json` to your Claude Desktop config file:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

## What's Changed

### Before (v1):
```json
{
  "mcpServers": {
    "stockspark": {
      "env": {
        "STOCKSPARK_COUNTRY": "it",
        "STOCKSPARK_COMPANY_ID": "35430",    // ❌ No longer needed
        "STOCKSPARK_DEALER_ID": "196036"     // ❌ No longer needed
      }
    }
  }
}
```

### Now (v2):
```json
{
  "mcpServers": {
    "stockspark": {
      "env": {
        // Company and dealer auto-discovered! ✅
      }
    }
  }
}
```

## How It Works

1. **On startup**, the MCP server:
   - Authenticates with your credentials
   - Fetches all companies you have access to
   - Auto-selects if you have only one company
   - Fetches dealers for the selected company
   - Auto-selects if there's only one dealer

2. **For multi-company users**:
   - Use `get_user_context` to see current selection
   - Use `list_user_companies` to see all options
   - Use `select_company` to switch companies
   - Use `select_dealer` to switch dealers

## Organization Management Tools

```
"Show me my current company and dealer"
→ get_user_context

"List all my companies"
→ list_user_companies

"Switch to company 12345"
→ select_company(12345)

"Show dealers for this company"
→ list_company_dealers

"Use dealer 67890"
→ select_dealer(67890)
```

## Optional Settings

### Portal Publishing Codes
Only add these if you have them:
```json
"MYPORTAL_ACTIVATION_CODE": "your-myportal-code",
"AUTOMOBILE_IT_ACTIVATION_CODE": "your-automobile-it-code"
```

### Default Country
The system defaults to Italian market (`it`). To change default:
```json
"STOCKSPARK_COUNTRY": "fr"  // or "de", "es"
```

### Override Auto-Discovery
If needed, you can still specify fixed IDs:
```json
"STOCKSPARK_COMPANY_ID": "12345",
"STOCKSPARK_DEALER_ID": "67890"
```

## Troubleshooting

### "No company selected" error
1. Run `get_user_context` to check status
2. Run `list_user_companies` to see available companies
3. Run `select_company` with the desired company ID

### Multiple companies/dealers
The system will notify you when selection is required. Use the organization tools to switch between entities as needed.

## Benefits

- ✅ **Zero configuration** - Just add credentials
- ✅ **Multi-tenant support** - Switch companies on the fly
- ✅ **Cleaner setup** - No need to find IDs manually
- ✅ **Better UX** - Clear guidance when selection needed
# Remote MCP Claude Desktop Integration Plan

## Goal
Make StockSpark MCP server accessible to non-technical users through Claude Desktop's Settings > Integrations (remote MCP servers) without requiring local installation.

## Current Status
✅ **Working**: REST API deployed at https://stockspark-mcp-poc.onrender.com  
❌ **Missing**: Claude Desktop remote MCP compatibility

## Requirements for Claude Desktop Remote MCP

### 1. Transport Protocol
- **Current**: HTTP REST endpoints  
- **Required**: Server-Sent Events (SSE) with MCP JSON-RPC protocol
- **Action**: Replace REST endpoints with SSE transport

### 2. OAuth 2.0 Authorization Server
- **Current**: Basic environment variable auth  
- **Required**: Full OAuth 2.0 server with Dynamic Client Registration
- **Action**: Implement OAuth endpoints and flows

### 3. Discovery Endpoints
- **Required**: 
  - `/.well-known/oauth-authorization-server`
  - `/.well-known/oauth-protected-resource`
- **Action**: Add discovery metadata endpoints

## Implementation Plan (Simplest Approach)

### Phase 1: SSE Transport Layer (6-8 hours)
Replace Express REST with SSE + MCP JSON-RPC:

```javascript
// Replace current endpoints with:
app.get('/mcp', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  
  // Handle MCP JSON-RPC messages over SSE
  handleMCPConnection(res);
});
```

**Tools to use**: 
- `@modelcontextprotocol/sdk` SSE transport (if available)
- Or build minimal SSE + JSON-RPC handler

### Phase 2: Minimal OAuth Server (12-16 hours)
Implement OAuth 2.0 with Dynamic Client Registration:

```javascript
// Required endpoints:
app.get('/.well-known/oauth-authorization-server', getOAuthMetadata);
app.get('/.well-known/oauth-protected-resource', getResourceMetadata);
app.post('/oauth/register', registerClient);           // Dynamic Client Registration
app.get('/oauth/authorize', showAuthorizePage);        // User consent
app.post('/oauth/authorize', handleAuthorization);     // Process consent
app.post('/oauth/token', issueTokens);                 // Token exchange
```

**Simplifications**:
- Use in-memory storage (restart clears registrations - acceptable for POC)
- Minimal consent UI (single "Allow/Deny" page)
- No refresh tokens (simpler, tokens expire and re-auth)
- Use `node-oauth2-server` library to handle complexity

### Phase 3: Integration & Testing (4-6 hours)
- Test with Claude Desktop Settings > Integrations
- Debug OAuth flow issues
- Handle edge cases

## Technology Stack (Minimal Dependencies)

### Core Libraries
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12.1",    // MCP protocol
    "node-oauth2-server": "^4.0.0",           // OAuth framework
    "express": "^4.18.2",                     // Web server
    "uuid": "^9.0.0",                         // Client ID generation
    "crypto": "built-in"                      // Token generation
  }
}
```

### File Structure
```
src/
├── http-server.js              # Current REST API (keep)
├── mcp-sse-server.js          # New SSE MCP server
├── oauth/
│   ├── server.js              # OAuth 2.0 server setup
│   ├── handlers.js            # OAuth endpoint handlers
│   ├── storage.js             # In-memory client/token storage
│   └── views/
│       └── authorize.html     # Consent page
└── mcp-tool-handlers.js       # Existing tool handlers (reuse)
```

## OAuth Flow (Simplified)

### 1. Client Registration (Dynamic)
```
Claude Desktop → POST /oauth/register
Server → Generate client_id, return registration data
```

### 2. Authorization Request
```
Claude Desktop → GET /oauth/authorize?client_id=X&code_challenge=Y
User → Sees consent page, clicks "Allow"
Server → Redirect to claude://oauth-callback?code=Z
```

### 3. Token Exchange
```
Claude Desktop → POST /oauth/token {code: Z, code_verifier: W}
Server → Return access_token
```

### 4. MCP Access
```
Claude Desktop → SSE connection with Authorization: Bearer {access_token}
Server → Validate token, serve MCP tools
```

## Deployment Strategy

### Option A: Separate Service
Deploy new MCP-SSE server alongside current REST API:
- `https://stockspark-mcp-poc.onrender.com` (current REST)
- `https://stockspark-mcp-claude.onrender.com` (new MCP-SSE)

### Option B: Combined Service  
Add MCP-SSE endpoints to existing server:
- `https://stockspark-mcp-poc.onrender.com/api/*` (REST)
- `https://stockspark-mcp-poc.onrender.com/mcp` (SSE)
- `https://stockspark-mcp-poc.onrender.com/oauth/*` (OAuth)

**Recommendation**: Option B (combined) for simplicity.

## Estimated Timeline

| Phase | Tasks | Time | Dependencies |
|-------|-------|------|--------------|
| 1 | SSE Transport | 6-8 hours | MCP SDK research |
| 2 | OAuth Server | 12-16 hours | node-oauth2-server setup |
| 3 | Testing | 4-6 hours | Claude Desktop access |
| **Total** | **Full remote MCP** | **22-30 hours** | **3-4 days** |

## Success Criteria

✅ **User Experience**: 
1. User goes to Claude Desktop → Settings → Integrations
2. Clicks "Add Integration" 
3. Enters: `https://stockspark-mcp-poc.onrender.com`
4. Authorizes via consent page
5. All 41 StockSpark tools appear in Claude Desktop

✅ **Technical**:
- SSE connection established
- OAuth flow completes successfully  
- All existing MCP tools work via remote connection
- Maintains existing REST API for other use cases

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Claude Desktop OAuth quirks | High | Extensive testing, follow exact spec |
| SSE connection issues | Medium | Use proven MCP SDK if available |
| Token security | Medium | Short expiration, HTTPS only |
| Render.com limitations | Low | Test OAuth redirects work on platform |

## Alternative: Hybrid Approach

If full OAuth is too complex, consider:
1. **Keep current REST API** (working, useful)
2. **Build simple MCP bridge tool** that users run locally:
   ```bash
   npx @stockspark/mcp-bridge https://stockspark-mcp-poc.onrender.com
   ```
   This bridges remote REST API to local MCP stdio for Claude Desktop.

**Effort**: 1-2 hours vs 20-30 hours for full OAuth server.

---

## Next Steps

1. **Decision**: Full OAuth server vs Simple bridge tool?
2. **If OAuth**: Start with Phase 1 (SSE transport)
3. **If Bridge**: Build simple npm package that proxies REST→MCP stdio
4. **Test**: Validate with Claude Desktop integration

**Recommendation**: Try bridge tool first (much simpler), fall back to full OAuth if needed.
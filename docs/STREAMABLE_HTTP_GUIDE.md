# Streamable HTTP Transport Guide

Complete guide to using the Streamable HTTP transport in Yasban MCP Runtime.

**MCP Specification**: 2025-03-26
**Status**: ✅ Recommended (replaces SSE and HTTP transports)
**Last Updated**: 2025-10-11

---

## 📋 Table of Contents

1. [What is Streamable HTTP?](#what-is-streamable-http)
2. [Why Streamable HTTP?](#why-streamable-http)
3. [Getting Started](#getting-started)
4. [API Reference](#api-reference)
5. [Testing](#testing)
6. [Comparison with Old Transports](#comparison-with-old-transports)
7. [Migration Guide](#migration-guide)
8. [Troubleshooting](#troubleshooting)

---

## What is Streamable HTTP?

Streamable HTTP is the **modern MCP transport** introduced in the MCP specification 2025-03-26. It replaces the old HTTP+SSE dual-transport pattern with a **single unified endpoint** that can:

- Handle simple request/response (like HTTP)
- Upgrade to SSE streaming for long-running operations (like SSE)
- Support server-to-client notifications
- Provide resumable connections with `Last-Event-ID`
- Manage sessions with `Mcp-Session-Id` header

### **Key Features**

```
┌──────────────────────────────────────────────────────────┐
│              Streamable HTTP Transport                   │
│                                                          │
│  Single Endpoint: /mcp                                   │
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐         │
│  │   POST     │  │    GET     │  │  DELETE    │         │
│  │            │  │            │  │            │         │
│  │ Send JSON  │  │ Resume     │  │  Close     │         │
│  │ -RPC msg   │  │ connection │  │  session   │         │
│  │            │  │            │  │            │         │
│  │ Auto-      │  │ With Last- │  │ Cleanup    │         │
│  │ upgrade    │  │ Event-ID   │  │ resources  │         │
│  │ to SSE     │  │            │  │            │         │
│  └────────────┘  └────────────┘  └────────────┘         │
│                                                          │
│  Features:                                               │
│  ✓ Session management (Mcp-Session-Id header)           │
│  ✓ Automatic SSE upgrade when streaming needed          │
│  ✓ Resumable connections (Last-Event-ID header)         │
│  ✓ Server-to-client notifications support               │
│  ✓ Cryptographically secure session IDs                 │
└──────────────────────────────────────────────────────────┘
```

---

## Why Streamable HTTP?

### **Problems with Old Pattern (HTTP + SSE)**

The old pattern required **two separate transports**:

```
Old Pattern (DEPRECATED):
┌─────────────────────────────────────────────────────────┐
│  HTTP Transport          SSE Transport                  │
│  /message endpoint       /sse endpoint                  │
│                                                         │
│  POST /message     →     GET /sse                       │
│  {jsonrpc request}       event: message                 │
│                          data: {jsonrpc response}       │
│                                                         │
│  Problems:                                              │
│  ❌ Two endpoints to manage                             │
│  ❌ Complex client implementation                       │
│  ❌ Race conditions between HTTP and SSE                │
│  ❌ No resumability                                     │
│  ❌ Session management unclear                          │
└─────────────────────────────────────────────────────────┘
```

### **Solution: Streamable HTTP (NEW)**

```
New Pattern (RECOMMENDED):
┌─────────────────────────────────────────────────────────┐
│              Single Endpoint: /mcp                      │
│                                                         │
│  POST /mcp                                              │
│  {jsonrpc request}                                      │
│                                                         │
│  Response:                                              │
│  • Simple JSON response (if no streaming needed)        │
│  • OR auto-upgrade to SSE stream (if streaming needed) │
│                                                         │
│  Benefits:                                              │
│  ✅ Single endpoint (simple)                            │
│  ✅ Automatic protocol upgrade                          │
│  ✅ Built-in resumability                               │
│  ✅ Session management via headers                      │
│  ✅ Cleaner client implementation                       │
└─────────────────────────────────────────────────────────┘
```

---

## Getting Started

### **1. Starting the Server**

```bash
# Start MCP server with Streamable HTTP transport
yasban-mcp \
  --server <server-id> \
  --transport streamable-http \
  --port 3000
```

**Example:**

```bash
cd packages/mcp-runtime

node dist/index.js \
  --server 78b54f36-3da1-409c-862a-9b7b46a3863c \
  --transport streamable-http \
  --port 3100
```

### **2. Optional: Enable Authentication**

```bash
# Set authentication token as environment variable
export MCP_AUTH_TOKEN="your-secret-token-here"

# OR pass via CLI
yasban-mcp \
  --server <server-id> \
  --transport streamable-http \
  --port 3000 \
  --auth-token "your-secret-token-here"
```

All requests (except `/health` and `/info`) will require:
```
Authorization: Bearer your-secret-token-here
```

### **3. Verify Server is Running**

```bash
# Health check (no auth required)
curl http://localhost:3000/health

# Expected response:
{
  "status": "healthy",
  "server": "my-server-name",
  "serverId": "78b54f36-...",
  "toolCount": 5,
  "transport": "streamable-http",
  "spec": "2025-03-26"
}
```

---

## API Reference

### **Endpoints**

#### **GET /health**

Health check endpoint (no authentication required).

```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "healthy",
  "server": "my-server",
  "serverId": "78b54f36-3da1-409c-862a-9b7b46a3863c",
  "toolCount": 5,
  "transport": "streamable-http",
  "spec": "2025-03-26"
}
```

---

#### **GET /info**

Server information endpoint (no authentication required).

```bash
curl http://localhost:3000/info
```

**Response:**
```json
{
  "server": {
    "id": "78b54f36-3da1-409c-862a-9b7b46a3863c",
    "name": "my-server",
    "description": "My MCP server",
    "transport": "streamable-http",
    "spec": "2025-03-26"
  },
  "tools": [
    {
      "id": "tool-1",
      "name": "get_users",
      "description": "Get list of users",
      "type": "sql",
      "parameterCount": 2
    }
  ],
  "endpoints": {
    "mcp": "/mcp",
    "health": "/health",
    "info": "/info"
  }
}
```

---

#### **POST /mcp**

Main MCP endpoint for sending JSON-RPC messages.

**Headers:**
```
Content-Type: application/json
Accept: application/json, text/event-stream
Authorization: Bearer <token>  (if auth enabled)
Mcp-Session-Id: <session-id>  (optional, for existing session)
```

**Request Body:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {
      "name": "my-client",
      "version": "1.0.0"
    }
  }
}
```

**Response (Simple JSON):**

If no streaming needed:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {}
    },
    "serverInfo": {
      "name": "my-server",
      "version": "1.0.0"
    }
  }
}
```

**Response (SSE Stream):**

If streaming needed (automatic upgrade):
```
Content-Type: text/event-stream
Mcp-Session-Id: 201b8619-e588-4583-b96f-151b65c9ace2

event: message
id: 1
data: {"jsonrpc":"2.0","id":1,"result":{...}}

event: notification
id: 2
data: {"jsonrpc":"2.0","method":"notifications/progress","params":{...}}
```

---

#### **GET /mcp**

Resume a broken connection (resumability feature).

**Headers:**
```
Last-Event-ID: <last-received-event-id>
Mcp-Session-Id: <session-id>
```

**Response:**
```
Content-Type: text/event-stream

event: message
id: 3
data: {"jsonrpc":"2.0","id":2,"result":{...}}
```

---

#### **DELETE /mcp**

Close a session and cleanup resources.

**Headers:**
```
Mcp-Session-Id: <session-id>
```

**Response:**
```
204 No Content
```

---

## Testing

### **Test 1: Health Check**

```bash
curl http://localhost:3000/health
```

**Expected:**
```json
{"status":"healthy","transport":"streamable-http","spec":"2025-03-26"}
```

---

### **Test 2: Server Info**

```bash
curl http://localhost:3000/info
```

**Expected:**
```json
{
  "server": {...},
  "tools": [...],
  "endpoints": {...}
}
```

---

### **Test 3: Initialize Session**

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "test-client", "version": "1.0.0"}
    }
  }'
```

**Expected:**
```
Content-Type: text/event-stream
Mcp-Session-Id: 201b8619-e588-4583-b96f-151b65c9ace2

event: message
id: 1
data: {"jsonrpc":"2.0","id":1,"result":{...}}
```

**Note:** Save the `Mcp-Session-Id` from response headers for subsequent requests.

---

### **Test 4: List Tools**

```bash
# Use session ID from previous test
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: 201b8619-e588-4583-b96f-151b65c9ace2" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }'
```

**Expected:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "get_users",
        "description": "Get list of users",
        "inputSchema": {...}
      }
    ]
  }
}
```

---

### **Test 5: Call Tool**

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: 201b8619-e588-4583-b96f-151b65c9ace2" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "get_users",
      "arguments": {
        "limit": 10
      }
    }
  }'
```

**Expected:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "[{\"id\":1,\"name\":\"John\"},{\"id\":2,\"name\":\"Jane\"}]"
      }
    ]
  }
}
```

---

### **Test 6: With Authentication**

```bash
# Set auth token
export MCP_AUTH_TOKEN="my-secret-token"

# Restart server with auth enabled
yasban-mcp --server <id> --transport streamable-http --port 3000

# Test with Bearer token
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer my-secret-token" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {...}
  }'
```

**Without token:**
```json
{
  "error": "Unauthorized",
  "message": "Missing Authorization header"
}
```

---

## Comparison with Old Transports

| Feature | **Streamable HTTP** (NEW) | SSE (DEPRECATED) | HTTP (DEPRECATED) |
|---------|---------------------------|------------------|-------------------|
| **Endpoints** | Single `/mcp` endpoint | Dual `/message` + `/sse` | Single `/message` |
| **Streaming** | ✅ Auto-upgrade to SSE | ✅ Always SSE | ❌ No streaming |
| **Session Management** | ✅ `Mcp-Session-Id` header | ⚠️ Manual tracking | ❌ Stateless |
| **Resumability** | ✅ `Last-Event-ID` support | ❌ No resumability | ❌ No resumability |
| **Server Notifications** | ✅ Supported | ✅ Supported | ❌ Not supported |
| **Complexity** | ⭐ Simple | ⭐⭐⭐ Complex | ⭐⭐ Moderate |
| **MCP Spec** | ✅ 2025-03-26 (current) | ⚠️ Deprecated | ⚠️ Deprecated |
| **Recommended For** | **All remote access** | Legacy systems | Simple REST-only |

---

## Migration Guide

### **From SSE Transport**

**Old code (SSE):**
```bash
yasban-mcp --server <id> --transport sse --port 3000
```

**New code (Streamable HTTP):**
```bash
yasban-mcp --server <id> --transport streamable-http --port 3000
```

**Client changes:**
- **Before:** Connect to `GET /sse` for streaming, `POST /message` for requests
- **After:** Use single `POST /mcp` endpoint for everything
- **Session:** Save `Mcp-Session-Id` from response headers, include in subsequent requests

---

### **From HTTP Transport**

**Old code (HTTP):**
```bash
yasban-mcp --server <id> --transport http --port 3000
```

**New code (Streamable HTTP):**
```bash
yasban-mcp --server <id> --transport streamable-http --port 3000
```

**Client changes:**
- **Before:** `POST /message` for all requests (no streaming)
- **After:** `POST /mcp` with automatic SSE upgrade when needed
- **Benefit:** Now supports streaming and notifications without changing client code

---

## Troubleshooting

### **Problem: Connection Refused**

```
curl: (7) Failed to connect to localhost port 3000: Connection refused
```

**Solution:**
1. Verify server is running: `ps aux | grep yasban-mcp`
2. Check port is correct: `netstat -an | grep 3000`
3. Check server logs for errors

---

### **Problem: Unauthorized (401)**

```json
{
  "error": "Unauthorized",
  "message": "Invalid authorization token"
}
```

**Solution:**
1. Verify token is correct: `echo $MCP_AUTH_TOKEN`
2. Include `Authorization: Bearer <token>` header
3. If testing without auth, don't set `MCP_AUTH_TOKEN` environment variable

---

### **Problem: Invalid Session ID**

```json
{
  "error": "Invalid session"
}
```

**Solution:**
1. Check `Mcp-Session-Id` header is included
2. Verify session ID matches the one from `initialize` response
3. Session may have expired (restart with `initialize`)

---

### **Problem: SSE Stream Not Working**

```
No event stream received
```

**Solution:**
1. Ensure `Accept: text/event-stream` header is included
2. Use curl with `-N` flag: `curl -N -X POST ...`
3. Check firewall isn't blocking SSE connections
4. Verify client supports SSE (HTTP/1.1 required)

---

## Additional Resources

- **MCP Specification**: https://spec.modelcontextprotocol.io/specification/2025-03-26/basic/transports/
- **MCP SDK Documentation**: https://github.com/modelcontextprotocol/typescript-sdk
- **Yasban Architecture**: `docs/ARCHITECTURE.md`
- **Implementation**: `packages/mcp-runtime/src/transports/streamable-http.ts`

---

**Maintained By**: Yasban Core Team
**License**: MIT
**Last Updated**: 2025-10-11

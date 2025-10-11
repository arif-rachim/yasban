# Yasban MCP Runtime

Standalone MCP (Model Context Protocol) server for Yasban-created tools.

## Features

✅ **3 Transport Types**:
- **stdio** - For Claude Desktop (JSON-RPC over stdin/stdout)
- **SSE** - For web-based clients (Server-Sent Events)
- **HTTP** - For REST-like integrations

✅ **Dynamic Tool Loading**: Loads tools from SQLite database

✅ **All Tool Types Supported**: SQL, REST, Webhook, JavaScript

## Status

🚧 **In Development** - Core structure complete, needs executor refactoring

### Completed:
- ✅ Package structure and TypeScript configuration
- ✅ Config loader (reads from SQLite via Prisma)
- ✅ Tool registry (dynamic registration)
- ✅ stdio transport (Claude Desktop ready)
- ✅ SSE transport (web clients ready)
- ✅ HTTP transport (REST API ready)
- ✅ CLI interface with commander

### Next Steps:
1. **Refactor Executors**: Create standalone versions without Next.js dependencies
2. **Build & Test**: Compile and test with real server data
3. **Claude Desktop Integration**: Test end-to-end with Claude Desktop
4. **Documentation**: Usage examples and API reference

## Architecture

```
mcp-runtime/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── config-loader.ts      # Load from SQLite
│   ├── tools/
│   │   ├── registry.ts       # Dynamic tool registration
│   │   ├── sql-tool.ts       # SQL executor wrapper
│   │   ├── rest-tool.ts      # REST executor wrapper
│   │   ├── webhook-tool.ts   # Webhook executor wrapper
│   │   └── javascript-tool.ts # JS executor wrapper
│   ├── transports/
│   │   ├── stdio.ts          # stdio transport
│   │   ├── sse.ts            # SSE transport
│   │   └── http.ts           # HTTP transport
│   └── utils/
│       └── logger.ts         # Winston logger
└── package.json
```

## Planned Usage

### stdio (Claude Desktop)
```bash
yasban-mcp --server <server-id>
```

### SSE (Web Clients)
```bash
yasban-mcp --server <server-id> --transport sse --port 3000
```

### HTTP (REST API)
```bash
yasban-mcp --server <server-id> --transport http --port 8080
```

## Claude Desktop Configuration

Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "my-yasban-server": {
      "command": "yasban-mcp",
      "args": ["--server", "<server-id-from-database>"]
    }
  }
}
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run in dev mode
npm run dev -- --server <server-id>
```

## License

MIT

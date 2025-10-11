# Yasban - System Architecture

Comprehensive system architecture, design patterns, and implementation details.

**Last Updated**: 2025-10-08

---

## 📐 System Overview

Yasban is a desktop application built with Electron and Next.js that enables users to create MCP (Model Context Protocol) servers visually. The architecture follows a clear separation of concerns between the Electron main process, renderer process (Next.js UI), and the MCP runtime.

### **High-Level Architecture**

```
┌─────────────────────────────────────────────────────────────────┐
│                      YASBAN DESKTOP APP                         │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                 Electron (Viewer Only)                   │  │
│  │              • Displays Next.js in webview               │  │
│  │              • No business logic                         │  │
│  │              • Window management only                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Next.js 15 (Full App Logic)                 │  │
│  │                                                          │  │
│  │  ┌────────────────┐        ┌──────────────────────────┐  │  │
│  │  │ React UI       │        │   Server Actions         │  │  │
│  │  │ • Forms        │───────►│   • createTool()         │  │  │
│  │  │ • Tables       │        │   • updateTool()         │  │  │
│  │  │ • Dialogs      │        │   • deleteTool()         │  │  │
│  │  │ • Dashboards   │        │   • testTool()           │  │  │
│  │  └────────────────┘        │   • testConnection()     │  │  │
│  │                            └──────────────────────────┘  │  │
│  │  ┌────────────────┐                    │                │  │
│  │  │ Monaco Editor  │                    ▼                │  │
│  │  │ (SQL/JS)       │        ┌──────────────────────────┐  │  │
│  │  └────────────────┘        │   Prisma Client          │  │  │
│  │                            │   (SQLite)               │  │  │
│  │                            └──────────────────────────┘  │  │
│  │                                        │                │  │
│  │                                        ▼                │  │
│  │                            ┌──────────────────────────┐  │  │
│  │                            │   Service Manager        │  │  │
│  │                            │   • node-windows         │  │  │
│  │                            │   • node-linux           │  │  │
│  │                            └──────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
                                           │
                                           │ Spawns/Manages
                                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MCP RUNTIME (Separate Process)               │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │               MCP Server (Node.js)                       │  │
│  │                                                          │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │  │
│  │  │ Config       │  │ Hot-Reload   │  │ Tool         │  │  │
│  │  │ Loader       │  │ Watcher      │  │ Registry     │  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │  │
│  │         │                   │                 │         │  │
│  │         └─────────────┬─────────────────────┬┘         │  │
│  │                       ▼                     ▼           │  │
│  │         ┌─────────────────────────────────────────┐    │  │
│  │         │      Tool Executors                     │    │  │
│  │         │  ┌─────────┐  ┌─────────┐  ┌─────────┐ │    │  │
│  │         │  │   SQL   │  │  REST   │  │ Webhook │ │    │  │
│  │         │  │Executor │  │Executor │  │Executor │ │    │  │
│  │         │  └─────────┘  └─────────┘  └─────────┘ │    │  │
│  │         └─────────────────────────────────────────┘    │  │
│  │                       │                                 │  │
│  │                       ▼                                 │  │
│  │         ┌─────────────────────────────────────────┐    │  │
│  │         │      MCP SDK (@modelcontextprotocol)    │    │  │
│  │         │  ┌─────────┐  ┌──────────────────────┐ │    │  │
│  │         │  │ stdio   │  │  Streamable HTTP     │ │    │  │
│  │         │  │         │  │  (MCP spec 2025-03)  │ │    │  │
│  │         │  └─────────┘  └──────────────────────┘ │    │  │
│  │         │  (SSE & HTTP deprecated)               │    │  │
│  │         └─────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                             │
                             │ MCP Protocol
                             ▼
                    ┌─────────────────┐
                    │  Claude Desktop │
                    │  (AI Assistant) │
                    └─────────────────┘
```

---

## 🏗️ Component Architecture

### **1. Electron Process**

**Responsibility**: Window management and hosting Next.js application only. All business logic is handled by Next.js.

**Components:**

#### **1.1 Main Process** (`electron/main.ts`)

Simple window creation and management.

```typescript
// electron/main.ts
import { app, BrowserWindow } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null;

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  // Load Next.js app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../out/index.html'));
  }
});
```

**No IPC handlers** - All communication is handled within Next.js using Server Actions.

#### **1.2 Database Access** (`src/lib/prisma.ts`)

Prisma client for Next.js Server Actions.

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

#### **1.3 Service Manager** (`src/lib/service-manager.ts`)

Manages OS services/daemons.

```typescript
// electron/services/windows-service.ts
import { Service } from 'node-windows';

export class WindowsServiceManager {
  install(serverId: string, serverName: string) {
    const svc = new Service({
      name: `Yasban-${serverName}`,
      description: `Yasban MCP Server: ${serverName}`,
      script: path.join(__dirname, '../../mcp-runtime/dist/server.js'),
      env: [
        { name: 'SERVER_ID', value: serverId },
        { name: 'DATABASE_URL', value: getDatabaseUrl() }
      ]
    });

    svc.on('install', () => {
      svc.start();
    });

    svc.install();
  }

  // start(), stop(), uninstall() methods...
}
```

#### **1.4 Encryption** (`electron/crypto/`)

AES-256-GCM encryption for credentials.

```typescript
// electron/crypto/encryption.ts
import crypto from 'crypto';
import { machineIdSync } from 'node-machine-id';

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const machineId = machineIdSync();
  return crypto.scryptSync(machineId, 'yasban-salt', 32);
}

export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, encrypted] = ciphertext.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

---

### **2. Next.js Application**

**Responsibility**: User interface, state management, business logic, database access, and all application functionality.

**Components:**

#### **2.1 Pages** (`src/app/`)

Next.js App Router pages with Server Actions.

```
src/app/
├── layout.tsx                 # Root layout
├── page.tsx                   # Dashboard
├── servers/
│   ├── page.tsx              # Server list
│   └── [id]/
│       ├── page.tsx          # Server detail
│       ├── tools/
│       │   ├── page.tsx      # Tool list
│       │   ├── new/page.tsx  # Create tool
│       │   └── [toolId]/page.tsx # Edit tool
│       ├── connections/page.tsx  # Connection manager
│       └── logs/page.tsx         # Logs
├── templates/page.tsx        # Template browser
└── settings/page.tsx         # Settings
```

#### **2.2 State Management**

**No global state management library needed.** State is managed by React Server Components and Next.js:

- **Server State**: Data fetched in Server Components, automatically cached by Next.js
- **Form State**: Managed by `useActionState` hook with Server Actions
- **UI State**: Minimal client state using React `useState` for modals, dialogs, etc.

```typescript
// Server Component - Fetches data on server
export default async function ToolsPage({ params }) {
  const tools = await prisma.tool.findMany({ where: { serverId: params.id } });
  return <ToolsTable tools={tools} />;
}

// Client Component - Minimal UI state
'use client';
export function ToolsTable({ tools }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  // UI state only, no global state needed
}
```

**Benefits:**
- No state synchronization issues
- Automatic data fetching and caching
- Simpler architecture
- Better performance (data fetched on server)

#### **2.3 Server Actions** (`src/app/*/actions.ts`)

Next.js Server Actions handle all business logic.

```typescript
// src/app/servers/[id]/tools/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';

export async function createTool(formData: FormData) {
  const serverId = formData.get('serverId') as string;
  const name = formData.get('name') as string;
  const type = formData.get('type') as string;

  const tool = await prisma.tool.create({
    data: { serverId, name, type, config: '{}' }
  });

  revalidatePath(`/servers/${serverId}/tools`);
  return { success: true, data: tool };
}

export async function updateTool(formData: FormData) {
  // Similar implementation
}

export async function testTool(toolId: string, parameters: Record<string, any>) {
  const { testTool: executeTool } = await import('@/lib/tool-tester');

  const tool = await prisma.tool.findUnique({ where: { id: toolId } });
  const config = JSON.parse(tool.config);

  return await executeTool(tool.type, config, parameters, tool.serverId);
}
```

---

### **3. MCP Runtime**

**Responsibility**: MCP server execution, tool execution, hot-reload.

**Components:**

#### **3.1 Server Bootstrap** (`mcp-runtime/src/server.ts`)

Main MCP server entry point.

```typescript
// mcp-runtime/src/server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ConfigLoader } from './config-loader.js';
import { HotReloadWatcher } from './hot-reload.js';
import { ToolRegistry } from './tool-registry.js';

const serverId = process.env.SERVER_ID!;
const config = await ConfigLoader.load(serverId);

// Create MCP server
const server = new Server(
  {
    name: config.name,
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tools
const toolRegistry = new ToolRegistry(config);
await toolRegistry.registerAll(server);

// Start transport
let transport;
switch (config.transport) {
  case 'stdio':
    transport = new StdioServerTransport();
    break;
  case 'streamable-http':  // RECOMMENDED (MCP spec 2025-03-26)
    transport = new StreamableHTTPServerTransport(config.port);
    break;
  case 'sse':  // DEPRECATED
    transport = new SSEServerTransport(config.port);
    break;
  case 'http':  // DEPRECATED
    transport = new HTTPServerTransport(config.port);
    break;
}

await server.connect(transport);

// Start hot-reload watcher
const hotReload = new HotReloadWatcher(serverId, server, toolRegistry);
await hotReload.start();

console.log(`MCP server started: ${config.name}`);
```

#### **3.2 Config Loader** (`mcp-runtime/src/config-loader.ts`)

Loads server configuration from database.

```typescript
// mcp-runtime/src/config-loader.ts
import { PrismaClient } from '@prisma/client';
import { decrypt } from './crypto.js';

export class ConfigLoader {
  static async load(serverId: string) {
    const prisma = new PrismaClient();

    const server = await prisma.server.findUnique({
      where: { id: serverId },
      include: {
        tools: {
          include: {
            parameters: true
          }
        },
        connections: true
      }
    });

    if (!server) throw new Error(`Server ${serverId} not found`);

    // Decrypt connection configs
    const connections = server.connections.map(conn => ({
      ...conn,
      config: JSON.parse(decrypt(conn.config))
    }));

    return {
      ...server,
      connections
    };
  }
}
```

#### **3.3 Hot-Reload Watcher** (`mcp-runtime/src/hot-reload.ts`)

Watches for config changes and reloads gracefully.

```typescript
// mcp-runtime/src/hot-reload.ts
import crypto from 'crypto';
import { ConfigLoader } from './config-loader.js';

export class HotReloadWatcher {
  private serverId: string;
  private server: Server;
  private toolRegistry: ToolRegistry;
  private currentChecksum: string = '';
  private reloadInProgress: boolean = false;

  constructor(serverId: string, server: Server, toolRegistry: ToolRegistry) {
    this.serverId = serverId;
    this.server = server;
    this.toolRegistry = toolRegistry;
  }

  async start() {
    // Poll every 2 seconds
    setInterval(async () => {
      if (this.reloadInProgress) return;

      const newChecksum = await this.getConfigChecksum();

      if (newChecksum !== this.currentChecksum) {
        console.log('[Hot-Reload] Config changed, reloading...');
        this.currentChecksum = newChecksum;
        await this.gracefulReload();
      }
    }, 2000);

    this.currentChecksum = await this.getConfigChecksum();
  }

  private async getConfigChecksum(): Promise<string> {
    const config = await ConfigLoader.load(this.serverId);
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(config));
    return hash.digest('hex');
  }

  private async gracefulReload() {
    this.reloadInProgress = true;

    try {
      // 1. Pause new requests
      console.log('[Hot-Reload] Pausing new requests...');
      this.toolRegistry.pause();

      // 2. Wait for in-flight requests (max 5s)
      await this.waitForInflight(5000);

      // 3. Reload config
      console.log('[Hot-Reload] Loading new config...');
      const newConfig = await ConfigLoader.load(this.serverId);

      // 4. Re-register tools
      console.log('[Hot-Reload] Re-registering tools...');
      await this.toolRegistry.unregisterAll();
      await this.toolRegistry.registerAll(this.server, newConfig);

      // 5. Resume
      console.log('[Hot-Reload] Resuming...');
      this.toolRegistry.resume();

      console.log('[Hot-Reload] ✅ Reload complete!');
    } catch (error) {
      console.error('[Hot-Reload] ❌ Reload failed:', error);
    } finally {
      this.reloadInProgress = false;
    }
  }

  private async waitForInflight(timeoutMs: number) {
    const start = Date.now();
    while (this.toolRegistry.getInflightCount() > 0) {
      if (Date.now() - start > timeoutMs) {
        console.warn('[Hot-Reload] Timeout waiting for in-flight');
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}
```

#### **3.4 Tool Executors** (`mcp-runtime/src/tools/`)

Execute tool logic.

```typescript
// mcp-runtime/src/tools/sql-executor.ts
import { Pool } from 'pg';
import mysql from 'mysql2/promise';
import tedious from 'tedious';
import Database from 'better-sqlite3';

export class SQLExecutor {
  private pool: any;
  private config: any;

  constructor(connectionConfig: any, toolConfig: any) {
    this.config = toolConfig;
    this.initPool(connectionConfig);
  }

  async execute(params: any): Promise<any> {
    const { query, parameters } = this.buildQuery(params);

    // Safety checks
    if (this.config.readOnly && !this.isReadOnlyQuery(query)) {
      throw new Error('Read-only mode: only SELECT queries allowed');
    }

    if (this.isDangerousQuery(query)) {
      // In production, this would show a warning in the UI
      console.warn('Dangerous query detected:', query);
    }

    // Execute with timeout
    const timeout = this.config.timeout || 30000;
    const result = await Promise.race([
      this.executeQuery(query, parameters),
      this.timeoutPromise(timeout)
    ]);

    // Limit rows
    const maxRows = this.config.maxRows || 1000;
    if (result.rows.length > maxRows) {
      result.rows = result.rows.slice(0, maxRows);
      result.rowsTruncated = true;
    }

    // Apply transformation if configured
    if (this.config.transformation) {
      result.rows = await this.applyTransformation(result.rows);
    }

    return result;
  }

  private buildQuery(params: any): { query: string, parameters: any[] } {
    let query = this.config.query;
    const parameters: any[] = [];

    // Replace $paramName with $1, $2, etc.
    for (const [key, value] of Object.entries(params)) {
      query = query.replace(`$${key}`, `$${parameters.length + 1}`);
      parameters.push(value);
    }

    return { query, parameters };
  }

  private isReadOnlyQuery(query: string): boolean {
    const readOnlyPattern = /^\s*SELECT\s+/i;
    return readOnlyPattern.test(query);
  }

  private isDangerousQuery(query: string): boolean {
    const dangerous = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'UPDATE'];
    return dangerous.some(keyword =>
      new RegExp(`\\b${keyword}\\b`, 'i').test(query)
    );
  }

  private timeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Query timeout')), ms)
    );
  }

  // ... more methods
}
```

---

## 🔄 Data Flow Patterns

### **Pattern 1: Tool Creation Flow**

```
User fills tool form
       ↓
Click "Save"
       ↓
src/components/forms/ToolForm.tsx
       ↓
Server Action: createTool(formData)
       ↓
src/app/servers/[id]/tools/actions.ts
       ↓
Prisma Transaction:
  1. Create tool
  2. Create parameters
  3. Create version snapshot
       ↓
revalidatePath() - refresh page data
       ↓
Router navigates to tools list
       ↓
UI shows new tool
```

### **Pattern 2: Hot-Reload Flow**

```
User updates tool
       ↓
Server Action: updateTool(formData)
       ↓
Prisma writes to DB
Version snapshot created
       ↓
mcp-runtime polls DB (every 2s)
       ↓
Detects config change (checksum differs)
       ↓
Graceful reload:
  1. Pause new requests
  2. Wait for in-flight
  3. Reload config
  4. Re-register tools
  5. Resume
       ↓
Tool updated with zero downtime
```

### **Pattern 3: Rollback Flow**

```
User selects version from history
       ↓
Click "Rollback"
       ↓
Server Action: rollbackToVersion(versionId)
       ↓
src/app/servers/[id]/versions/actions.ts
       ↓
Prisma Transaction:
  1. Create "before rollback" snapshot
  2. Delete current tools
  3. Recreate from snapshot
  4. Update server
       ↓
Trigger hot-reload
       ↓
Server reloaded with old config
       ↓
revalidatePath() refreshes UI
       ↓
UI shows restored version
```

---

## 🔐 Security Architecture

### **Encryption Flow**

```
User enters password
       ↓
Server Action receives formData
       ↓
src/lib/encryption.ts
       ↓
Generate encryption key (from machine ID)
       ↓
Encrypt with AES-256-GCM
Format: iv:authTag:encrypted
       ↓
Store encrypted string in SQLite
       ↓
On use:
  Server Action loads encrypted string
       ↓
  Decrypt with machine key
       ↓
  Use in-memory only
       ↓
  Never log or expose
```

### **SQL Injection Prevention**

```
User input: "'; DROP TABLE users; --"
       ↓
Parameterized query builder
       ↓
SELECT * FROM users WHERE id = $1
Parameters: ["'; DROP TABLE users; --"]
       ↓
Database driver escapes parameter
       ↓
Safe execution
```

---

## 📦 Build & Packaging Architecture

### **Build Process**

```
npm run build
       ↓
1. Build Next.js (static export)
   next build → out/
       ↓
2. Build Electron (TypeScript)
   tsc -p electron/tsconfig.json → dist/
       ↓
3. Build mcp-runtime (TypeScript)
   tsc -p mcp-runtime/tsconfig.json → mcp-runtime/dist/
       ↓
4. electron-builder packages
       ↓
   Windows: NSIS installer (.exe)
   macOS: Disk image (.dmg)
   Linux: AppImage + .deb
```

---

## 🔗 Quick Links

- **[CLAUDE.md](./CLAUDE.md)** - Instructions for Claude sessions
- **[REFERENCE.md](./REFERENCE.md)** - Tech stack reference
- **[ROADMAP.md](./ROADMAP.md)** - Timeline and milestones
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Development workflow
- **[DECISIONS.md](./DECISIONS.md)** - Architecture decisions

---

**Maintained By**: Yasban Core Team
**License**: MIT
**Last Updated**: 2025-10-08

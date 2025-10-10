# Yasban - Technical Reference

Quick reference for architecture, tech stack, database schema, and key decisions.

**Last Updated**: 2025-01-10

---

## 📦 Tech Stack

### **Complete Technology List**

```json
{
  "desktop": {
    "framework": "Electron 33+",
    "ui_framework": "Next.js 15 (App Router)",
    "pattern": "Nextron (Next.js inside Electron)"
  },
  "frontend": {
    "routing": "Next.js App Router (file-based)",
    "state_management": "React Server Components (no library)",
    "ui_library": "Tailwind CSS 3.4+ + Radix UI",
    "code_editor": "Monaco Editor 0.52+",
    "forms": "React Hook Form 7.53+ + Zod 3.23+"
  },
  "backend": {
    "runtime": "Node.js 20+",
    "database": "SQLite (via Prisma 6.0+)",
    "orm": "Prisma Client",
    "mcp_sdk": "@modelcontextprotocol/sdk 1.0+",
    "service_management": {
      "windows": "node-windows 1.0.0-beta.8",
      "linux": "node-linux 0.1.12"
    }
  },
  "database_clients": {
    "postgresql": "pg 8.13+",
    "mysql": "mysql2 3.11+",
    "sql_server": "tedious 18.6+",
    "sqlite": "better-sqlite3 11.5+"
  },
  "security": {
    "encryption": "Node.js crypto (AES-256-GCM)",
    "validation": "Zod 3.23+"
  },
  "testing": {
    "unit_integration": "Vitest 2.1+",
    "e2e": "Playwright 1.48+",
    "test_runner": "Vitest"
  },
  "build_tools": {
    "bundler": "Vite (for Electron) + Next.js (for UI)",
    "packager": "electron-builder 25.1+",
    "updater": "electron-updater 6.3+"
  },
  "dev_tools": {
    "concurrency": "concurrently 9.0+",
    "env_vars": "cross-env 7.0+",
    "typescript": "TypeScript 5.6+"
  }
}
```

### **Why These Choices?**

| Technology | Alternative Considered | Why Chosen |
|------------|------------------------|------------|
| **Next.js in Electron** | Plain React | Better DX, built-in routing, SSG for performance |
| **React Server Components** | Jotai, Zustand | No global state library needed, data fetched on server |
| **SQLite** | PostgreSQL, MySQL | Local-first, single file, portable, perfect for desktop |
| **Prisma** | TypeORM, Sequelize | Best TypeScript support, excellent DX, migrations |
| **Radix UI** | Material UI, Ant Design | Headless, accessible, no vendor lock-in, composable |
| **Monaco Editor** | CodeMirror, Ace | VS Code editor, excellent SQL/JS support |
| **node-windows/linux** | Custom systemd | Simpler API, cross-platform consistency |
| **Vitest** | Jest | Faster, better ESM support, Vite-native |

See `docs/DECISIONS.md` for detailed rationale.

---

## 🗄️ Database Schema (Complete Prisma Schema)

### **Full Schema Definition**

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// ============================================
// Server - MCP server configurations
// ============================================
model Server {
  id          String   @id @default(uuid())
  name        String   @unique
  description String?
  status      String   @default("stopped") // 'stopped' | 'running'
  transport   String   @default("stdio")   // 'stdio' | 'sse' | 'http'
  runMode     String   @default("gui")     // 'gui' | 'service'

  // Relationships
  tools       Tool[]
  connections Connection[]
  versions    Version[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([status])
}

// ============================================
// Tool - Tool definitions (SQL, REST, Webhook, JS)
// ============================================
model Tool {
  id          String      @id @default(uuid())
  serverId    String
  server      Server      @relation(fields: [serverId], references: [id], onDelete: Cascade)

  name        String
  description String?
  type        String      // 'sql' | 'rest' | 'webhook' | 'javascript'
  config      String      // JSON configuration specific to tool type

  // Relationships
  parameters  Parameter[]
  testCases   TestCase[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([serverId, name]) // Tool names must be unique per server
  @@index([serverId])
  @@index([type])
}

// ============================================
// Connection - Database/API connections (encrypted)
// ============================================
model Connection {
  id        String   @id @default(uuid())
  serverId  String
  server    Server   @relation(fields: [serverId], references: [id], onDelete: Cascade)

  name      String
  type      String   // 'postgresql' | 'mysql' | 'mssql' | 'sqlite' | 'rest_api'
  config    String   // Encrypted JSON (connection string, host, port, credentials, etc.)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([serverId, name]) // Connection names must be unique per server
  @@index([serverId])
}

// ============================================
// Parameter - Tool parameters with Zod schemas
// ============================================
model Parameter {
  id          String  @id @default(uuid())
  toolId      String
  tool        Tool    @relation(fields: [toolId], references: [id], onDelete: Cascade)

  name        String
  zodSchema   String  // Serialized Zod schema (JSON representation)
  description String?
  required    Boolean @default(true)
  order       Int     @default(0) // Display order in UI

  @@unique([toolId, name]) // Parameter names must be unique per tool
  @@index([toolId])
}

// ============================================
// TestCase - Saved test cases for tools
// ============================================
model TestCase {
  id        String   @id @default(uuid())
  toolId    String
  tool      Tool     @relation(fields: [toolId], references: [id], onDelete: Cascade)

  name      String
  inputs    String   // JSON object with parameter values
  expected  String?  // Optional expected output for validation

  createdAt DateTime @default(now())

  @@index([toolId])
}

// ============================================
// Version - Version snapshots for rollback (CRITICAL)
// ============================================
model Version {
  id             String   @id @default(uuid())
  serverId       String
  server         Server   @relation(fields: [serverId], references: [id], onDelete: Cascade)

  versionNumber  Int      // Auto-incremented per server (1, 2, 3, ...)
  configSnapshot String   // Complete JSON snapshot of server + tools + connections
  description    String?  // "Auto-save: Tool created" or user description
  createdBy      String   @default("system") // "user" | "system"

  createdAt      DateTime @default(now())

  @@unique([serverId, versionNumber])
  @@index([serverId])
  @@index([createdAt])
}

// ============================================
// Template - Built-in templates
// ============================================
model Template {
  id          String   @id @default(uuid())
  name        String
  description String
  category    String   // 'sql' | 'rest' | 'webhook' | 'javascript'
  config      String   // JSON template (can be used to create new tools)
  isBuiltIn   Boolean  @default(false)
  downloads   Int      @default(0)

  createdAt   DateTime @default(now())

  @@index([category])
}

// ============================================
// Log - Application logs
// ============================================
model Log {
  id        String   @id @default(uuid())
  serverId  String?  // Optional - logs can be app-wide or server-specific
  level     String   // 'info' | 'warn' | 'error' | 'debug'
  message   String
  metadata  String?  // Optional JSON metadata (stack trace, request details, etc.)

  createdAt DateTime @default(now())

  @@index([serverId])
  @@index([level])
  @@index([createdAt])
}

// ============================================
// Environment - Environment variables (encrypted)
// ============================================
model Environment {
  id        String   @id @default(uuid())
  serverId  String   // Not a FK to allow server-independent env vars
  key       String
  value     String   // Encrypted value (AES-256-GCM)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([serverId, key]) // Env var keys must be unique per server
  @@index([serverId])
}
```

### **Database Relationships**

```
Server (1) ──→ (N) Tools
  │
  ├──→ (N) Connections
  │
  └──→ (N) Versions

Tool (1) ──→ (N) Parameters
  │
  └──→ (N) TestCases

Connection ──╳ Tools (referenced by name in Tool.config, no FK)
```

### **Key Design Decisions**

1. **Cascade Deletes**: Deleting a server deletes all tools, connections, versions
2. **Unique Constraints**: Tool names unique per server, connection names unique per server
3. **No Direct FK for Connections**: Tools reference connections by name in config JSON (more flexible)
4. **Version Snapshots**: Complete JSON snapshot enables perfect rollback
5. **Encrypted Fields**: Connection.config and Environment.value are encrypted

---

## 🏗️ Architecture Patterns

### **1. Hot-Reload Pattern**

```
User Action (Save Tool)
    ↓
Server Action (updateTool)
    ├─→ Write to SQLite (Prisma)
    └─→ Create Version Snapshot
         ↓
File Watcher (mcp-runtime, polls every 2s)
    ├─→ Calculate config checksum
    └─→ Compare with previous checksum
         ↓ (if different)
Graceful Reload
    ├─→ Pause new requests
    ├─→ Wait for in-flight (max 5s)
    ├─→ Reload config from DB
    ├─→ Re-register MCP tools
    └─→ Resume accepting requests
         ↓
Zero Downtime Reload Complete ✓
```

**Files Involved:**
- `src/app/servers/[id]/tools/actions.ts` - Server Actions that write to DB
- `mcp-runtime/src/hot-reload.ts` - File watcher and reload orchestrator
- `mcp-runtime/src/server.ts` - Pause/resume mechanism

### **2. Version Control Pattern**

```
Any Config Change (Tool, Connection, Settings)
    ↓
Server Action
    ↓
Prisma Transaction
    ├─→ Update/Create/Delete entity
    └─→ Create Version snapshot
         └─→ Snapshot contains:
             ├─→ Complete server config
             ├─→ All tools (with parameters)
             └─→ All connections (encrypted)
         ↓
Version saved with auto-incremented versionNumber
    ↓
Rollback Available ✓
```

**Rollback Process:**
1. User selects version from history
2. Server Action: rollbackToVersion()
3. Create "before rollback" snapshot
4. Delete current tools/connections
5. Recreate from snapshot (preserve IDs)
6. Update server settings
7. Trigger hot-reload

**Files Involved:**
- `src/app/servers/[id]/versions/actions.ts` - Snapshot creation and rollback logic
- `prisma/schema.prisma` - Version model

### **3. Encryption Pattern**

```
Credential Input (Password, API Key)
    ↓
Server Action receives data
    ↓
Encrypt (AES-256-GCM)
    ├─→ Key: Machine-specific (derived from machine ID)
    ├─→ IV: Random (stored with ciphertext)
    └─→ Auth Tag: Generated
         ↓
Store Encrypted String in DB
    ↓
On Use:
    ├─→ Server Action reads encrypted string
    ├─→ Decrypt with machine key
    └─→ Use in-memory only (never log)
         ↓
Secure Credential Management ✓
```

**Files Involved:**
- `src/lib/encryption.ts` - Encryption utilities
- `src/app/servers/[id]/connections/actions.ts` - Encrypt before save, decrypt on load

### **4. Tool Execution Pattern**

**A. Testing Tools (from UI)**
```
User clicks "Test Tool"
    ↓
Server Action: testTool(toolId, parameters)
    ↓
Load tool config from DB
    ↓
Execute via tool-tester.ts
    ├─→ SQL: Query DB with parameterized query
    ├─→ REST: HTTP request with auth
    └─→ Webhook: Mock test
         ↓
Return Result to UI ✓
```

**B. Production Execution (from Claude)**
```
MCP Request (from Claude)
    ↓
Validate Parameters (Zod)
    ├─→ Check required params
    ├─→ Validate types
    └─→ Reject if invalid
         ↓
Execute Tool
    ├─→ SQL: Query DB with parameterized query
    ├─→ REST: HTTP request with auth
    └─→ Webhook: Trigger webhook receiver
         ↓
Transform Result (optional)
    └─→ Apply JavaScript transformation function
         ↓
Return Result to Claude ✓
```

**Files Involved:**
- `src/lib/executors/sql-executor.ts` - SQL execution ✅ ACTIVE
- `src/lib/executors/rest-executor.ts` - REST API calls ✅ ACTIVE
- `src/lib/executors/webhook-executor.ts` - Webhook info generation ✅ ACTIVE
- `src/lib/executors/javascript-executor.ts` - JavaScript execution ✅ ACTIVE
- `src/lib/tool-tester.ts` - Legacy testing (deprecated, kept for backward compatibility)
- `mcp-runtime/src/tools/transform.ts` - JS transformations (Phase 2)

### **5. Parameter Substitution Pattern** ✅ NEW

```
Tool Execution with Parameters
    ↓
Parse tool config (SQL query, REST URL, etc.)
    ↓
Extract parameter placeholders
    ├─→ {{paramName}} - Double curly braces (Handlebars/Mustache style)
    ├─→ ${paramName}  - Dollar sign with braces (JS template literal style)
    └─→ $paramName    - Dollar sign only (PostgreSQL/Shell style)
         ↓
Call replaceInString() or replaceInObject()
    ├─→ Regex pattern: Matches all 3 placeholder styles
    ├─→ Escape special regex characters in param names
    └─→ Convert parameter values to strings
         ↓
Return processed template with values substituted
    ↓
Execute Tool ✓
```

**Shared Utility Module:** `src/lib/parameter-substitution.ts`

**Functions:**
- `replaceInString(template, parameters)` - Replace placeholders in strings
- `replaceInObject(obj, parameters)` - Recursively replace in objects/arrays
- `escapeRegExp(str)` - Internal helper for safe regex patterns

**Usage in Executors:**
- **SQL Executor**: Query string replacement
- **REST Executor**: URL, headers, and body replacement (nested objects supported)
- **Webhook Executor**: Reserved for future use (documented)
- **JavaScript Executor**: Not needed (uses `params` object directly)

**Example:**
```typescript
import { replaceInString, replaceInObject } from '@/lib/parameter-substitution';

// Simple string replacement
const query = 'SELECT * FROM users WHERE id = {{user_id}}';
const sql = replaceInString(query, { user_id: 123 });
// Result: 'SELECT * FROM users WHERE id = 123'

// Complex object replacement
const config = {
  url: 'https://api.example.com/users/${userId}',
  headers: { 'Authorization': 'Bearer {{token}}' },
  body: { name: '{{name}}', age: $age }
};
const processed = replaceInObject(config, {
  userId: 456,
  token: 'abc123',
  name: 'John',
  age: 30
});
// Result: All placeholders replaced recursively
```

**Benefits:**
- DRY principle - Single source of truth (~80 lines of duplicate code eliminated)
- Consistent behavior across all tool types
- Supports 3 parameter patterns simultaneously
- Type-safe with full TypeScript support
- Comprehensive JSDoc documentation

---

## 🔐 Security Checklist

### **Encryption**
- [x] All credentials encrypted with AES-256-GCM
- [x] Encryption key derived from machine ID (per-machine keys)
- [x] Random IV for each encryption
- [x] Auth tag verified on decryption
- [x] Credentials never logged (plaintext or encrypted)

### **SQL Safety**
- [x] Parameterized queries only (no string concatenation)
- [x] Max rows limit: 1000 (configurable per tool)
- [x] Query timeout: 30 seconds (configurable per tool)
- [x] Dangerous operations warning (DROP, DELETE, TRUNCATE, ALTER)
- [x] Read-only mode option (only SELECT allowed)
- [x] Connection string validation (regex + test connection)
- [x] SQL injection prevention (Zod validation + parameterization)

### **JavaScript Execution**
- [x] Phase 1: Transformation functions only (limited scope)
- [x] Forbidden keywords blocked (require, import, eval, process, fs)
- [x] Timeout protection: 5 seconds
- [x] Safe helpers only (formatDate, map, filter)
- [x] No access to file system or Node.js APIs
- [ ] Phase 2: Upgrade to `isolated-vm` for full sandboxing

### **General Security**
- [x] API keys never logged or exposed in UI (show as ••••••)
- [x] No credentials in exports (mcp.json uses env var placeholders)
- [x] SSL/TLS enforcement option for database connections
- [x] HTTPS for REST API calls (HTTP upgrade prompt)
- [x] Service runs with minimal permissions
- [x] IPC messages validated (Zod schemas)

---

## 📊 MVP Success Metrics

### **User Experience Metrics**

| Metric | Target | How to Test |
|--------|--------|-------------|
| Create first SQL tool | <2 minutes | Time from "New Tool" to working query |
| Test tool in-app | <5 seconds | Click "Run Test" to results displayed |
| Install as service | <10 seconds | Click to service running in Services.msc |
| Rollback to version | <10 seconds | Select version to server reloaded |
| Export to Claude Desktop | <3 minutes | Export mcp.json to Claude calling tool |
| Create 10 tools | <30 minutes | Experienced user creates 10 different tools |

### **Performance Metrics**

| Metric | Target | Measurement |
|--------|--------|-------------|
| App startup | <3 seconds | Time from click to UI interactive |
| Tool execution (simple) | <1 second | SQL query or REST call response time |
| Hot-reload | <2 seconds | Config change to server live |
| Rollback | <5 seconds | Click rollback to config restored |
| UI responsiveness | <100ms | Button click to visual feedback |

### **Quality Metrics**

| Metric | Target | Tool |
|--------|--------|------|
| Unit test coverage | 80%+ | Vitest coverage report |
| E2E test coverage | 100% critical paths | Playwright test suite |
| Zero security vulnerabilities | 0 high/critical | npm audit |
| Zero memory leaks | <10MB growth/hour | Electron DevTools profiler |
| Cross-platform support | Win + Mac + Linux | Test on all platforms |

---

## 📦 Package.json Scripts Reference

### **Development Scripts**

```json
{
  "dev": "concurrently \"npm run dev:next\" \"npm run dev:electron\" --kill-others",
  "dev:next": "next dev",
  "dev:electron": "cross-env NODE_ENV=development electron .",

  "dev:debug": "cross-env NODE_ENV=development electron . --inspect=5858"
}
```

**Usage:**
- `npm run dev` - Start both Next.js and Electron (hot reload enabled)
- `npm run dev:debug` - Start with Chrome DevTools debugging

### **Build Scripts**

```json
{
  "build": "npm run build:next && npm run build:electron",
  "build:next": "next build",
  "build:electron": "tsc -p electron/tsconfig.json",

  "package": "npm run build && electron-builder",
  "package:win": "npm run build && electron-builder --win",
  "package:mac": "npm run build && electron-builder --mac",
  "package:linux": "npm run build && electron-builder --linux"
}
```

**Usage:**
- `npm run build` - Build for development testing
- `npm run package:win` - Create Windows installer (.exe)
- `npm run package:mac` - Create macOS installer (.dmg)
- `npm run package:linux` - Create Linux installer (.AppImage + .deb)

### **Database Scripts**

```json
{
  "db:generate": "prisma generate",
  "db:migrate": "prisma migrate dev",
  "db:studio": "prisma studio",
  "db:reset": "prisma migrate reset --force",
  "db:seed": "tsx prisma/seed.ts"
}
```

**Usage:**
- `npm run db:migrate` - Create migration after schema changes
- `npm run db:generate` - Regenerate Prisma client (after migration)
- `npm run db:studio` - Open Prisma Studio UI (http://localhost:5555)
- `npm run db:seed` - Seed database with templates

### **Testing Scripts**

```json
{
  "test": "vitest",
  "test:watch": "vitest watch",
  "test:coverage": "vitest --coverage",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:e2e:debug": "playwright test --debug"
}
```

**Usage:**
- `npm test` - Run all Vitest tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:e2e` - Run Playwright E2E tests
- `npm run test:e2e:ui` - Run E2E tests with UI debugger

### **Utility Scripts**

```json
{
  "lint": "next lint",
  "format": "prettier --write \"**/*.{ts,tsx,json,md}\"",
  "clean": "rimraf out dist .next node_modules/.cache",
  "postinstall": "prisma generate && electron-builder install-app-deps"
}
```

**Usage:**
- `npm run lint` - Check code style (ESLint)
- `npm run format` - Format code (Prettier)
- `npm run clean` - Clean build artifacts

---

## 🎯 Phase 1 Features (Complete List)

### **✅ In Phase 1 (MVP)**

**Core Features:**
- [x] SQL tool wizard (PostgreSQL, MySQL, SQL Server, SQLite)
- [x] REST API tool wizard (GET, POST, PUT, DELETE, PATCH)
- [x] Webhook tool wizard (receiver)
- [x] Connection management with encryption
- [x] Service installation (Windows + Linux)
- [x] Version control with rollback ← CRITICAL
- [x] Hot-reload on config changes ← CRITICAL
- [x] Built-in test panel (with mock mode)
- [x] 10 built-in templates
- [x] Export as Node.js/TypeScript project
- [x] Export as mcp.json (standard MCP config)
- [x] All 3 MCP transports (stdio, SSE, HTTP)
- [x] JavaScript transformation functions (limited)
- [x] SQL safety limits (max rows, timeout, warnings)
- [x] Read-only mode for database connections

**UI Features:**
- [x] Wizard-style tool creation (step-by-step)
- [x] Form + connection string input (both options)
- [x] Monaco Editor for SQL/JavaScript
- [x] Test panel with execute + results viewer
- [x] Version history with diff viewer
- [x] Rollback functionality
- [x] Log viewer with filtering
- [x] Connection manager UI
- [x] Environment variable manager
- [x] Settings page
- [x] Dark mode (system + manual toggle)
- [x] One-click "Test in Claude Desktop" (manual + auto-detect)

**Security Features:**
- [x] AES-256-GCM encryption for credentials
- [x] Parameterized SQL queries only
- [x] SQL safety limits
- [x] Dangerous query warnings
- [x] Connection string validation
- [x] JavaScript sandboxing

**Distribution:**
- [x] Auto-updater with changelog
- [x] Windows installer (.exe via NSIS)
- [x] macOS disk image (.dmg)
- [x] Linux AppImage + .deb

### **❌ NOT in Phase 1 (Future Phases)**

**Phase 2 (Months 5-7):**
- [ ] Resources and Prompts (MCP primitives)
- [ ] Full JavaScript custom tools (with isolated-vm)
- [ ] Python export
- [ ] OAuth 2.0 authentication
- [ ] GraphQL support
- [ ] gRPC support
- [ ] Template marketplace
- [ ] Cloud storage integration
- [ ] Collaboration features (export/import)

**Phase 3 (Months 8-10):**
- [ ] Visual query builder
- [ ] Team collaboration (multi-user)
- [ ] Role-based access control
- [ ] Analytics dashboard
- [ ] Plugin system
- [ ] Cloud deployment option

**Never:**
- [ ] Telemetry (except opt-in crash reporting)
- [ ] Closed-source features
- [ ] Paid-only features (100% free forever)

---

## 🔗 Configuration Files

### **next.config.js**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',        // Static HTML export for Electron
  distDir: 'out',          // Output directory
  images: {
    unoptimized: true,     // No Next.js image optimization
  },
  experimental: {
    serverActions: false,  // No server actions (not compatible with static export)
  },
  trailingSlash: true,     // Helps with file:// routing
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
```

### **electron-builder.yml**

```yaml
appId: com.yasban.app
productName: Yasban
copyright: Copyright © 2025 Yasban

directories:
  output: dist
  buildResources: build

files:
  - out/**/*
  - electron/**/*
  - mcp-runtime/**/*
  - prisma/**/*
  - package.json

win:
  target:
    - nsis
  icon: build/icon.ico
  artifactName: ${productName}-Setup-${version}.exe

mac:
  target:
    - dmg
  icon: build/icon.icns
  category: public.app-category.developer-tools
  artifactName: ${productName}-${version}.dmg

linux:
  target:
    - AppImage
    - deb
  icon: build/icon.png
  category: Development
  artifactName: ${productName}-${version}.${ext}

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true

publish:
  provider: github
  owner: yourusername
  repo: yasban
```

---

## 🔗 Quick Links

- **[CLAUDE.md](./CLAUDE.md)** - Primary instructions for Claude sessions
- **[ROADMAP.md](./ROADMAP.md)** - Timeline, milestones, weekly deliverables
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture and design patterns
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Development workflow and best practices
- **[DECISIONS.md](./DECISIONS.md)** - Architecture Decision Records (ADRs)

---

**Maintained By**: Yasban Core Team
**License**: MIT
**Last Updated**: 2025-01-10

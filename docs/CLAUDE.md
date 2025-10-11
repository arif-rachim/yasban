# Instructions for Claude Code Sessions

## 🎯 Project Overview

**Project Name**: Yasban (يسبان - Easy Builder)
**Tagline**: "Build AI tools without code"
**Purpose**: A free, open-source, GUI-based MCP server builder that enables non-technical users to create MCP servers visually.

**Current Status**: [PHASE 1 - IN DEVELOPMENT]
**Version**: 0.1.0 (MVP)
**License**: MIT

**🔥 NEW SESSION? START HERE → [CURRENT_SESSION_STATUS.md](./CURRENT_SESSION_STATUS.md)**
**This document contains the complete status of what's done, what's in progress, and what's next!**

---

## 🚨 CRITICAL: Read This First

Before making ANY changes, you MUST:

1. ✅ **Read `docs/CURRENT_SESSION_STATUS.md`** - Current progress and next priorities ← **START HERE**
2. ✅ Read `docs/REFERENCE.md` - Tech stack and key decisions
3. ✅ Read `docs/ROADMAP.md` - What's in Phase 1 vs Phase 2
4. ✅ Read `docs/DECISIONS.md` - Why we made certain choices
5. ✅ Review `docs/ARCHITECTURE.md` for system design

**DO NOT:**
- ❌ Add Phase 2 features to Phase 1 (scope creep)
- ❌ Change the tech stack without documenting in DECISIONS.md
- ❌ Use global state management libraries (we use React Server Components)
- ❌ Use React Router (we use Next.js App Router)
- ❌ Skip version snapshots when modifying server config
- ❌ Remove security features (encryption, SQL limits)
- ❌ Use `vm2` for JavaScript execution (deprecated)
- ❌ Create monolithic service (one service per MCP server)
- ❌ Store credentials in plaintext
- ❌ Allow arbitrary SQL without parameterization

---

## 📋 Phase 1 Scope (LOCKED)

### ✅ MUST HAVE (In Phase 1)

**Core Features:**
1. SQL tool wizard (PostgreSQL, MySQL, SQL Server, SQLite)
2. REST API tool wizard (with API Key auth)
3. Webhook tool wizard (receiver)
4. Connection management (encrypted with AES-256-GCM)
5. Service installation (Windows via node-windows + Linux via node-linux)
6. **Version control with rollback** ← CRITICAL
7. **Hot-reload on config changes** ← CRITICAL
8. Built-in test panel (with mock mode)
9. 10 built-in templates
10. Export as Node.js/TypeScript project
11. Export as mcp.json (standard MCP config)
12. All MCP transports (stdio, SSE [deprecated], HTTP [deprecated], **Streamable HTTP** [MCP spec 2025-03-26, recommended]) ← CRITICAL
13. JavaScript transformation functions (limited, for data transforms only)
14. SQL safety limits (max rows, timeout, dangerous operation warnings)
15. Dark mode (system preference + manual toggle)
16. Auto-updater with changelog
17. Basic logo (blue + gold + Arabic calligraphy)

**UI Features:**
- Wizard-style tool creation (4-5 steps)
- Form + connection string input (both)
- Monaco Editor for SQL/code
- Test panel with execute + results viewer
- Version history viewer with diff and rollback
- Log viewer with filtering
- Connection manager
- Environment variable manager
- Settings page
- One-click "Test in Claude Desktop" (manual + auto-detect)

**Security Features:**
- AES-256-GCM encryption for all credentials
- Parameterized SQL queries only
- SQL query limits (max rows: 1000, timeout: 30s)
- Dangerous query warnings (DROP, DELETE, TRUNCATE, ALTER)
- Read-only mode for database connections
- Connection string validation
- JavaScript sandboxing (limited scope)

### ❌ NOT in Phase 1 (Phase 2+)

**Explicitly excluded:**
- ❌ Resources and Prompts (MCP primitives) → Phase 2
- ❌ Full JavaScript custom tools (only transformations) → Phase 2
- ❌ Python export (Node.js only) → Phase 2
- ❌ OAuth authentication (API Key only) → Phase 2
- ❌ GraphQL/gRPC support → Phase 2
- ❌ Template marketplace (10 built-in only) → Phase 2
- ❌ Team collaboration / multi-user → Phase 3
- ❌ Visual query builder (Monaco editor only) → Phase 3
- ❌ Cloud deployment → Phase 3
- ❌ Telemetry (except opt-in crash reporting) → Never

**If a user requests a Phase 2 feature, politely inform them it's planned for a future phase.**

---

## 🛠️ Tech Stack (LOCKED)

**DO NOT change these without updating DECISIONS.md:**

| Component | Technology | Version | Why |
|-----------|------------|---------|-----|
| Desktop Framework | Electron + Next.js 15 | Latest | Next.js inside Electron (Nextron pattern) |
| Routing | Next.js App Router | 15+ | File-based routing, no React Router needed |
| State Management | React Server Components | Built-in | No global state library needed |
| UI Library | Tailwind CSS + Radix UI | Latest | shadcn/ui patterns for components |
| Code Editor | Monaco Editor | 0.52+ | VS Code editor component |
| Database (Internal) | SQLite + Prisma | Latest | Single file, easy backup, perfect for desktop |
| MCP SDK | @modelcontextprotocol/sdk | 1.10+ | Official SDK from Anthropic (with Streamable HTTP support) |
| Service Management | node-windows + node-linux | Latest | Cross-platform, simple API |
| Forms | React Hook Form + Zod | Latest | Type-safe form validation |
| Encryption | Node.js crypto (AES-256-GCM) | Built-in | No external dependencies |
| Testing | Vitest + Playwright | Latest | Fast unit tests + E2E tests |
| Build Tool | Vite + electron-builder | Latest | Fast builds, cross-platform packaging |

**Package Versions**: See `package.json` for exact versions.

**Why These Choices?**
- **Next.js inside Electron**: Best of both worlds - Next.js DX + Electron capabilities
- **React Server Components**: No global state needed, data fetched on server
- **SQLite over PostgreSQL**: Desktop app needs local-first, portable database
- **node-windows/node-linux**: Simpler than custom systemd, consistent API
- **Radix UI**: Accessible primitives, composable, no vendor lock-in

See `docs/DECISIONS.md` for detailed rationale.

---

## 📂 Project Structure

**Based on Nextron template:**

```
yasban/
├── electron/                       # Electron main process (viewer only)
│   ├── main.ts                    # Entry point, window creation only
│   └── preload.ts                 # Minimal preload (if needed)
│
├── src/                           # Next.js App (App Router)
│   ├── app/                       # Pages & layouts
│   │   ├── layout.tsx             # Root layout
│   │   ├── page.tsx               # Dashboard/home
│   │   ├── wizard/                # Tool creation wizards
│   │   │   ├── sql/
│   │   │   │   ├── page.tsx       # SQL wizard entry
│   │   │   │   └── components/    # Step1-4 components
│   │   │   ├── rest/
│   │   │   │   ├── page.tsx
│   │   │   │   └── components/
│   │   │   └── webhook/
│   │   │       ├── page.tsx
│   │   │       └── components/
│   │   ├── servers/               # Server management
│   │   │   ├── page.tsx           # Server list
│   │   │   └── [id]/
│   │   │       ├── page.tsx       # Server detail
│   │   │       ├── tools/         # Tools
│   │   │       │   ├── page.tsx   # Tool list
│   │   │       │   ├── new/page.tsx # Create tool
│   │   │       │   ├── [toolId]/page.tsx # Edit tool
│   │   │       │   └── actions.ts # Tool Server Actions
│   │   │       ├── connections/   # Connection manager
│   │   │       │   ├── page.tsx
│   │   │       │   └── actions.ts # Connection Server Actions
│   │   │       ├── versions/      # Version history
│   │   │       │   ├── page.tsx
│   │   │       │   └── actions.ts # Version Server Actions
│   │   │       └── logs/          # Server logs
│   │   ├── templates/             # Template browser
│   │   └── settings/              # App settings
│   │
│   ├── components/                # React components
│   │   ├── ui/                    # Radix UI components
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── select.tsx
│   │   │   ├── tabs.tsx
│   │   │   └── ... (shadcn/ui patterns)
│   │   ├── wizard/                # Wizard components
│   │   │   ├── wizard-container.tsx
│   │   │   ├── wizard-step.tsx
│   │   │   └── wizard-navigation.tsx
│   │   ├── editor/                # Monaco wrapper
│   │   │   ├── code-editor.tsx
│   │   │   └── sql-editor.tsx
│   │   ├── testing/               # Test panel
│   │   │   ├── test-panel.tsx
│   │   │   └── results-viewer.tsx
│   │   └── layout/                # Layout components
│   │       ├── sidebar.tsx
│   │       ├── header.tsx
│   │       └── bottom-panel.tsx
│   │
│   ├── lib/                       # Utilities
│   │   ├── prisma.ts              # Prisma client for Server Actions
│   │   ├── encryption.ts          # AES-256-GCM encrypt/decrypt
│   │   ├── connection-tester.ts   # Test connections
│   │   ├── tool-tester.ts         # Test tools
│   │   ├── logger.ts              # Winston logger
│   │   ├── validation.ts          # Zod schemas
│   │   └── utils.ts               # Helper functions
│   │
│   └── types/                     # TypeScript types
│       ├── server.ts
│       ├── tool.ts
│       ├── connection.ts
│       └── mcp.ts
│
├── mcp-runtime/                   # MCP server runtime (separate package)
│   ├── src/
│   │   ├── server.ts              # MCP server bootstrap
│   │   ├── config-loader.ts       # Load config from SQLite
│   │   ├── hot-reload.ts          # Watch & graceful reload
│   │   ├── tools/                 # Tool executors
│   │   │   ├── sql-executor.ts    # Execute SQL queries
│   │   │   ├── rest-executor.ts   # Call REST APIs
│   │   │   ├── webhook-executor.ts# Webhook receivers
│   │   │   └── transform.ts       # JS transformation functions
│   │   ├── transports/            # MCP transports
│   │   │   ├── stdio.ts           # stdio transport (Claude Desktop)
│   │   │   ├── sse.ts             # SSE transport (deprecated, use streamable-http)
│   │   │   ├── http.ts            # HTTP transport (deprecated, use streamable-http)
│   │   │   └── streamable-http.ts # Streamable HTTP (MCP spec 2025-03-26, RECOMMENDED)
│   │   └── utils/
│   │       ├── database.ts        # DB connection pooling
│   │       ├── validator.ts       # Zod validation
│   │       └── logger.ts          # Logging utilities
│   ├── package.json
│   └── tsconfig.json
│
├── prisma/
│   ├── schema.prisma              # Database schema (8 models)
│   └── migrations/                # Migration files
│
├── public/                        # Static assets
│   ├── icons/                     # App icons
│   │   ├── icon.ico               # Windows
│   │   ├── icon.icns              # macOS
│   │   └── icon.png               # Linux
│   └── templates/                 # Built-in template JSONs
│       ├── postgresql-query.json
│       ├── mysql-query.json
│       ├── rest-api.json
│       └── ... (10 templates)
│
├── build/                         # Electron build resources
│   ├── icon.ico
│   ├── icon.icns
│   └── icon.png
│
├── docs/                          # Documentation
│   ├── CLAUDE.md                  # This file
│   ├── REFERENCE.md
│   ├── ROADMAP.md
│   ├── ARCHITECTURE.md
│   ├── DEVELOPMENT.md
│   └── DECISIONS.md
│
├── next.config.js                 # Next.js config (static export)
├── electron-builder.yml           # Packaging config
├── tailwind.config.ts             # Tailwind config
├── tsconfig.json                  # TypeScript config (root)
├── package.json                   # Dependencies & scripts
├── .gitignore
├── LICENSE                        # MIT License
└── README.md                      # User-facing documentation
```

---

## 🗄️ Database Schema (8 Models)

**See `docs/REFERENCE.md` for complete Prisma schema.**

**Critical models:**

1. **Server** - MCP server configurations
   - Fields: id, name, description, status, transport, runMode
   - Relations: tools[], connections[], versions[]

2. **Tool** - Tool definitions (SQL, REST, Webhook, JS)
   - Fields: id, serverId, name, type, config (JSON)
   - Relations: server, parameters[], testCases[]

3. **Connection** - Database/API connections (encrypted)
   - Fields: id, serverId, name, type, config (encrypted JSON)
   - Relations: server

4. **Parameter** - Tool parameters (Zod schemas)
   - Fields: id, toolId, name, zodSchema, description, required, order
   - Relations: tool

5. **Version** - Version snapshots for rollback ← **CRITICAL**
   - Fields: id, serverId, versionNumber, configSnapshot (JSON), description, createdBy
   - Relations: server
   - **Purpose**: Auto-snapshot on every config change, enable rollback

6. **Template** - Built-in templates
   - Fields: id, name, description, category, config (JSON), isBuiltIn

7. **Log** - Application logs
   - Fields: id, serverId, level, message, metadata (JSON)

8. **Environment** - Environment variables (encrypted)
   - Fields: id, serverId, key, value (encrypted)

**Key relationships:**
- Server → Tools (one-to-many, cascade delete)
- Server → Connections (one-to-many, cascade delete)
- Server → Versions (one-to-many, cascade delete)
- Tool → Parameters (one-to-many, cascade delete)
- Connection referenced by name in Tool.config (no FK)

---

## 🔄 Hot-Reload System (CRITICAL)

**How it works:**

```
┌─────────────┐
│ User saves  │
│ tool in GUI │
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│ IPC Handler             │
│ 1. Prisma writes to DB  │
│ 2. Create version       │
│    snapshot             │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ File Watcher (mcp-      │
│ runtime)                │
│ Polls DB every 2s       │
│ Compares config         │
│ checksum                │
└──────┬──────────────────┘
       │
       ▼ (if changed)
┌─────────────────────────┐
│ Graceful Reload         │
│ 1. Pause new requests   │
│ 2. Wait for in-flight   │
│    (max 5s)             │
│ 3. Reload config        │
│ 4. Re-register tools    │
│ 5. Resume requests      │
└─────────────────────────┘
```

**Implementation files:**
- `electron/ipc/tool-handlers.ts` - Creates version snapshot on save
- `mcp-runtime/src/hot-reload.ts` - File watcher and reload logic
- `mcp-runtime/src/server.ts` - Pause/resume mechanism

**Zero downtime**: In-flight requests complete, new requests wait briefly during reload.

---

## 🕰️ Version Control System (CRITICAL)

**Auto-snapshots created when:**
- Tool is created, updated, or deleted
- Connection is modified
- Server settings changed
- Before rollback (create "before rollback" snapshot)

**Snapshot format:**
```json
{
  "server": { "id": "...", "name": "...", "transport": "stdio", ... },
  "tools": [
    {
      "id": "...",
      "name": "get_users",
      "type": "sql",
      "config": { "query": "SELECT * FROM users", ... },
      "parameters": [...]
    }
  ],
  "connections": [...],
  "environment": [...]
}
```

**Rollback process:**
1. Get target version snapshot from `Version` table
2. Create "before rollback" snapshot (for safety)
3. Delete current tools and connections
4. Recreate from snapshot (preserving IDs)
5. Update server settings
6. Trigger hot-reload

**Implementation files:**
- `electron/ipc/version-handlers.ts` - Snapshot creation and rollback
- `prisma/schema.prisma` - Version model definition

**Version retention:**
- Default: Keep all versions
- Optional: Cleanup old versions (configurable in settings)

---

## 🧪 Testing Strategy

**Test pyramid:**

```
         /\
        /E2E\        ← Playwright (10-20 tests: critical workflows)
       /------\
      / INTEG \      ← Vitest (50-100 tests: IPC, executors, DB)
     /----------\
    /   UNIT     \   ← Vitest (200+ tests: utilities, logic)
   /--------------\
```

**When to write tests:**

| Component Type | When | Tool | Coverage Goal |
|----------------|------|------|---------------|
| Utility functions | **TDD (before)** | Vitest | 90% |
| Encryption/security | **TDD (before)** | Vitest | 100% |
| Database logic | **During development** | Vitest | 80% |
| IPC handlers | **During development** | Vitest | 70% |
| Tool executors | **TDD (before)** | Vitest | 90% |
| Hot-reload logic | **During development** | Vitest | 80% |
| React components | **After (optional)** | Testing Library | 50% |
| Wizards & UI | **E2E only** | Playwright | 100% critical paths |

**Critical features to test FIRST:**
1. ✅ Encryption/decryption (AES-256-GCM)
2. ✅ SQL executor (parameterized queries, safety limits)
3. ✅ REST executor (HTTP methods, auth)
4. ✅ Hot-reload mechanism
5. ✅ Version snapshot creation
6. ✅ Rollback functionality
7. ✅ Service installation

**E2E test scenarios (Playwright):**
1. Create SQL tool end-to-end (wizard → test → save)
2. Create REST tool end-to-end
3. Rollback to previous version
4. Install as service and start
5. Export as mcp.json and verify
6. Test panel execution
7. Connection management (create, edit, delete)
8. Template usage

---

## 🔐 Security Requirements (MUST FOLLOW)

**Encryption:**
1. ✅ All credentials encrypted with AES-256-GCM
2. ✅ Encryption key derived from machine ID (per-machine)
3. ✅ Never log decrypted credentials
4. ✅ Credentials encrypted in transit (IPC) and at rest (DB)

**SQL Safety:**
1. ✅ Parameterized queries only (no string concatenation)
2. ✅ Max rows limit: 1000 (configurable per tool)
3. ✅ Query timeout: 30 seconds (configurable)
4. ✅ Dangerous operations warning (DROP, DELETE, TRUNCATE, ALTER)
5. ✅ Read-only mode option (only SELECT allowed)
6. ✅ Connection string validation

**JavaScript Execution:**
1. ✅ Phase 1: Transformation functions only (limited scope)
2. ✅ Use Function constructor with validation, NOT `vm2` (deprecated)
3. ✅ Timeout protection: 5 seconds
4. ✅ Forbidden keywords: require, import, eval, process, fs
5. ✅ Provide safe helpers only (formatDate, map, filter)
6. ⚠️ Phase 2: Upgrade to `isolated-vm` for full JS tools

**General:**
1. ✅ No credentials in exports (mcp.json references env vars)
2. ✅ SSL/TLS enforcement option for DB connections
3. ✅ API keys never logged or exposed in UI
4. ✅ Service runs with minimal permissions

**Implementation files:**
- `electron/crypto/encryption.ts` - Encryption utilities
- `mcp-runtime/src/tools/sql-executor.ts` - SQL safety checks
- `mcp-runtime/src/tools/transform.ts` - JS sandbox

---

## 🚀 Development Workflow

### **Daily Development**

```bash
# Morning: Start development
npm run dev                # Start Electron + Next.js concurrently

# View database contents
npm run db:studio          # Open Prisma Studio (localhost:5555)

# Run tests while coding
npm run test:watch         # Vitest in watch mode

# Before commit
npm run lint               # ESLint
npm run format             # Prettier
```

### **Database Changes**

```bash
# Edit prisma/schema.prisma, then:
npm run db:migrate         # Create migration
npm run db:generate        # Generate Prisma client

# Reset database (WARNING: deletes all data)
npm run db:reset
```

### **Building for Production**

```bash
# Build for current platform
npm run build              # Build Next.js + Electron

# Package installers
npm run package:win        # Windows .exe (NSIS)
npm run package:mac        # macOS .dmg
npm run package:linux      # Linux .AppImage + .deb

# Build for all platforms (requires macOS for Mac builds)
npm run package
```

### **Debugging**

- **Main process**: Use VSCode debugger (attach to Electron)
- **Renderer process**: Chrome DevTools (Ctrl+Shift+I in dev mode)
- **IPC communication**: Add console.log in handlers
- **Database queries**: Use Prisma Studio or add logging

---

## 📅 Current Milestone

**Check `docs/ROADMAP.md` for current phase.**

### **Month 1: Foundation (Weeks 1-4)**

**Week 1: Project Setup** ← **START HERE**
- [ ] Initialize Nextron project (`npx create-nextron-app yasban --example with-typescript`)
- [ ] Install dependencies (Prisma, Radix UI, etc.)
- [ ] Configure Next.js for static export (`next.config.js`)
- [ ] Setup Tailwind CSS + basic Radix UI components
- [ ] Create Prisma schema with all 8 models
- [ ] Run first migration
- [ ] Create encryption utilities (AES-256-GCM)
- [ ] Setup basic Server Action (e.g., server list)
- [ ] Build basic layout (sidebar + main panel)
- [ ] README with setup instructions

**Week 2: Database & IPC**
- [ ] Implement all IPC handlers (server, tool, connection, version)
- [ ] Test encryption/decryption
- [ ] Create database seed data (templates)
- [ ] Build server CRUD operations
- [ ] Build tool CRUD operations

**Week 3-4: UI Foundation**
- [ ] Sidebar component (server list, status indicators)
- [ ] Dashboard page
- [ ] Server detail page
- [ ] Connection management UI (form + connection string)
- [ ] Settings page

**Deliverable**: Electron app runs, Prisma connected, basic UI navigable.

---

## 🎨 Branding Guidelines

**Colors:**
- Primary: Blue (`#3b82f6`)
- Accent: Gold (`#f59e0b`)
- Background: White (light mode) / Dark gray (dark mode)
- Text: Gray-900 (light) / Gray-100 (dark)

**Typography:**
- Font: System font stack (Inter, SF Pro, Segoe UI)
- Arabic: System Arabic fonts

**Logo:**
- Arabic calligraphy: يسبان (top-left corner, small)
- Stylized icon: Gear + lightning bolt (combined)
- Blue gradient background
- Gold accent borders

**App Name:**
- English: "Yasban"
- Arabic: يسبان
- Tagline: "Easy Builder for AI Tools"

**Icon Sizes:**
- 16x16, 32x32, 64x64, 128x128, 256x256, 512x512, 1024x1024 (macOS)

---

## 📊 Success Metrics (MVP)

**User should be able to:**

1. ✅ **Create first SQL tool in <2 minutes**
   - From "New Tool" click to working SQL query
   - Test: Time it with a new user

2. ✅ **Test tool without leaving app**
   - Click "Run Test" → see results
   - Test: Execute query, verify results shown

3. ✅ **Install as Windows service (one click)**
   - Click "Install as Service" → service running
   - Test: Check Services.msc, verify status

4. ✅ **Rollback to previous version**
   - Version history → select → rollback → server reloads
   - Test: Make change, rollback, verify old config restored

5. ✅ **Export and use in Claude Desktop**
   - Export mcp.json → paste in Claude config → tool works
   - Test: Full workflow from export to Claude calling tool

6. ✅ **Create 10 tools in 30 minutes**
   - Mix of SQL, REST, Webhook tools
   - Test: Experienced user creates 10 different tools

**Performance Metrics:**
- App startup: <3 seconds
- Tool execution: <1 second (simple queries)
- Hot-reload: <2 seconds (from save to live)
- Rollback: <5 seconds (from click to restored)

---

## 🆘 Common Questions

### **Q: Can I use Zustand or Jotai for state management?**
**A**: ❌ NO. We use React Server Components and minimal client state. No global state library is needed. See `docs/DECISIONS.md` for rationale.

### **Q: Can I add OAuth authentication in Phase 1?**
**A**: ❌ NO. Phase 1 only supports API Key auth. OAuth is Phase 2.

### **Q: Can I use React Router?**
**A**: ❌ NO. We use Next.js App Router (file-based routing). No need for React Router.

### **Q: Can I skip version snapshots to save space?**
**A**: ❌ NO. Version control is a CRITICAL feature. Users need rollback capability.

### **Q: Can I use `vm2` for JavaScript execution?**
**A**: ❌ NO. `vm2` is deprecated and has security issues. Use limited Function constructor (Phase 1) or `isolated-vm` (Phase 2).

### **Q: Can I add a visual query builder?**
**A**: ❌ NOT in Phase 1. Monaco editor only. Maybe Phase 3.

### **Q: Should I write tests?**
**A**: ✅ YES. TDD for critical features (encryption, executors, hot-reload). See testing strategy above.

### **Q: Can I add Resources and Prompts (MCP primitives)?**
**A**: ❌ NOT in Phase 1. Phase 2 feature. Focus on Tools only.

### **Q: Should I create a monolithic service that hosts all MCP servers?**
**A**: ❌ NO. Each MCP server = separate service/process. Better isolation.

### **Q: Can I store credentials in environment variables instead of encrypted DB?**
**A**: ⚠️ Phase 1 uses encrypted DB. Env vars are for runtime overrides only.

### **Q: Should I use PostgreSQL for Yasban's internal database?**
**A**: ❌ NO. SQLite only. Desktop app needs local-first, portable database.

---

## 🔗 Quick Links

- **[CURRENT_SESSION_STATUS.md](./CURRENT_SESSION_STATUS.md)** - 🔥 **Current progress and next priorities** ← START HERE
- **[REFERENCE.md](./REFERENCE.md)** - Tech stack, complete Prisma schema, package.json scripts
- **[ROADMAP.md](./ROADMAP.md)** - 4-month timeline, weekly deliverables, phases
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design, data flow, patterns
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Development workflow, testing, debugging
- **[DECISIONS.md](./DECISIONS.md)** - Architecture Decision Records (why we chose X over Y)

---

## 🚦 Before You Start Coding

**Pre-flight checklist:**

- [ ] Read CLAUDE.md (this file)
- [ ] Read REFERENCE.md (tech stack and schema)
- [ ] Read ROADMAP.md (check current milestone)
- [ ] Read DECISIONS.md (understand rationale)
- [ ] Check package.json (verify dependencies)
- [ ] Review prisma/schema.prisma (understand data model)
- [ ] Create a git branch for your work
- [ ] Run `npm run dev` to verify setup

**If unsure about anything, ASK THE USER. Do not guess or assume.**

---

## 🎯 Ready to Code?

**Next steps:**

1. ✅ Confirm current milestone in `docs/ROADMAP.md`
2. ✅ Create a feature branch: `git checkout -b feature/your-feature`
3. ✅ Run `npm run dev` to start development
4. ✅ Write tests FIRST for critical features (TDD)
5. ✅ Commit often with clear messages: `git commit -m "feat: add SQL executor"`
6. ✅ Update documentation if you make architectural changes

**Let's build Yasban! 🚀**

---

## 📝 Changelog

**Version 0.1.0 (Current)**
- Initial documentation created
- Phase 1 scope defined
- Architecture decisions documented
- Development workflow established

**Future versions will be tracked here.**

---

**Last Updated**: 2025-01-10
**Maintained By**: Yasban Core Team
**License**: MIT

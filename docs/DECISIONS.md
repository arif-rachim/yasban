# Yasban - Architecture Decision Records (ADRs)

This document records all significant architectural decisions made during Yasban development, explaining the rationale behind each choice.

**Last Updated**: 2025-10-08

---

## Decision Index

1. [Next.js inside Electron (Nextron Pattern)](#1-nextjs-inside-electron-nextron-pattern)
2. [Next.js Server Actions over Electron IPC](#2-nextjs-server-actions-over-electron-ipc)
3. [No Global State Management Library (React Server Components)](#3-no-global-state-management-library-react-server-components)
4. [SQLite as Internal Database](#4-sqlite-as-internal-database)
5. [One Service Per MCP Server (Not Monolithic)](#5-one-service-per-mcp-server-not-monolithic)
6. [All Three MCP Transports (stdio, SSE, HTTP)](#6-all-three-mcp-transports-stdio-sse-http)
7. [node-windows/node-linux over Custom Systemd](#7-node-windowsnode-linux-over-custom-systemd)
8. [Runtime Interpretation over Ahead-of-Time Code Generation](#8-runtime-interpretation-over-ahead-of-time-code-generation)
9. [No Full JavaScript Execution in Phase 1](#9-no-full-javascript-execution-in-phase-1)
10. [Version Control as Critical Feature](#10-version-control-as-critical-feature)
11. [MIT License](#11-mit-license)
12. [No Telemetry (Privacy-First)](#12-no-telemetry-privacy-first)
13. [Radix UI over Material UI](#13-radix-ui-over-material-ui)

---

## 1. Next.js inside Electron (Nextron Pattern)

**Decision**: Use Next.js 15 (App Router) running inside Electron, not plain React.

**Date**: 2025-01-08

### Context

We needed to choose between:
1. **Plain React** with React Router
2. **Next.js** inside Electron (Nextron pattern)
3. **Electron with vanilla HTML/CSS**

### Decision

Chosen: **Next.js 15 (App Router) inside Electron**

### Rationale

**Pros:**
- ✅ **Better DX**: File-based routing, built-in optimizations
- ✅ **No React Router needed**: App Router handles routing
- ✅ **Static Site Generation**: `output: 'export'` creates optimized static files perfect for Electron
- ✅ **Built-in TypeScript support**: Zero configuration
- ✅ **Fast Refresh**: Instant hot reload during development
- ✅ **Proven pattern**: Nextron template is well-maintained
- ✅ **Future-proof**: Easy to add API routes if needed (though we use IPC)

**Cons:**
- ⚠️ Slightly larger bundle size (acceptable for desktop app)
- ⚠️ Learning curve if unfamiliar with Next.js (minor)

**Alternatives Considered:**
- **Plain React**: Less DX, need React Router, manual optimization
- **Vanilla HTML**: Too low-level, would slow development

**Consequences:**
- Must configure Next.js for static export (`output: 'export'`)
- Cannot use server-side features (SSR, server actions)
- File-based routing in `src/app/` directory

**Status**: ✅ **Accepted**

---

## 2. Next.js Server Actions over Electron IPC

**Decision**: Use Next.js Server Actions for all business logic instead of Electron IPC handlers. Electron is only used as a viewer wrapper.

**Date**: 2025-01-08

### Context

When building a desktop app with Next.js inside Electron, there are two main approaches for handling business logic and database access:

1. **Electron IPC Pattern**: Business logic in Electron main process, communicate via IPC
   - Database access in Electron main process
   - IPC handlers for all CRUD operations
   - Renderer calls ipcRenderer.invoke()

2. **Next.js Server Actions Pattern**: Business logic in Next.js Server Actions
   - Database access in Next.js server-side
   - No IPC handlers needed
   - Electron is just a window wrapper

### Decision

Chosen: **Next.js Server Actions**

### Rationale

**Pros:**
- ✅ **Simpler architecture**: No IPC layer to maintain
- ✅ **Better DX**: React 19 Server Actions with useActionState
- ✅ **Type-safe**: FormData with Zod validation, no IPC serialization issues
- ✅ **Standard Next.js patterns**: Works like any Next.js app
- ✅ **Better error handling**: Server Actions return results directly
- ✅ **Easier testing**: Test Server Actions like normal async functions
- ✅ **Less code**: No IPC wrappers, no preload script complexity
- ✅ **Revalidation built-in**: revalidatePath() handles cache invalidation
- ✅ **Progressive enhancement**: Forms work without JavaScript

**Cons:**
- ⚠️ Next.js must run locally (already requirement for Electron app)
- ⚠️ Electron is minimal, just a window wrapper (acceptable tradeoff)

**Why not Electron IPC:**
- ❌ More boilerplate (IPC handlers + wrapper API + type definitions)
- ❌ Serialization complexity (can't pass functions, must JSON everything)
- ❌ Two separate codebases (main process + renderer process)
- ❌ Harder to debug (IPC channel issues, async boundaries)
- ❌ Cache invalidation manual (need custom mechanisms)

### Implementation

**Before (IPC Pattern):**
```typescript
// electron/ipc/tool-handlers.ts
ipcMain.handle('tool:create', async (_, data) => {
  return await prisma.tool.create({ data });
});

// src/lib/ipc.ts
export const api = {
  tools: {
    create: (data: any) => ipcRenderer.invoke('tool:create', data),
  },
};

// Component
await api.tools.create(toolData);
```

**After (Server Actions Pattern):**
```typescript
// src/app/servers/[id]/tools/actions.ts
'use server';

export async function createTool(formData: FormData) {
  const tool = await prisma.tool.create({ data: ... });
  revalidatePath(`/servers/${serverId}/tools`);
  return { success: true, data: tool };
}

// Component
<form action={createTool}>
  ...
</form>

// Or with useActionState:
const [state, formAction] = useActionState(createTool, null);
```

**Electron's Role:**
```typescript
// electron/main.ts - Just window management
app.on('ready', () => {
  const win = new BrowserWindow({ ... });
  win.loadURL('http://localhost:3000'); // Dev
  // or win.loadFile('out/index.html'); // Production
});
// No IPC handlers needed!
```

### Consequences

- All business logic moved from Electron to Next.js
- Electron is now just a thin wrapper (window management only)
- No IPC handlers or preload scripts
- Database access via Prisma in Server Actions
- Forms use Server Actions with useActionState
- Simpler debugging (all in Next.js DevTools)
- Easier to test (standard async functions)

### Migration Path

1. ✅ Move Prisma client from `electron/` to `src/lib/`
2. ✅ Create Server Actions in `src/app/*/actions.ts` files
3. ✅ Replace IPC calls with Server Action calls
4. ✅ Remove IPC handlers from `electron/ipc/`
5. ✅ Simplify Electron to window management only
6. ✅ Update all forms to use Server Actions
7. ✅ Remove IPC type definitions and wrappers

**Status**: ✅ **Accepted and Implemented**

---

## 3. No Global State Management Library (React Server Components)

**Decision**: Do not use a global state management library (Jotai, Zustand, Redux). Use React Server Components and minimal client state instead.

**Date**: 2025-10-08

### Context

With Next.js 15 and React Server Components, we need to decide how to manage application state:

1. **Traditional approach**: Global state library (Jotai, Zustand, Redux)
   - Client-side state management
   - Fetch data on client, store in atoms/store
   - Synchronize state across components

2. **React Server Components approach**: Server-side state
   - Fetch data in Server Components
   - Pass data as props to Client Components
   - Use Next.js cache for optimization
   - Minimal client state (UI only)

### Decision

Chosen: **No global state library - React Server Components**

### Rationale

**Pros:**
- ✅ **Simpler architecture**: No state synchronization needed
- ✅ **Better performance**: Data fetched on server, cached automatically
- ✅ **No prop drilling**: Server Components can fetch data where needed
- ✅ **Automatic revalidation**: `revalidatePath()` handles cache invalidation
- ✅ **Type-safe**: Props flow from server to client
- ✅ **Smaller bundle**: No state management library needed
- ✅ **Server Actions integration**: Forms work directly with actions

**Why not global state:**
- ❌ Unnecessary with Server Components (data fetched where needed)
- ❌ Adds complexity (sync client state with server data)
- ❌ Bundle size overhead
- ❌ State synchronization bugs
- ❌ Harder to debug (client + server state)

**Pattern:**
```typescript
// Server Component - Fetches data
export default async function ToolsPage({ params }) {
  // Data fetched on server
  const tools = await prisma.tool.findMany({
    where: { serverId: params.id }
  });

  // Pass to client component
  return <ToolsTable tools={tools} serverId={params.id} />;
}

// Client Component - UI state only
'use client';
export function ToolsTable({ tools, serverId }) {
  const [dialogOpen, setDialogOpen] = useState(false); // UI state
  const [state, formAction] = useActionState(deleteTool, null); // Form state

  // No global state needed!
}
```

**When client state IS needed:**
- UI state: modals, dialogs, accordions, tabs
- Form state: controlled inputs, validation
- Optimistic updates: show changes before server confirms

**When client state is NOT needed:**
- Data from database (fetch in Server Components)
- Derived data (compute in Server Components)
- Shared data (pass as props or re-fetch)

**Consequences:**
- No `src/store/` directory needed
- Client Components are simpler (props + UI state only)
- Server Components handle all data fetching
- `revalidatePath()` replaces state updates

**Status**: ✅ **Accepted**

---

## 4. SQLite as Internal Database

**Decision**: Use SQLite (via Prisma) for Yasban's internal database, not PostgreSQL or MySQL.

**Date**: 2025-01-08

### Context

Yasban needs to store:
- Server configurations
- Tool definitions
- Connections (encrypted)
- Version snapshots
- Logs

Options:
1. **SQLite** - File-based database
2. **PostgreSQL** - Client-server database
3. **MySQL** - Client-server database
4. **JSON files** - Simple file storage

### Decision

Chosen: **SQLite**

### Rationale

**Pros:**
- ✅ **Local-first**: No server setup required
- ✅ **Single file**: Easy backup (copy `yasban.db`)
- ✅ **Portable**: Works on Windows, macOS, Linux
- ✅ **Perfect for desktop apps**: Zero configuration
- ✅ **ACID compliant**: Reliable transactions
- ✅ **Small footprint**: <1MB library size
- ✅ **Prisma support**: Excellent ORM support

**Why not PostgreSQL/MySQL:**
- ❌ Requires server setup (complex for users)
- ❌ Overkill for single-user desktop app
- ❌ More configuration and maintenance

**Why not JSON files:**
- ❌ No ACID guarantees
- ❌ No transactions
- ❌ Manual query logic
- ❌ Concurrent access issues

**Important Note:**
- This decision is for **Yasban's internal database** (storing server configs)
- Users can still connect to PostgreSQL/MySQL/SQL Server/SQLite for their MCP tools

**Consequences:**
- Database file stored in user's home directory
- Backup = copy single `.db` file
- No network configuration needed

**Status**: ✅ **Accepted**

---

## 5. One Service Per MCP Server (Not Monolithic)

**Decision**: Each MCP server runs as a separate OS service/process, not one monolithic service hosting all servers.

**Date**: 2025-01-08

### Context

Options for service architecture:
1. **One service per MCP server** (isolated processes)
2. **Monolithic service** hosting all MCP servers

### Decision

Chosen: **One service per MCP server**

### Rationale

**Pros:**
- ✅ **Better isolation**: Crash in one server doesn't affect others
- ✅ **Independent restart**: Can restart one server without affecting others
- ✅ **Easier debugging**: Logs separated per server
- ✅ **Flexible deployment**: Users can choose which servers to run as services
- ✅ **Resource management**: Can monitor CPU/memory per server
- ✅ **Cleaner architecture**: Each service has single responsibility

**Cons:**
- ⚠️ More processes to manage (acceptable tradeoff)
- ⚠️ Slightly higher memory overhead (minimal)

**Alternatives Considered:**
- **Monolithic service**: Single point of failure, harder to debug, all-or-nothing deployment

**Consequences:**
- Each server installed as: `yasban-{server-name}` service
- Service management UI shows status per server
- Can start/stop servers independently

**Status**: ✅ **Accepted**

---

## 6. All Three MCP Transports (stdio, SSE, HTTP)

**Decision**: Support all three MCP transports (stdio, SSE, HTTP) in Phase 1, not just stdio.

**Date**: 2025-01-08

### Context

MCP SDK supports three transport types:
1. **stdio** - Standard input/output (for Claude Desktop)
2. **SSE** - Server-Sent Events (for web clients)
3. **HTTP** - HTTP protocol (modern transport)

Options:
1. Support only **stdio** (simplest)
2. Support **stdio + SSE**
3. Support **all three**

### Decision

Chosen: **All three transports**

### Rationale

**Pros:**
- ✅ **Maximum compatibility**: Works with any MCP client
- ✅ **Future-proof**: Web-based MCP clients can use SSE/HTTP
- ✅ **Minimal extra work**: MCP SDK handles transport abstraction
- ✅ **Broader appeal**: Not limited to Claude Desktop
- ✅ **User choice**: Let users pick best transport for their use case

**Cons:**
- ⚠️ Slightly more testing needed (acceptable)

**Why all three:**
- stdio: Claude Desktop (most users)
- SSE: Web-based MCP clients
- HTTP: Modern transport, future standard

**Consequences:**
- Server config includes `transport` field
- User selects transport when creating server
- Runtime switches transport dynamically

**Status**: ✅ **Accepted**

---

## 7. node-windows/node-linux over Custom Systemd

**Decision**: Use `node-windows` and `node-linux` packages instead of writing custom systemd/Windows Service wrappers.

**Date**: 2025-01-08

### Context

Need to install MCP servers as OS services:
1. **Windows**: Windows Service
2. **Linux**: systemd daemon

Options:
1. **node-windows + node-linux** packages
2. **Custom systemd/Windows Service wrappers**

### Decision

Chosen: **node-windows + node-linux**

### Rationale

**Pros:**
- ✅ **Consistent API**: Same API for Windows and Linux
- ✅ **Well-tested**: Maintained packages with good track record
- ✅ **Handles edge cases**: Auto-restart, logging, permissions
- ✅ **Less code to maintain**: Don't reinvent the wheel
- ✅ **Simpler implementation**: Works out of the box

**Cons:**
- ⚠️ Dependency on third-party packages (acceptable risk)
- ⚠️ `node-windows` is in beta (but stable enough)

**Alternatives Considered:**
- **Custom wrappers**: More control, but much more complexity and maintenance

**Consequences:**
- Use `node-windows` for Windows services
- Use `node-linux` for Linux systemd
- Same API for both platforms

**Status**: ✅ **Accepted**

---

## 8. Runtime Interpretation over Ahead-of-Time Code Generation

**Decision**: Use runtime interpretation (read config from DB and execute) as primary mode, with optional code export as secondary feature.

**Date**: 2025-01-08

### Context

How should MCP servers execute tools?
1. **Runtime interpretation**: Read config from DB, execute dynamically
2. **Ahead-of-Time code generation**: Generate TypeScript/Python code, compile, run

### Decision

Chosen: **Runtime interpretation (primary) + Code export (optional)**

### Rationale

**Pros (Runtime Interpretation):**
- ✅ **Instant updates**: Hot-reload works seamlessly
- ✅ **Simpler workflow**: No build step for users
- ✅ **Version control**: Config snapshots enable perfect rollback
- ✅ **Easier debugging**: Config is data, not code
- ✅ **Lower barrier**: Non-developers can use

**Pros (Code Export - Optional):**
- ✅ **Power users**: Advanced users can export and customize
- ✅ **Portability**: Exported code runs without Yasban
- ✅ **Learning**: Users can see generated code

**Approach:**
- **Primary**: Runtime interpretation from database
- **Secondary**: Export as Node.js/Python project (Phase 1: Node.js only)

**Consequences:**
- MCP runtime loads config from SQLite
- Tools execute dynamically (SQL, REST, Webhook)
- Export feature generates standalone code (optional)

**Status**: ✅ **Accepted**

---

## 9. No Full JavaScript Execution in Phase 1

**Decision**: Phase 1 supports JavaScript transformation functions only (limited scope), not full custom JavaScript tools. Full JavaScript tools with `isolated-vm` sandboxing in Phase 2.

**Date**: 2025-01-08

### Context

JavaScript execution approaches:
1. **vm2** - Deprecated, security issues
2. **isolated-vm** - Secure, but complex
3. **Limited Function constructor** - Simple, limited scope
4. **No JavaScript** - Safest, least flexible

### Decision

Chosen: **Limited Function constructor (Phase 1) → isolated-vm (Phase 2)**

### Rationale

**Phase 1: Limited Transformation Functions**

```typescript
// Allowed: Transform SQL/REST results
return data.map(row => ({
  ...row,
  fullName: `${row.firstName} ${row.lastName}`
}));
```

**NOT Allowed in Phase 1:**
```typescript
// Full custom tools (Phase 2)
const fs = require('fs');
const files = fs.readdirSync('/');
```

**Pros:**
- ✅ **Good enough for MVP**: 80% of use cases covered
- ✅ **Simpler implementation**: No complex sandboxing
- ✅ **Safer**: Limited attack surface
- ✅ **Faster to market**: Don't block Phase 1 on isolated-vm

**Cons:**
- ⚠️ Limited functionality (acceptable for MVP)

**Phase 2: Full JavaScript with isolated-vm**
- Proper sandboxing for arbitrary code
- Custom JavaScript tools
- Full Node.js API access (controlled)

**Consequences:**
- Phase 1: Transformation functions only
- Forbidden keywords: require, import, eval, process, fs
- Timeout: 5 seconds
- Phase 2: Upgrade to `isolated-vm`

**Status**: ✅ **Accepted**

---

## 10. Version Control as Critical Feature

**Decision**: Version control (auto-snapshots + rollback) is a CRITICAL Phase 1 feature, not Phase 2.

**Date**: 2025-01-08

### Context

Should version control be in Phase 1 or Phase 2?

### Decision

Chosen: **Phase 1 (Critical Feature)**

### Rationale

**Why Critical:**
- ✅ **Safety**: Users need rollback if they break something
- ✅ **Confidence**: Encourages experimentation (can always rollback)
- ✅ **Professional**: Sets Yasban apart from competitors
- ✅ **Git-like experience**: Familiar to developers
- ✅ **Audit trail**: See who changed what and when

**How it works:**
1. Auto-snapshot on every config change
2. Version history with diff viewer
3. One-click rollback
4. "Before rollback" safety snapshot

**Consequences:**
- Every config change creates version snapshot
- Rollback must be tested thoroughly
- Version cleanup settings (optional)

**Status**: ✅ **Accepted**

---

## 11. MIT License

**Decision**: Release Yasban under MIT License.

**Date**: 2025-01-08

### Context

License options:
1. **MIT** - Most permissive
2. **Apache 2.0** - Patent protection
3. **GPL-3.0** - Copyleft (viral)

### Decision

Chosen: **MIT License**

### Rationale

**Pros:**
- ✅ **Maximum adoption**: No restrictions on commercial use
- ✅ **Simple**: Easy to understand
- ✅ **Community-friendly**: Encourages contributions
- ✅ **Compatible**: Can be integrated into proprietary software
- ✅ **Low barrier**: Businesses can use without legal concerns

**Cons:**
- ⚠️ No patent protection (not a concern for this project)
- ⚠️ Can be used in proprietary forks (acceptable)

**Alternatives Considered:**
- **GPL-3.0**: Too restrictive, would hurt adoption
- **Apache 2.0**: Patent clause unnecessary for our use case

**Consequences:**
- Anyone can use, modify, distribute
- Commercial use allowed
- No warranty/liability

**Status**: ✅ **Accepted**

---

## 12. No Telemetry (Privacy-First)

**Decision**: No usage telemetry. Only opt-in crash reporting (Sentry or similar).

**Date**: 2025-01-08

### Context

Telemetry options:
1. **Anonymous usage stats** (which features used)
2. **Crash reporting** (error tracking)
3. **No telemetry** (privacy-first)

### Decision

Chosen: **No telemetry + Opt-in crash reporting**

### Rationale

**Pros:**
- ✅ **Privacy-first**: Users trust us more
- ✅ **Open-source ethos**: Transparent, no tracking
- ✅ **Simpler**: No telemetry infrastructure
- ✅ **Compliant**: No GDPR/privacy concerns
- ✅ **User control**: Crash reporting is opt-in only

**What we DO collect:**
- ❌ NO usage stats
- ❌ NO user tracking
- ✅ Update checks (version number only, no personal data)
- ✅ Crash reports (opt-in, can disable anytime)

**Consequences:**
- Less data to improve product (acceptable tradeoff)
- Must rely on GitHub issues for feedback
- Crash reporting opt-in checkbox in settings

**Status**: ✅ **Accepted**

---

## 13. Radix UI over Material UI

**Decision**: Use Radix UI primitives with Tailwind CSS, not Material UI or Ant Design.

**Date**: 2025-01-08

### Context

UI library options:
1. **Material UI** - Full component library
2. **Ant Design** - Enterprise-focused
3. **Radix UI + Tailwind** - Headless + utility CSS

### Decision

Chosen: **Radix UI + Tailwind CSS**

### Rationale

**Pros:**
- ✅ **Headless**: Full styling control (no vendor lock-in)
- ✅ **Accessible**: ARIA compliant out of the box
- ✅ **Composable**: Build exactly what we need
- ✅ **Small bundle**: Only import what we use
- ✅ **Tailwind integration**: Perfect for utility-first CSS
- ✅ **Modern**: shadcn/ui pattern is proven

**Why not Material UI:**
- ❌ Opinionated design (harder to customize)
- ❌ Larger bundle size
- ❌ Less control over styling

**Why not Ant Design:**
- ❌ Enterprise-focused (overkill for our use case)
- ❌ Harder to customize

**Approach:**
- Use Radix UI primitives (Dialog, Select, Tabs, etc.)
- Style with Tailwind CSS
- Use shadcn/ui patterns as reference (don't copy verbatim)

**Consequences:**
- More control over design
- Build custom components
- Learn Radix UI API

**Status**: ✅ **Accepted**

---

## 🔗 Quick Links

- **[CLAUDE.md](./CLAUDE.md)** - Instructions for Claude sessions
- **[REFERENCE.md](./REFERENCE.md)** - Tech stack reference
- **[ROADMAP.md](./ROADMAP.md)** - Timeline
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Development workflow

---

**Maintained By**: Yasban Core Team
**License**: MIT
**Last Updated**: 2025-10-08

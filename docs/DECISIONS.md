# Yasban - Architecture Decision Records (ADRs)

This document records all significant architectural decisions made during Yasban development, explaining the rationale behind each choice.

**Last Updated**: 2025-01-08

---

## Decision Index

1. [Next.js inside Electron (Nextron Pattern)](#1-nextjs-inside-electron-nextron-pattern)
2. [Jotai over Zustand for State Management](#2-jotai-over-zustand-for-state-management)
3. [SQLite as Internal Database](#3-sqlite-as-internal-database)
4. [One Service Per MCP Server (Not Monolithic)](#4-one-service-per-mcp-server-not-monolithic)
5. [All Three MCP Transports (stdio, SSE, HTTP)](#5-all-three-mcp-transports-stdio-sse-http)
6. [node-windows/node-linux over Custom Systemd](#6-node-windowsnode-linux-over-custom-systemd)
7. [Runtime Interpretation over Ahead-of-Time Code Generation](#7-runtime-interpretation-over-ahead-of-time-code-generation)
8. [No Full JavaScript Execution in Phase 1](#8-no-full-javascript-execution-in-phase-1)
9. [Version Control as Critical Feature](#9-version-control-as-critical-feature)
10. [MIT License](#10-mit-license)
11. [No Telemetry (Privacy-First)](#11-no-telemetry-privacy-first)
12. [Radix UI over Material UI](#12-radix-ui-over-material-ui)

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

## 2. Jotai over Zustand for State Management

**Decision**: Use Jotai for state management, not Zustand or Redux.

**Date**: 2025-01-08

### Context

We needed global state management for:
- Server list
- Selected server
- UI state (modals, dialogs)
- Tool list
- Connection list

Options:
1. **Zustand** - Popular, simple API
2. **Jotai** - Atomic state management
3. **Redux Toolkit** - Traditional, verbose
4. **React Context** - Built-in, can be complex

### Decision

Chosen: **Jotai**

### Rationale

**Pros:**
- ✅ **Atomic state**: Perfect for wizard flows (each step has independent state)
- ✅ **Minimal boilerplate**: Simpler than Zustand for our use case
- ✅ **TypeScript-first**: Excellent type inference
- ✅ **Derived atoms**: Easy computed state (e.g., filtered server list)
- ✅ **Async atoms**: Built-in async support for IPC calls
- ✅ **Small bundle size**: 3KB gzipped
- ✅ **React Suspense support**: Future-proof

**Why not Zustand:**
- Zustand is great but designed for larger, more centralized stores
- Jotai's atomic approach fits our component-driven architecture better
- Wizard components benefit from isolated state atoms

**Alternatives Considered:**
- **Zustand**: Good choice, but Jotai is better for isolated component state
- **Redux**: Too verbose for our needs
- **Context**: Can cause unnecessary re-renders

**Example:**
```typescript
// Jotai - clean and simple
import { atom } from 'jotai';

export const serversAtom = atom<Server[]>([]);
export const selectedServerIdAtom = atom<string | null>(null);
export const selectedServerAtom = atom((get) => {
  const servers = get(serversAtom);
  const id = get(selectedServerIdAtom);
  return servers.find(s => s.id === id) || null;
});
```

**Consequences:**
- All state managed with Jotai atoms
- IPC calls wrapped in async atoms
- Wizard steps use isolated atoms

**Status**: ✅ **Accepted**

---

## 3. SQLite as Internal Database

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

## 4. One Service Per MCP Server (Not Monolithic)

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

## 5. All Three MCP Transports (stdio, SSE, HTTP)

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

## 6. node-windows/node-linux over Custom Systemd

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

## 7. Runtime Interpretation over Ahead-of-Time Code Generation

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

## 8. No Full JavaScript Execution in Phase 1

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

## 9. Version Control as Critical Feature

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

## 10. MIT License

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

## 11. No Telemetry (Privacy-First)

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

## 12. Radix UI over Material UI

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
**Last Updated**: 2025-01-08

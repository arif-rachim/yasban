# Yasban (يسبان)

Yasban is a web application for building MCP (Model Context Protocol) servers through forms and wizards instead of code, so that AI assistants such as Claude Desktop can query databases, call REST APIs and receive webhooks. In the browser you create a server, add connections and tools (a SQL query against PostgreSQL, MySQL, SQL Server or SQLite, an HTTP request, a webhook handler or a small JavaScript function), define parameters, test each tool against the real system, then start the server. A Next.js app stores all configuration in a local SQLite database through Prisma, and a separate Node.js MCP runtime (`yasban-mcp`) loads a server's tools from that database and serves them over stdio, SSE or Streamable HTTP, polling for configuration changes so edits apply without a restart. Servers can also be installed as a Windows service or Linux daemon, every change is snapshotted for rollback, and a set of built-in templates gives starting points. It is aimed at analysts and developers who want to expose existing data sources to an AI assistant quickly. The project is an early-stage monorepo (version 0.1.0, October 2025) written in TypeScript.

> Status: early development, not actively updated since October 2025. It started as an Electron desktop app and was converted to a Next.js-only web app in its last commits.

## Features

- **Servers**: create, edit, start and stop MCP servers from the dashboard; choose the transport (stdio for Claude Desktop, SSE, or Streamable HTTP with a port)
- **Tool creation wizard** for four tool types:
  - SQL: PostgreSQL (`pg`), MySQL (`mysql2`), SQL Server (`tedious`) and SQLite (`better-sqlite3`), with a Monaco SQL editor, named parameters, a 30-second query timeout and result schemas inferred from column types
  - REST: HTTP requests via `axios` with parameter substitution
  - Webhook: handlers matched against paths under `/api/webhook/...`, with path parameters
  - JavaScript: small functions run with the `Function` constructor and a 5-second timeout (not a full sandbox)
- **Connections** per server, with a connection tester
- **Tool testing**: run a tool with sample inputs from the UI and view results as a table or JSON; webhook tools are tested with a mock response
- **Version history**: snapshots of a server's configuration, automatic snapshots on changes, and rollback to any version
- **Live configuration reload**: the runtime polls the database every 2 seconds and reloads tools when the configuration checksum changes
- **OS service management**: install, uninstall and query a server as a Windows service (`node-windows`) or Linux daemon (`node-linux`); macOS is not supported
- **Logs**: per-server rotating log files (winston, 10 MB files, 14 days) and a live log viewer streamed over SSE
- **Templates**: built-in SQL, REST, webhook and JavaScript templates seeded by `prisma/seed.ts`; create a server from a template
- **Naming helpers**: inputs that format server, tool, connection and parameter names to the project's conventions

## Tech stack

Next.js 15 (App Router, Server Actions) · React 18 · TypeScript · Tailwind CSS · Radix UI · Jotai · React Hook Form · TanStack Table · Monaco Editor · Prisma · SQLite · @modelcontextprotocol/sdk · Express · Commander · winston · npm workspaces

## Getting started

Prerequisites: Node.js 20 or newer and npm. Native modules (`better-sqlite3`) need a working build toolchain on some platforms.

```bash
git clone https://github.com/arif-rachim/yasban.git
cd yasban
npm install          # also runs "prisma generate"
```

Create a `.env` file that sets `DATABASE_URL` to a SQLite file URL for `prisma/dev.db`. The MCP runtime always reads `prisma/dev.db` (see `packages/mcp-runtime/src/config-loader.ts`), so the web app and the runtime must point at the same file.

```bash
npm run db:migrate   # apply Prisma migrations
npm run db:seed      # load built-in templates
npm run dev          # frees port 3001 and starts the web app on http://localhost:3001
```

Production build:

```bash
npm run build        # builds @yasban/shared, @yasban/mcp-runtime and @yasban/web
cd packages/web
npm run start        # next start -p 3001
```

The web app starts servers by spawning `packages/mcp-runtime/dist/index.js`, so the runtime must be built before servers can run.

### Scripts

| Command | Action |
| :------ | :----- |
| `npm run dev` | Start the web app in development mode on port 3001 |
| `npm run dev:mcp` | Run the MCP runtime with `tsx watch` |
| `npm run build` | Build all workspaces |
| `npm run db:generate` / `db:migrate` / `db:seed` / `db:studio` / `db:reset` | Prisma client, migrations, seed data, Prisma Studio, reset |
| `npm run lint` | Lint all workspaces |
| `npm run format` | Format with Prettier |
| `npm test` | Vitest (configured, but the repository has no test files yet) |

### Running the MCP runtime directly

```bash
node packages/mcp-runtime/dist/index.js --server <server-id> --transport stdio
node packages/mcp-runtime/dist/index.js --server <server-id> --transport streamable-http --port 3100
```

Options: `-s, --server <id>` (required), `-t, --transport stdio|sse|streamable-http` (default `stdio`), `-p, --port` (default `3000`), `--log-level`, `--log-file` and `--auth-token` (optional bearer token for remote transports). `npm run servers --workspace=@yasban/mcp-runtime` lists server IDs from the database.

## Architecture

```text
┌─────────────────────────────────┐
│      Web browser                │
│  http://localhost:3001          │
└────────────┬────────────────────┘
             │ HTTP
             ▼
┌─────────────────────────────────┐
│   Next.js server + Jotai        │
│  • Server Actions               │
│  • Process and service manager  │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│   SQLite database (Prisma)      │
│  • Servers  • Tools             │
│  • Connections  • Versions      │
└────────────┬────────────────────┘
             │ spawns / manages
             ▼
┌─────────────────────────────────┐
│        MCP runtime              │
│  • SQL executor                 │
│  • REST executor                │
│  • Webhook executor             │
│  • JavaScript executor          │
│  • Config polling (2 s)         │
└────────────┬────────────────────┘
             │ MCP protocol
             ▼
┌─────────────────────────────────┐
│   Claude Desktop / MCP client   │
└─────────────────────────────────┘
```

The executors live in `@yasban/shared` so the web app's test panel and the runtime run tools the same way. The Prisma schema (`prisma/schema.prisma`) has models for servers, tools, connections, parameters, test cases, versions, templates, logs and environments. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.

## Project structure

```text
packages/
├── web/            Next.js app: dashboard, server pages, tool wizard, templates, API routes
├── mcp-runtime/    yasban-mcp CLI: loads a server from SQLite and serves its tools
└── shared/         tool executors, shared types, parameter substitution, logger
prisma/             schema, migrations and seed data (templates)
scripts/            dev port cleanup and runtime database migration helpers
docs/               design, architecture, decisions, roadmap and session notes
```

## Documentation

- [docs/CURRENT_SESSION_STATUS.md](docs/CURRENT_SESSION_STATUS.md): latest progress and next priorities
- [docs/CLAUDE.md](docs/CLAUDE.md): instructions for Claude Code sessions
- [docs/REFERENCE.md](docs/REFERENCE.md): quick technical reference
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): system architecture
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md): development workflow
- [docs/DECISIONS.md](docs/DECISIONS.md): architecture decision records
- [docs/NAMING_CONVENTIONS.md](docs/NAMING_CONVENTIONS.md): naming rules for servers, tools, connections and parameters
- [docs/STREAMABLE_HTTP_GUIDE.md](docs/STREAMABLE_HTTP_GUIDE.md): using the Streamable HTTP transport
- [docs/BUNDLING_AND_DISTRIBUTION.md](docs/BUNDLING_AND_DISTRIBUTION.md): deployment guide
- [docs/ROADMAP.md](docs/ROADMAP.md): timeline and feature roadmap
- [packages/mcp-runtime/README.md](packages/mcp-runtime/README.md): runtime package notes

## Limitations

- Connection credentials are stored as plain JSON in the SQLite database; the encryption described in the design docs is not implemented.
- Export to `mcp.json` or a standalone Node.js project, the version diff viewer and one-click Claude Desktop setup are planned in the docs but not in the code.
- JavaScript tools use the `Function` constructor with a timeout, not an isolated sandbox (isolated-vm is planned).
- The web app has no authentication; run it only on a trusted machine.
- There are no automated tests yet.

## Roadmap

From [docs/ROADMAP.md](docs/ROADMAP.md) and the code comments:

- Credential encryption, export as `mcp.json` / Node.js project, version diff viewer
- MCP resources and prompts
- Full JavaScript custom tools with isolated-vm sandboxing
- OAuth 2.0, GraphQL and gRPC support
- Template marketplace, team collaboration, visual query builder, analytics dashboard, plugin system

## License

The `@yasban/mcp-runtime` package declares the MIT license in its `package.json`. The repository does not include a LICENSE file yet.

# Migration to Next.js Server Architecture

## Overview

This document explains the migration from Electron IPC-based architecture to Next.js server-based architecture, reducing `'use client'` usage and leveraging React Server Components.

## Architecture Changes

### Before (Electron IPC)
```
┌─────────────┐         IPC         ┌──────────────┐
│   Client    │◄────────────────────►│   Electron   │
│ Components  │                      │ Main Process │
│             │   (ipcRenderer/      │              │
│ 'use client'│    ipcMain)          │  Database    │
└─────────────┘                      └──────────────┘
```

### After (Next.js Server)
```
┌─────────────┐      HTTP/API       ┌──────────────┐
│   Server    │                     │   Next.js    │
│ Components  │                     │    Server    │
│             │                     │              │
│  (RSC)      │                     │  Database    │
└─────────────┘                     │              │
       │                            │  Services    │
       ▼                            └──────────────┘
┌─────────────┐                            ▲
│   Client    │                            │
│ Components  │────────HTTP/SSE────────────┘
│ (Interactive)
└─────────────┘
        │
        ▼
┌──────────────┐
│   Electron   │
│  (Viewer)    │
└──────────────┘
```

## Key Benefits

1. **Less Client-Side Code**: Server Components reduce bundle size
2. **Better Data Fetching**: Fetch data directly on the server
3. **Simpler Architecture**: Standard HTTP instead of IPC
4. **Real-Time Updates**: Server-Sent Events for log streaming
5. **Electron as Viewer**: Electron only wraps the UI, no business logic

## New File Structure

### Core Files Created

```
src/
├── lib/
│   ├── prisma.ts                 # Prisma client for Next.js
│   └── service-manager.ts        # MCP server process management
│
├── app/
│   ├── api/
│   │   ├── servers/
│   │   │   ├── route.ts          # List/create servers
│   │   │   ├── [id]/
│   │   │   │   ├── route.ts      # Get/update/delete server
│   │   │   │   └── connections/
│   │   │   │       └── route.ts  # Connection operations
│   │   │
│   │   └── services/
│   │       └── [id]/
│   │           ├── start/
│   │           │   └── route.ts  # Start MCP server
│   │           ├── stop/
│   │           │   └── route.ts  # Stop MCP server
│   │           ├── restart/
│   │           │   └── route.ts  # Restart MCP server
│   │           ├── status/
│   │           │   └── route.ts  # Get server status
│   │           └── logs/
│   │               ├── route.ts  # Get logs
│   │               └── stream/
│   │                   └── route.ts  # SSE log streaming
│   │
│   └── servers/
│       └── [id]/
│           └── connections/
│               ├── page.tsx           # Server Component (data fetch)
│               ├── ConnectionsTable.tsx  # Client Component (interactive)
│               └── actions.ts         # Server Actions (mutations)
```

## Migration Status

### ✅ Phase 1: Server Mode Setup
- [x] Updated `next.config.js` for server mode
- [x] Created Prisma client singleton for Next.js
- [x] Created initial API route structure

### ✅ Phase 2: Server Components
- [x] Converted connections page to Server Component
- [x] Created Server Actions for mutations
- [x] Extracted interactive elements to Client Components

### ✅ Phase 3: Service Management
- [x] Created service manager module (`src/lib/service-manager.ts`)
- [x] Created API routes for MCP server operations
- [x] Implemented Server-Sent Events for log streaming

### ⏳ Phase 4: Complete Migration (TODO)
- [ ] Migrate remaining pages (tools, versions, logs, settings)
- [ ] Update IPC library to use HTTP instead of IPC
- [ ] Test all functionality
- [ ] Update production build process

## How to Use the New Architecture

### Server Components (Data Fetching)

```typescript
// src/app/servers/[id]/connections/page.tsx
import prisma from '@/lib/prisma';
import { ConnectionsTable } from './ConnectionsTable';

export default async function ConnectionsPage({ params }) {
  // Fetch data on the server
  const connections = await prisma.connection.findMany({
    where: { serverId: params.id },
  });

  // Pass to Client Component
  return <ConnectionsTable initialConnections={connections} />;
}
```

### Server Actions (Mutations)

```typescript
// src/app/servers/[id]/connections/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';

export async function deleteConnection(connectionId: string) {
  await prisma.connection.delete({ where: { id: connectionId } });
  revalidatePath('/servers/[id]/connections');
  return { success: true };
}
```

### Client Components (Interactive UI)

```typescript
// src/app/servers/[id]/connections/ConnectionsTable.tsx
'use client';

import { deleteConnection } from './actions';

export function ConnectionsTable({ initialConnections }) {
  const handleDelete = async (id) => {
    await deleteConnection(id);
    window.location.reload(); // Or use router.refresh()
  };

  return <DataTable data={initialConnections} onDelete={handleDelete} />;
}
```

### API Routes (Service Operations)

```typescript
// Client code - use fetch instead of IPC
const response = await fetch(`/api/services/${serverId}/start`, {
  method: 'POST',
});
const result = await response.json();
```

### Server-Sent Events (Real-Time Logs)

```typescript
// Client code
const eventSource = new EventSource(`/api/services/${serverId}/logs/stream`);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Log:', data.message);
};
```

## API Endpoints

### Server Management
- `GET /api/servers` - List all servers
- `POST /api/servers` - Create server
- `GET /api/servers/[id]` - Get server details
- `PUT /api/servers/[id]` - Update server
- `DELETE /api/servers/[id]` - Delete server

### Connection Management
- `GET /api/servers/[id]/connections` - List connections
- `POST /api/servers/[id]/connections` - Create connection

### Service Operations
- `POST /api/services/[id]/start` - Start MCP server
- `POST /api/services/[id]/stop` - Stop MCP server
- `POST /api/services/[id]/restart` - Restart MCP server
- `GET /api/services/[id]/status` - Get server status
- `GET /api/services/[id]/logs?lines=100` - Get logs
- `GET /api/services/[id]/logs/stream` - Stream logs (SSE)

## Testing the Migration

### 1. Test Connections Page
The connections page now uses the new architecture:
- Open any server's connections page
- Create/edit/delete connections using Server Actions
- Data fetches happen on the server

### 2. Test Service Management (when migrated)
```bash
# Start server
curl -X POST http://localhost:3001/api/services/{serverId}/start

# Get status
curl http://localhost:3001/api/services/{serverId}/status

# Stream logs
curl http://localhost:3001/api/services/{serverId}/logs/stream
```

## Next Steps

1. **Migrate remaining pages**: tools, versions, logs, settings
2. **Update IPC library**: Create a wrapper that uses HTTP instead of IPC
3. **Testing**: Ensure all features work with new architecture
4. **Production build**: Update build process if needed
5. **Remove old IPC handlers**: Once migration is complete

## Backwards Compatibility

During migration:
- Old pages still use Electron IPC
- New pages use Next.js API routes
- Both can coexist until full migration

## Notes

- The Electron process now only serves as a browser wrapper
- All business logic runs in Next.js server
- Database is accessed from Next.js, not Electron
- Log streaming uses Server-Sent Events instead of IPC events
- Server Components reduce the amount of JavaScript sent to the client

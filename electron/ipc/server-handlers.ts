import { ipcMain } from 'electron';
import prisma from '../database/client';

/**
 * IPC Handlers for Server operations
 */

// List all servers
ipcMain.handle('server:list', async () => {
  try {
    const servers = await prisma.server.findMany({
      include: {
        tools: true,
        connections: true,
        _count: {
          select: {
            tools: true,
            connections: true,
            versions: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return { success: true, data: servers };
  } catch (error: any) {
    console.error('Error listing servers:', error);
    return { success: false, error: error.message };
  }
});

// Get server by ID
ipcMain.handle('server:get', async (_, serverId: string) => {
  try {
    const server = await prisma.server.findUnique({
      where: { id: serverId },
      include: {
        tools: {
          include: {
            parameters: true,
          },
        },
        connections: true,
        versions: {
          orderBy: {
            versionNumber: 'desc',
          },
          take: 10, // Last 10 versions
        },
      },
    });

    if (!server) {
      return { success: false, error: 'Server not found' };
    }

    return { success: true, data: server };
  } catch (error: any) {
    console.error('Error getting server:', error);
    return { success: false, error: error.message };
  }
});

// Create server
ipcMain.handle('server:create', async (_, data: any) => {
  try {
    const server = await prisma.server.create({
      data: {
        name: data.name,
        description: data.description,
        transport: data.transport || 'stdio',
        runMode: data.runMode || 'gui',
        // Create initial version snapshot
        versions: {
          create: {
            versionNumber: 1,
            configSnapshot: JSON.stringify({ ...data, tools: [], connections: [] }),
            description: 'Initial version',
            createdBy: 'user',
          },
        },
      },
      include: {
        tools: true,
        connections: true,
      },
    });

    console.log(`Server created: ${server.name} (ID: ${server.id})`);
    return { success: true, data: server };
  } catch (error: any) {
    console.error('Error creating server:', error);
    return { success: false, error: error.message };
  }
});

// Update server
ipcMain.handle('server:update', async (_, serverId: string, data: any) => {
  try {
    // Get current server for version snapshot
    const currentServer = await prisma.server.findUnique({
      where: { id: serverId },
      include: {
        tools: true,
        connections: true,
      },
    });

    if (!currentServer) {
      return { success: false, error: 'Server not found' };
    }

    // Get last version number
    const lastVersion = await prisma.version.findFirst({
      where: { serverId },
      orderBy: { versionNumber: 'desc' },
    });

    const nextVersionNumber = (lastVersion?.versionNumber || 0) + 1;

    // Update server and create version snapshot in transaction
    const [updatedServer] = await prisma.$transaction([
      prisma.server.update({
        where: { id: serverId },
        data: {
          name: data.name,
          description: data.description,
          transport: data.transport,
          runMode: data.runMode,
          status: data.status,
        },
        include: {
          tools: true,
          connections: true,
        },
      }),
      // Create version snapshot
      prisma.version.create({
        data: {
          serverId,
          versionNumber: nextVersionNumber,
          configSnapshot: JSON.stringify(currentServer),
          description: data.versionDescription || 'Auto-save: Server updated',
          createdBy: 'user',
        },
      }),
    ]);

    console.log(`Server updated: ${updatedServer.name}`);
    return { success: true, data: updatedServer };
  } catch (error: any) {
    console.error('Error updating server:', error);
    return { success: false, error: error.message };
  }
});

// Delete server
ipcMain.handle('server:delete', async (_, serverId: string) => {
  try {
    // Delete server (cascade deletes tools, connections, versions)
    await prisma.server.delete({
      where: { id: serverId },
    });

    console.log(`Server deleted: ${serverId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting server:', error);
    return { success: false, error: error.message };
  }
});

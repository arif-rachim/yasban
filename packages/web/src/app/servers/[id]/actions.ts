'use server';

/**
 * Server Control Actions - Start/Stop MCP servers in GUI mode
 *
 * These Server Actions handle starting and stopping MCP runtime processes
 * that run as children of the Next.js server.
 */

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { processManager } from '@/lib/process-manager';
import { findAvailablePort } from '@/lib/port-finder';

/**
 * Start MCP server in GUI mode
 */
export async function startServerGUI(serverId: string) {
  try {
    // Get server configuration
    const server = await prisma.server.findUnique({
      where: { id: serverId },
      select: {
        id: true,
        name: true,
        status: true,
        runMode: true,
        transport: true,
      },
    });

    if (!server) {
      return {
        success: false,
        error: 'Server not found',
      };
    }

    // Verify server is in GUI mode
    if (server.runMode !== 'gui') {
      return {
        success: false,
        error: 'Server is configured for service mode. Change to GUI mode in settings.',
      };
    }

    // Check if already running
    if (server.status === 'running' || processManager.isRunning(serverId)) {
      return {
        success: false,
        error: 'Server is already running',
      };
    }

    // Find an available port (for SSE/HTTP transports)
    const port = await findAvailablePort(3100);

    // Update database status to running and save port FIRST
    await prisma.server.update({
      where: { id: serverId },
      data: { status: 'running', port },
    });

    // Try to start MCP process
    try {
      await processManager.startGUI(serverId, server.transport, port);

      // Success! Revalidate pages
      revalidatePath(`/servers/${serverId}`);
      revalidatePath('/');

      return {
        success: true,
        message: `Server "${server.name}" started successfully on port ${port}`,
      };
    } catch (processError: any) {
      // Process failed to start - rollback database status and clear port!
      console.error('[startServerGUI] Process failed to start, rolling back:', processError);

      await prisma.server.update({
        where: { id: serverId },
        data: { status: 'stopped', port: null },
      });

      revalidatePath(`/servers/${serverId}`);
      revalidatePath('/');

      return {
        success: false,
        error: processError.message || 'Failed to start MCP process',
      };
    }
  } catch (error: any) {
    console.error('[startServerGUI] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to start server',
    };
  }
}

/**
 * Stop MCP server in GUI mode
 */
export async function stopServerGUI(serverId: string) {
  try {
    // Get server configuration
    const server = await prisma.server.findUnique({
      where: { id: serverId },
      select: {
        id: true,
        name: true,
        status: true,
        runMode: true,
      },
    });

    if (!server) {
      return {
        success: false,
        error: 'Server not found',
      };
    }

    // Verify server is in GUI mode
    if (server.runMode !== 'gui') {
      return {
        success: false,
        error: 'Server is configured for service mode. Use service controls.',
      };
    }

    // Stop MCP process (won't throw error if not found)
    await processManager.stopGUI(serverId);

    // ALWAYS update database status to stopped and clear port
    // (even if process wasn't running - fixes status mismatch)
    await prisma.server.update({
      where: { id: serverId },
      data: { status: 'stopped', port: null },
    });

    // Revalidate pages
    revalidatePath(`/servers/${serverId}`);
    revalidatePath('/');

    return {
      success: true,
      message: `Server "${server.name}" stopped successfully`,
    };
  } catch (error: any) {
    console.error('[stopServerGUI] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to stop server',
    };
  }
}

/**
 * Get server status (running/stopped)
 */
export async function getServerStatus(serverId: string) {
  try {
    const server = await prisma.server.findUnique({
      where: { id: serverId },
      select: {
        id: true,
        status: true,
        runMode: true,
      },
    });

    if (!server) {
      return {
        success: false,
        error: 'Server not found',
      };
    }

    // Check if process is actually running (in case of mismatch)
    const isActuallyRunning = processManager.isRunning(serverId);

    // If DB says running but process not found, update DB
    if (server.status === 'running' && !isActuallyRunning && server.runMode === 'gui') {
      await prisma.server.update({
        where: { id: serverId },
        data: { status: 'stopped', port: null },
      });

      return {
        success: true,
        data: {
          status: 'stopped',
          runMode: server.runMode,
        },
      };
    }

    return {
      success: true,
      data: {
        status: server.status,
        runMode: server.runMode,
        isActuallyRunning,
      },
    };
  } catch (error: any) {
    console.error('[getServerStatus] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to get server status',
    };
  }
}

/**
 * Sync server status - fixes mismatches between DB and actual process state
 * Useful for recovering from crashes or stuck states
 */
export async function syncServerStatus(serverId: string) {
  try {
    const server = await prisma.server.findUnique({
      where: { id: serverId },
      select: {
        id: true,
        name: true,
        status: true,
        runMode: true,
      },
    });

    if (!server) {
      return {
        success: false,
        error: 'Server not found',
      };
    }

    // Only sync GUI mode servers
    if (server.runMode !== 'gui') {
      return {
        success: true,
        message: 'Server is in service mode, no sync needed',
      };
    }

    const isActuallyRunning = processManager.isRunning(serverId);
    const dbStatus = server.status;

    // Check for mismatch
    if (dbStatus === 'running' && !isActuallyRunning) {
      // DB says running but process not found - fix it
      await prisma.server.update({
        where: { id: serverId },
        data: { status: 'stopped', port: null },
      });

      revalidatePath(`/servers/${serverId}`);
      revalidatePath('/');

      return {
        success: true,
        message: 'Status synced: Database updated to stopped (process not running)',
        fixed: true,
      };
    } else if (dbStatus === 'stopped' && isActuallyRunning) {
      // DB says stopped but process is running - fix it
      await prisma.server.update({
        where: { id: serverId },
        data: { status: 'running' },
      });

      revalidatePath(`/servers/${serverId}`);
      revalidatePath('/');

      return {
        success: true,
        message: 'Status synced: Database updated to running (process found)',
        fixed: true,
      };
    } else {
      // Status matches - no fix needed
      return {
        success: true,
        message: 'Status already in sync',
        fixed: false,
      };
    }
  } catch (error: any) {
    console.error('[syncServerStatus] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to sync server status',
    };
  }
}

'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';

/**
 * Server Actions for Server Management
 *
 * All server CRUD operations migrated from IPC to Server Actions.
 * These run on the server and can be called from Client or Server Components.
 */

export async function createServer(formData: FormData) {
  try {
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const transport = formData.get('transport') as string;
    const runMode = formData.get('runMode') as string;
    const portStr = formData.get('port') as string;

    if (!name || !transport || !runMode) {
      return {
        success: false,
        error: 'Name, transport, and run mode are required',
      };
    }

    // Parse and validate port
    let port: number | null = null;
    if (portStr && portStr.trim() !== '') {
      port = parseInt(portStr, 10);
      if (isNaN(port) || port < 1024 || port > 65535) {
        return {
          success: false,
          error: 'Port must be a number between 1024 and 65535',
        };
      }
    }

    // Port is only applicable for SSE and Streamable HTTP
    if (port && transport === 'stdio') {
      return {
        success: false,
        error: 'Port is not applicable for stdio transport',
      };
    }

    const server = await prisma.server.create({
      data: {
        name,
        description: description || '',
        transport,
        runMode,
        status: 'stopped',
        port,
      },
    });

    revalidatePath('/');
    revalidatePath('/servers');

    return { success: true, data: server };
  } catch (error: any) {
    console.error('Error creating server:', error);
    return { success: false, error: error.message };
  }
}

export async function updateServer(serverId: string, formData: FormData) {
  try {
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    if (!name) {
      return { success: false, error: 'Name is required' };
    }

    const server = await prisma.server.update({
      where: { id: serverId },
      data: {
        name,
        description: description || '',
      },
    });

    revalidatePath('/');
    revalidatePath('/servers');
    revalidatePath(`/servers/${serverId}`);

    return { success: true, data: server };
  } catch (error: any) {
    console.error('Error updating server:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteServer(serverId: string) {
  try {
    // Manually delete Environment and Log entries (no FK cascade)
    await prisma.environment.deleteMany({
      where: { serverId },
    });

    await prisma.log.deleteMany({
      where: { serverId },
    });

    // Delete server (auto-cascades: Tools, Connections, Versions, Parameters, TestCases)
    await prisma.server.delete({
      where: { id: serverId },
    });

    revalidatePath('/');
    revalidatePath('/servers');

    return { success: true, message: 'Server deleted successfully' };
  } catch (error: any) {
    console.error('Error deleting server:', error);
    return { success: false, error: error.message };
  }
}

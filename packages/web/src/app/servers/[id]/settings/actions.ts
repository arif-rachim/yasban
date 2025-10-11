'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';

/**
 * Server Actions for Server Settings
 */

export async function updateServerSettings(formData: FormData) {
  try {
    const serverId = formData.get('serverId') as string;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const transport = formData.get('transport') as string;
    const runMode = formData.get('runMode') as string;

    if (!serverId || !name) {
      return {
        success: false,
        error: 'Server ID and name are required',
      };
    }

    // Validate transport and runMode values
    if (transport && !['stdio', 'sse', 'streamable-http'].includes(transport)) {
      return {
        success: false,
        error: 'Invalid transport type. Must be stdio, sse, or streamable-http.',
      };
    }

    if (runMode && !['gui', 'service'].includes(runMode)) {
      return {
        success: false,
        error: 'Invalid run mode. Must be gui or service.',
      };
    }

    // Check if server is running before allowing transport/runMode changes
    const currentServer = await prisma.server.findUnique({
      where: { id: serverId },
      select: { status: true, transport: true, runMode: true },
    });

    if (!currentServer) {
      return {
        success: false,
        error: 'Server not found',
      };
    }

    // Prevent changing transport or runMode while server is running
    if (currentServer.status === 'running') {
      const transportChanged = transport && transport !== currentServer.transport;
      const runModeChanged = runMode && runMode !== currentServer.runMode;

      if (transportChanged || runModeChanged) {
        return {
          success: false,
          error: 'Cannot change server settings while server is running. Please stop the server first.',
        };
      }
    }

    // Update server with all fields
    const server = await prisma.server.update({
      where: { id: serverId },
      data: {
        name,
        description: description || '',
        ...(transport && { transport }),
        ...(runMode && { runMode }),
      },
    });

    revalidatePath('/');
    revalidatePath(`/servers/${serverId}/settings`);
    revalidatePath(`/servers/${serverId}`);

    return { success: true, data: server };
  } catch (error: any) {
    console.error('Error updating server settings:', error);
    return { success: false, error: error.message };
  }
}

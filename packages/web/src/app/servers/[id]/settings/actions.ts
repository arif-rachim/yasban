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
    const portStr = formData.get('port') as string;

    if (!serverId || !name) {
      return {
        success: false,
        error: 'Server ID and name are required',
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

    // Validate transport and runMode values
    if (transport && !['stdio', 'sse', 'streamable-http'].includes(transport)) {
      return {
        success: false,
        error: 'Invalid transport type. Must be stdio, sse, or streamable-http.',
      };
    }

    // Port is only applicable for SSE and Streamable HTTP
    if (port && transport === 'stdio') {
      return {
        success: false,
        error: 'Port is not applicable for stdio transport',
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
      select: { status: true, transport: true, runMode: true, serviceInstalled: true },
    });

    if (!currentServer) {
      return {
        success: false,
        error: 'Server not found',
      };
    }

    // Prevent changing from service to gui if service is installed
    if (runMode && runMode === 'gui' && currentServer.runMode === 'service' && currentServer.serviceInstalled) {
      return {
        success: false,
        error: 'Cannot change to GUI mode while service is installed. Please uninstall the service first.',
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
        port: port,
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

'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { serviceManager } from '@/lib/service-manager';

/**
 * Server Actions for Service Management
 *
 * These actions handle installing and uninstalling MCP runtime as OS services (Windows/Linux).
 * Services are configured with auto-start and will automatically start on system boot.
 */

export async function installService(serverId: string) {
  try {
    // Check if platform is supported
    if (!serviceManager.isPlatformSupported()) {
      return {
        success: false,
        error: 'Service installation is not supported on this platform. Only Windows and Linux are supported.',
      };
    }

    // Get server details
    const server = await prisma.server.findUnique({
      where: { id: serverId },
      select: {
        id: true,
        name: true,
        transport: true,
        port: true,
        runMode: true,
        serviceInstalled: true,
        status: true,
      },
    });

    if (!server) {
      return {
        success: false,
        error: 'Server not found',
      };
    }

    // Validate runMode is 'service'
    if (server.runMode !== 'service') {
      return {
        success: false,
        error: 'Server must be in service mode to install as a service. Please change the run mode in settings first.',
      };
    }

    // Check if service is already installed
    if (server.serviceInstalled) {
      return {
        success: false,
        error: 'Service is already installed. Uninstall it first before reinstalling.',
      };
    }

    // Stop server if running in GUI mode
    if (server.status === 'running') {
      return {
        success: false,
        error: 'Please stop the server before installing as a service.',
      };
    }

    // Install the service
    await serviceManager.install({
      serverId: server.id,
      serverName: server.name,
      transport: server.transport,
      port: server.port,
    });

    // Revalidate paths
    revalidatePath('/');
    revalidatePath(`/servers/${serverId}`);

    return {
      success: true,
      message: `Service installed successfully as ${serviceManager.getServiceName(server.name)}. It will auto-start on system boot.`,
    };
  } catch (error: any) {
    console.error('Error installing service:', error);
    return {
      success: false,
      error: error.message || 'Failed to install service. Make sure you have administrator/root privileges.',
    };
  }
}

export async function uninstallService(serverId: string) {
  try {
    // Check if platform is supported
    if (!serviceManager.isPlatformSupported()) {
      return {
        success: false,
        error: 'Service uninstallation is not supported on this platform.',
      };
    }

    // Get server details
    const server = await prisma.server.findUnique({
      where: { id: serverId },
      select: {
        id: true,
        name: true,
        serviceInstalled: true,
        serviceName: true,
        status: true,
      },
    });

    if (!server) {
      return {
        success: false,
        error: 'Server not found',
      };
    }

    // Check if service is installed
    if (!server.serviceInstalled) {
      return {
        success: false,
        error: 'Service is not installed',
      };
    }

    // Uninstall the service (node-windows/node-linux will handle stopping if needed)
    await serviceManager.uninstall(serverId);

    // Revalidate paths
    revalidatePath('/');
    revalidatePath(`/servers/${serverId}`);
    revalidatePath(`/servers/${serverId}/settings`);

    return {
      success: true,
      message: 'Service uninstalled successfully',
    };
  } catch (error: any) {
    console.error('Error uninstalling service:', error);
    return {
      success: false,
      error: error.message || 'Failed to uninstall service. Make sure you have administrator/root privileges.',
    };
  }
}


export async function getServiceStatus(serverId: string) {
  try {
    // Check if platform is supported
    if (!serviceManager.isPlatformSupported()) {
      return {
        success: true,
        status: 'not_supported' as const,
      };
    }

    // Get current status from service manager
    const status = await serviceManager.getStatus(serverId);

    return {
      success: true,
      status,
    };
  } catch (error: any) {
    console.error('Error getting service status:', error);
    return {
      success: false,
      error: error.message,
      status: 'not_installed' as const,
    };
  }
}

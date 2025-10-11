'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';

/**
 * Server Actions for Version Control Management
 *
 * CRITICAL FEATURE: Auto-creates snapshots on every config change
 * Enables rollback functionality for servers
 */

/**
 * Helper function to create a complete server snapshot
 * This captures all server config, tools, connections, and parameters
 */
async function createServerSnapshot(
  serverId: string,
  description: string,
  createdBy: 'user' | 'system' = 'system'
) {
  // Fetch complete server configuration
  const server = await prisma.server.findUnique({
    where: { id: serverId },
    include: {
      tools: {
        include: {
          parameters: true,
        },
      },
      connections: true,
    },
  });

  if (!server) {
    throw new Error('Server not found');
  }

  // Get the next version number
  const lastVersion = await prisma.version.findFirst({
    where: { serverId },
    orderBy: { versionNumber: 'desc' },
    select: { versionNumber: true },
  });

  const nextVersionNumber = (lastVersion?.versionNumber || 0) + 1;

  // Create snapshot JSON
  const configSnapshot = {
    server: {
      id: server.id,
      name: server.name,
      description: server.description,
      status: server.status,
      transport: server.transport,
      runMode: server.runMode,
    },
    tools: server.tools.map((tool) => ({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      type: tool.type,
      config: tool.config,
      resultSchema: tool.resultSchema,
      parameters: tool.parameters.map((param) => ({
        id: param.id,
        name: param.name,
        zodSchema: param.zodSchema,
        description: param.description,
        required: param.required,
        order: param.order,
      })),
    })),
    connections: server.connections.map((conn) => ({
      id: conn.id,
      name: conn.name,
      type: conn.type,
      config: conn.config, // This is encrypted
    })),
  };

  // Create version record
  const version = await prisma.version.create({
    data: {
      serverId,
      versionNumber: nextVersionNumber,
      configSnapshot: JSON.stringify(configSnapshot),
      description,
      createdBy,
    },
  });

  return version;
}

/**
 * Manual snapshot creation (user-initiated)
 */
export async function createSnapshot(serverId: string, description?: string) {
  try {
    if (!serverId) {
      return {
        success: false,
        error: 'Server ID is required',
      };
    }

    const userDescription = description || `Manual snapshot`;

    const version = await createServerSnapshot(serverId, userDescription, 'user');

    revalidatePath(`/servers/${serverId}/versions`);

    return {
      success: true,
      data: {
        id: version.id,
        versionNumber: version.versionNumber,
        description: version.description,
      },
      message: `Snapshot v${version.versionNumber} created successfully`,
    };
  } catch (error: any) {
    console.error('Error creating snapshot:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Auto snapshot creation (system-initiated, called after tool/connection changes)
 */
export async function autoCreateSnapshot(
  serverId: string,
  action: string,
  entityName: string
) {
  try {
    const description = `Auto-save: ${action} - ${entityName}`;
    await createServerSnapshot(serverId, description, 'system');

    return { success: true };
  } catch (error: any) {
    console.error('Error creating auto-snapshot:', error);
    // Don't fail the main operation if snapshot fails
    return { success: false, error: error.message };
  }
}

/**
 * Rollback to a previous version
 * Creates a "before rollback" snapshot first for safety
 */
export async function rollbackToVersion(serverId: string, versionId: string) {
  try {
    if (!serverId || !versionId) {
      return {
        success: false,
        error: 'Server ID and Version ID are required',
      };
    }

    // Get the target version
    const targetVersion = await prisma.version.findUnique({
      where: { id: versionId },
    });

    if (!targetVersion) {
      return {
        success: false,
        error: 'Version not found',
      };
    }

    if (targetVersion.serverId !== serverId) {
      return {
        success: false,
        error: 'Version does not belong to this server',
      };
    }

    // Create a "before rollback" snapshot
    await createServerSnapshot(
      serverId,
      `Before rollback to v${targetVersion.versionNumber}`,
      'system'
    );

    // Parse the snapshot
    const snapshot = JSON.parse(targetVersion.configSnapshot);

    // Start a transaction to rollback
    await prisma.$transaction(async (tx) => {
      // Delete current tools and connections
      await tx.parameter.deleteMany({
        where: {
          tool: {
            serverId,
          },
        },
      });

      await tx.tool.deleteMany({
        where: { serverId },
      });

      await tx.connection.deleteMany({
        where: { serverId },
      });

      // Restore server settings
      await tx.server.update({
        where: { id: serverId },
        data: {
          name: snapshot.server.name,
          description: snapshot.server.description,
          transport: snapshot.server.transport,
          runMode: snapshot.server.runMode,
          // Don't restore status - keep current running state
        },
      });

      // Restore connections
      if (snapshot.connections && snapshot.connections.length > 0) {
        for (const conn of snapshot.connections) {
          await tx.connection.create({
            data: {
              id: conn.id, // Preserve original ID
              serverId,
              name: conn.name,
              type: conn.type,
              config: conn.config, // Already encrypted
            },
          });
        }
      }

      // Restore tools and parameters
      if (snapshot.tools && snapshot.tools.length > 0) {
        for (const tool of snapshot.tools) {
          await tx.tool.create({
            data: {
              id: tool.id, // Preserve original ID
              serverId,
              name: tool.name,
              description: tool.description,
              type: tool.type,
              config: tool.config,
              resultSchema: tool.resultSchema,
            },
          });

          // Restore parameters
          if (tool.parameters && tool.parameters.length > 0) {
            await tx.parameter.createMany({
              data: tool.parameters.map((param: any) => ({
                id: param.id, // Preserve original ID
                toolId: tool.id,
                name: param.name,
                zodSchema: param.zodSchema,
                description: param.description,
                required: param.required,
                order: param.order,
              })),
            });
          }
        }
      }
    });

    revalidatePath(`/servers/${serverId}`);
    revalidatePath(`/servers/${serverId}/tools`);
    revalidatePath(`/servers/${serverId}/connections`);
    revalidatePath(`/servers/${serverId}/versions`);

    return {
      success: true,
      message: `Rolled back to v${targetVersion.versionNumber}`,
    };
  } catch (error: any) {
    console.error('Error rolling back version:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a version (manual cleanup)
 */
export async function deleteVersion(versionId: string) {
  try {
    const version = await prisma.version.findUnique({
      where: { id: versionId },
      select: { serverId: true },
    });

    await prisma.version.delete({
      where: { id: versionId },
    });

    if (version) {
      revalidatePath(`/servers/${version.serverId}/versions`);
    }

    return { success: true, message: 'Version deleted successfully' };
  } catch (error: any) {
    console.error('Error deleting version:', error);
    return { success: false, error: error.message };
  }
}

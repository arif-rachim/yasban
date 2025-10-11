'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { autoCreateSnapshot } from '../versions/actions';

/**
 * Server Actions for Connection Management
 */

export async function createConnection(formData: FormData) {
  try {
    const serverId = formData.get('serverId') as string;
    const name = formData.get('name') as string;
    const type = formData.get('type') as string;

    if (!serverId || !name || !type) {
      return {
        success: false,
        error: 'Server ID, name, and type are required',
      };
    }

    // Build config based on connection type
    let config: any = {};

    if (type === 'postgresql' || type === 'mysql' || type === 'mssql') {
      const host = formData.get('host') as string;
      const port = formData.get('port') as string;
      const database = formData.get('database') as string;
      const username = formData.get('username') as string;
      const password = formData.get('password') as string;
      const ssl = formData.get('ssl') === 'true';

      config = {
        host: host || 'localhost',
        port: port ? parseInt(port) : 5432,
        database: database || '',
        user: username || '',
        password: password || '',
        ssl,
      };
    } else if (type === 'sqlite') {
      const path = formData.get('path') as string;
      config = { path: path || '' };
    } else if (type === 'rest_api') {
      const baseUrl = formData.get('baseUrl') as string;
      config = { baseUrl: baseUrl || '', headers: {} };
    }

    const connection = await prisma.connection.create({
      data: {
        serverId,
        name,
        type,
        config: JSON.stringify(config),
      },
    });

    revalidatePath(`/servers/${serverId}/connections`);

    // Create auto-snapshot
    await autoCreateSnapshot(serverId, 'Connection created', name);

    return { success: true, data: connection };
  } catch (error: any) {
    console.error('Error creating connection:', error);
    return { success: false, error: error.message };
  }
}

export async function updateConnection(formData: FormData) {
  try {
    const connectionId = formData.get('connectionId') as string;
    const name = formData.get('name') as string;
    const type = formData.get('type') as string;

    if (!connectionId || !name || !type) {
      return {
        success: false,
        error: 'Connection ID, name, and type are required',
      };
    }

    // Build config based on connection type
    let config: any = {};

    if (type === 'postgresql' || type === 'mysql' || type === 'mssql') {
      const host = formData.get('host') as string;
      const port = formData.get('port') as string;
      const database = formData.get('database') as string;
      const username = formData.get('username') as string;
      const password = formData.get('password') as string;
      const ssl = formData.get('ssl') === 'true';

      // Only update password if provided
      const passwordValue = password || undefined;

      config = {
        host: host || 'localhost',
        port: port ? parseInt(port) : 5432,
        database: database || '',
        user: username || '',
        ...(passwordValue && { password: passwordValue }),
        ssl,
      };

      // If password not provided, keep existing password from database
      if (!passwordValue) {
        const existingConn = await prisma.connection.findUnique({
          where: { id: connectionId },
        });
        if (existingConn) {
          const existingConfig = JSON.parse(existingConn.config);
          if (existingConfig.password) {
            config.password = existingConfig.password;
          }
        }
      }
    } else if (type === 'sqlite') {
      const path = formData.get('path') as string;
      config = { path: path || '' };
    } else if (type === 'rest_api') {
      const baseUrl = formData.get('baseUrl') as string;
      config = { baseUrl: baseUrl || '', headers: {} };
    }

    const connection = await prisma.connection.update({
      where: { id: connectionId },
      data: {
        name,
        config: JSON.stringify(config),
      },
    });

    // Revalidate the connections page
    const conn = await prisma.connection.findUnique({
      where: { id: connectionId },
      select: { serverId: true },
    });

    if (conn) {
      revalidatePath(`/servers/${conn.serverId}/connections`);
      // Create auto-snapshot
      await autoCreateSnapshot(conn.serverId, 'Connection updated', name);
    }

    return { success: true, data: connection };
  } catch (error: any) {
    console.error('Error updating connection:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteConnection(connectionId: string) {
  try {
    const conn = await prisma.connection.findUnique({
      where: { id: connectionId },
      select: { serverId: true, name: true },
    });

    if (!conn) {
      return { success: false, error: 'Connection not found' };
    }

    await prisma.connection.delete({
      where: { id: connectionId },
    });

    revalidatePath(`/servers/${conn.serverId}/connections`);

    // Create auto-snapshot
    await autoCreateSnapshot(conn.serverId, 'Connection deleted', conn.name);

    return { success: true, message: 'Connection deleted successfully' };
  } catch (error: any) {
    console.error('Error deleting connection:', error);
    return { success: false, error: error.message };
  }
}

export async function testConnection(connectionId: string) {
  try {
    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      return { success: false, error: 'Connection not found' };
    }

    // Parse connection config
    const config = JSON.parse(connection.config);

    // Import connection tester dynamically to avoid edge runtime issues
    const { testConnection: testConn } = await import('@/lib/connection-tester');

    // Test the connection
    const result = await testConn(connection.type, config, connection.serverId);

    if (result.success) {
      return {
        success: true,
        message: result.message + ` (${result.duration}ms)`,
      };
    } else {
      return {
        success: false,
        error: result.error || result.message,
      };
    }
  } catch (error: any) {
    console.error('Error testing connection:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Test a connection configuration without saving it first
 * Useful for testing during connection creation
 */
export async function testConnectionConfig(formData: FormData) {
  try {
    const serverId = formData.get('serverId') as string;
    const type = formData.get('type') as string;

    if (!serverId || !type) {
      return {
        success: false,
        error: 'Server ID and connection type are required',
      };
    }

    // Build config based on connection type
    let config: any = {};

    if (type === 'postgresql' || type === 'mysql' || type === 'mssql') {
      const host = formData.get('host') as string;
      const port = formData.get('port') as string;
      const database = formData.get('database') as string;
      const username = formData.get('username') as string;
      const password = formData.get('password') as string;
      const ssl = formData.get('ssl') === 'true';

      // Validate required fields
      if (!host || !database || !username) {
        return {
          success: false,
          error: 'Host, database, and username are required for database connections',
        };
      }

      config = {
        host: host || 'localhost',
        port: port ? parseInt(port) : (type === 'postgresql' ? 5432 : type === 'mysql' ? 3306 : 1433),
        database: database || '',
        user: username || '',
        password: password || '',
        ssl,
      };
    } else if (type === 'sqlite') {
      const path = formData.get('path') as string;

      if (!path) {
        return {
          success: false,
          error: 'Database file path is required for SQLite connections',
        };
      }

      config = { path: path || '' };
    } else if (type === 'rest_api') {
      const baseUrl = formData.get('baseUrl') as string;

      if (!baseUrl) {
        return {
          success: false,
          error: 'Base URL is required for REST API connections',
        };
      }

      config = { baseUrl: baseUrl || '', headers: {} };
    }

    // Import connection tester dynamically to avoid edge runtime issues
    const { testConnection: testConn } = await import('@/lib/connection-tester');

    // Test the connection
    const result = await testConn(type, config, serverId);

    if (result.success) {
      return {
        success: true,
        message: result.message + ` (${result.duration}ms)`,
      };
    } else {
      return {
        success: false,
        error: result.error || result.message,
      };
    }
  } catch (error: any) {
    console.error('Error testing connection config:', error);
    return { success: false, error: error.message };
  }
}

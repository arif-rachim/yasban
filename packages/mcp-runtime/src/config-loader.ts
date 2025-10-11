/**
 * Config Loader - Loads MCP server configuration from SQLite database
 *
 * Reads server config, tools, connections, parameters, and environment variables
 * from the Yasban SQLite database via Prisma.
 */

import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Prisma client pointing to parent project's database
// When running from dist: __dirname = packages/mcp-runtime/dist, need to go up 3 levels
// When running with tsx: __dirname = packages/mcp-runtime/src, need to go up 3 levels
const DATABASE_PATH = path.join(__dirname, '..', '..', '..', 'prisma', 'dev.db');
const DATABASE_URL = `file:${DATABASE_PATH}`;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
});

export interface ServerConfig {
  id: string;
  name: string;
  description: string | null;
  transport: 'stdio' | 'sse' | 'http';
  tools: ToolConfig[];
  connections: ConnectionConfig[];
  environment: Record<string, string>;
}

export interface ToolConfig {
  id: string;
  name: string;
  description: string | null;
  type: 'sql' | 'rest' | 'webhook' | 'javascript';
  config: Record<string, any>; // Parsed JSON config
  parameters: ParameterConfig[];
  resultSchema: Record<string, any> | null; // Parsed JSON schema
}

export interface ParameterConfig {
  name: string;
  zodSchema: Record<string, any>; // Parsed Zod schema
  description: string | null;
  required: boolean;
  order: number;
}

export interface ConnectionConfig {
  id: string;
  name: string;
  type: string;
  config: string; // Encrypted JSON (will be decrypted by executors)
}

/**
 * Load server configuration from database
 */
export async function loadServerConfig(serverId: string): Promise<ServerConfig> {
  try {
    // Load server with all related data
    const server = await prisma.server.findUnique({
      where: { id: serverId },
      include: {
        tools: {
          include: {
            parameters: {
              orderBy: { order: 'asc' },
            },
          },
        },
        connections: true,
      },
    });

    if (!server) {
      throw new Error(`Server not found: ${serverId}`);
    }

    // Load environment variables
    const envVars = await prisma.environment.findMany({
      where: { serverId },
    });

    // Build environment object (Note: values are encrypted, will be decrypted by executors)
    const environment: Record<string, string> = {};
    for (const env of envVars) {
      environment[env.key] = env.value;
    }

    // Parse tools
    const tools: ToolConfig[] = server.tools.map((tool) => ({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      type: tool.type as any,
      config: JSON.parse(tool.config),
      parameters: tool.parameters.map((param) => ({
        name: param.name,
        zodSchema: JSON.parse(param.zodSchema),
        description: param.description,
        required: param.required,
        order: param.order,
      })),
      resultSchema: tool.resultSchema ? JSON.parse(tool.resultSchema) : null,
    }));

    // Parse connections
    const connections: ConnectionConfig[] = server.connections.map((conn) => ({
      id: conn.id,
      name: conn.name,
      type: conn.type,
      config: conn.config, // Keep encrypted, executors will decrypt
    }));

    return {
      id: server.id,
      name: server.name,
      description: server.description,
      transport: server.transport as any,
      tools,
      connections,
      environment,
    };
  } catch (error) {
    console.error('Error loading server config:', error);
    throw error;
  }
}

/**
 * Get connection by name (for SQL tools that reference connections)
 */
export async function getConnectionByName(
  serverId: string,
  connectionName: string
): Promise<ConnectionConfig | null> {
  try {
    const connection = await prisma.connection.findUnique({
      where: {
        serverId_name: {
          serverId,
          name: connectionName,
        },
      },
    });

    if (!connection) {
      return null;
    }

    return {
      id: connection.id,
      name: connection.name,
      type: connection.type,
      config: connection.config,
    };
  } catch (error) {
    console.error('Error loading connection:', error);
    return null;
  }
}

/**
 * Get config checksum for change detection
 *
 * Computes a hash based on updatedAt timestamps of:
 * - Server
 * - All Tools
 * - All Connections
 *
 * When any of these change, the checksum will be different.
 */
export async function getConfigChecksum(serverId: string): Promise<string> {
  try {
    // Load server with related data (only timestamps needed)
    const server = await prisma.server.findUnique({
      where: { id: serverId },
      select: {
        updatedAt: true,
        tools: {
          select: { id: true, updatedAt: true },
          orderBy: { updatedAt: 'desc' },
        },
        connections: {
          select: { id: true, updatedAt: true },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    if (!server) {
      throw new Error(`Server not found: ${serverId}`);
    }

    // Build checksum string from timestamps
    const checksumParts: string[] = [
      `server:${server.updatedAt.toISOString()}`,
    ];

    // Add tool timestamps
    for (const tool of server.tools) {
      checksumParts.push(`tool:${tool.id}:${tool.updatedAt.toISOString()}`);
    }

    // Add connection timestamps
    for (const conn of server.connections) {
      checksumParts.push(`conn:${conn.id}:${conn.updatedAt.toISOString()}`);
    }

    // Create hash
    const checksumString = checksumParts.join('|');
    const hash = crypto.createHash('sha256').update(checksumString).digest('hex');

    return hash;
  } catch (error) {
    console.error('Error computing config checksum:', error);
    throw error;
  }
}

/**
 * Close Prisma connection (called on shutdown)
 */
export async function closeDatabaseConnection(): Promise<void> {
  await prisma.$disconnect();
}

export { prisma };

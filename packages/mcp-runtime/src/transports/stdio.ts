/**
 * stdio Transport - JSON-RPC over stdin/stdout for Claude Desktop
 *
 * This is the primary transport used by Claude Desktop.
 * Claude spawns the MCP server as a child process and communicates via pipes.
 *
 * Supports hot-reload via ConfigCache.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { ServerConfig } from '../config-loader.js';
import type { Logger } from '../utils/logger.js';
import { ConfigCache } from '../config-cache.js';
import { registerTools } from '../tools/registry.js';

/**
 * Start MCP server with stdio transport (with hot-reload support)
 */
export async function startStdioTransport(
  serverConfig: ServerConfig,
  logger: Logger
): Promise<void> {
  logger.info('Starting MCP server with stdio transport (hot-reload enabled)', {
    serverId: serverConfig.id,
    serverName: serverConfig.name,
    toolCount: serverConfig.tools.length,
  });

  // Create config cache for hot-reload
  const configCache = new ConfigCache({
    serverId: serverConfig.id,
    logger,
    pollInterval: 2000, // Poll every 2 seconds
  });

  // Start config cache polling
  await configCache.start();

  // Create MCP Server
  const server = new Server(
    {
      name: serverConfig.name,
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {}, // Support for tool execution
      },
    }
  );

  // Register tool router with config cache (enables hot-reload)
  registerTools(server, configCache, logger);

  // Create stdio transport
  const transport = new StdioServerTransport();

  // Connect server to transport
  await server.connect(transport);

  logger.info('✓ MCP server running on stdio (hot-reload enabled)', {
    serverId: serverConfig.id,
    serverName: serverConfig.name,
    transport: 'stdio',
    toolCount: serverConfig.tools.length,
  });

  // Handle graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down stdio transport...');
    configCache.stop(); // Stop config polling
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Log when connection is established
  logger.info('Waiting for stdio connection from Claude Desktop...');
}

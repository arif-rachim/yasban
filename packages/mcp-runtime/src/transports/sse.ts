/**
 * SSE Transport - Server-Sent Events for web-based MCP clients
 *
 * Exposes MCP server via HTTP with SSE endpoint for browser-based tools.
 * Useful for web applications that need to interact with MCP tools.
 *
 * Supports hot-reload via ConfigCache.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import type { ServerConfig } from '../config-loader.js';
import type { Logger } from '../utils/logger.js';
import { ConfigCache } from '../config-cache.js';
import { registerTools } from '../tools/registry.js';

/**
 * Start MCP server with SSE transport (with hot-reload support)
 */
export async function startSSETransport(
  serverConfig: ServerConfig,
  port: number,
  logger: Logger
): Promise<void> {
  logger.info('Starting MCP server with SSE transport (hot-reload enabled)', {
    serverId: serverConfig.id,
    serverName: serverConfig.name,
    port,
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

  // Create Express app
  const app = express();

  // Basic middleware
  app.use(express.json());

  // Health check endpoint (uses live config)
  app.get('/health', (req, res) => {
    const currentConfig = configCache.getConfig();
    res.json({
      status: 'healthy',
      server: currentConfig?.name || serverConfig.name,
      serverId: serverConfig.id,
      toolCount: currentConfig?.tools.length || 0,
      transport: 'sse',
    });
  });

  // Server info endpoint (uses live config)
  app.get('/info', (req, res) => {
    const currentConfig = configCache.getConfig();
    if (!currentConfig) {
      return res.status(503).json({ error: 'Config not loaded' });
    }

    res.json({
      server: {
        id: currentConfig.id,
        name: currentConfig.name,
        description: currentConfig.description,
        transport: 'sse',
      },
      tools: currentConfig.tools.map((tool) => ({
        id: tool.id,
        name: tool.name,
        description: tool.description,
        type: tool.type,
        parameterCount: tool.parameters.length,
      })),
    });
  });

  // Create MCP Server
  const server = new Server(
    {
      name: serverConfig.name,
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tool router with config cache (enables hot-reload)
  registerTools(server, configCache, logger);

  // Create SSE transport with proper Express integration
  // SSEServerTransport handles its own Express route setup
  const transport = new SSEServerTransport('/message', app as any);

  // Connect server to transport
  await server.connect(transport);

  // Start Express server
  const httpServer = app.listen(port, () => {
    logger.info('✓ MCP server running on SSE (hot-reload enabled)', {
      serverId: serverConfig.id,
      serverName: serverConfig.name,
      transport: 'sse',
      port,
      endpoint: `http://localhost:${port}/sse`,
      healthCheck: `http://localhost:${port}/health`,
      toolCount: serverConfig.tools.length,
    });
  });

  // Handle graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down SSE transport...');
    configCache.stop(); // Stop config polling
    httpServer.close();
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  logger.info(`SSE server listening on port ${port}`);
  logger.info(`Connect to: http://localhost:${port}/sse`);
  logger.info(`Health check: http://localhost:${port}/health`);
}

#!/usr/bin/env node
/**
 * Yasban MCP Runtime - Standalone MCP server
 *
 * Runs Yasban-created tools as an MCP server with support for:
 * - stdio transport (Claude Desktop)
 * - SSE transport (web clients)
 * - HTTP transport (REST-like access)
 *
 * Usage:
 *   yasban-mcp --server <server-id> [--transport stdio|sse|http] [--port 3000]
 */

import { Command } from 'commander';
import { loadServerConfig, closeDatabaseConnection } from './config-loader.js';
import { createLogger } from './utils/logger.js';
import { startStdioTransport } from './transports/stdio.js';
import { startSSETransport } from './transports/sse.js';
import { startStreamableHttpTransport } from './transports/streamable-http.js';

// CLI program
const program = new Command();

program
  .name('yasban-mcp')
  .description('Yasban MCP Runtime - Run MCP servers with stdio, SSE, or Streamable HTTP transports')
  .version('1.0.0')
  .requiredOption('-s, --server <server-id>', 'Server ID to run (from Yasban database)')
  .option('-t, --transport <type>', 'Transport type: stdio|sse|streamable-http (recommended: streamable-http for remote)', 'stdio')
  .option('-p, --port <port>', 'Port for SSE/Streamable HTTP transports', '3000')
  .option('--log-level <level>', 'Log level: error|warn|info|debug', 'info')
  .option('--log-file <path>', 'Path to log file for unified logging')
  .option('--auth-token <token>', 'Authorization bearer token (optional, for remote transports)');

program.parse(process.argv);

const options = program.opts();

// Main function
async function main() {
  try {
    const serverId = options.server;
    const transport = options.transport.toLowerCase();
    const port = parseInt(options.port, 10);

    // Set log level
    process.env.LOG_LEVEL = options.logLevel;

    // Set auth token if provided
    if (options.authToken) {
      process.env.MCP_AUTH_TOKEN = options.authToken;
      console.log('✓ Authorization bearer token configured');
    }

    // Load server configuration from database
    console.log(`Loading server configuration: ${serverId}`);
    const serverConfig = await loadServerConfig(serverId);

    // Create logger (with optional log file)
    const logger = createLogger(serverConfig.id, serverConfig.name, options.logFile);

    logger.info('Yasban MCP Runtime starting...', {
      serverId: serverConfig.id,
      serverName: serverConfig.name,
      transport,
      toolCount: serverConfig.tools.length,
      connectionCount: serverConfig.connections.length,
    });

    // Validate transport
    if (!['stdio', 'sse', 'streamable-http'].includes(transport)) {
      logger.error(`Invalid transport: ${transport}. Must be stdio, sse, or streamable-http.`);
      logger.info('Recommended: Use "streamable-http" for remote access (MCP spec 2025-03-26)');
      process.exit(1);
    }

    // Start appropriate transport
    switch (transport) {
      case 'stdio':
        await startStdioTransport(serverConfig, logger);
        break;

      case 'sse':
        logger.warn('SSE transport uses old HTTP+SSE pattern. Consider using "streamable-http" instead.');
        if (isNaN(port)) {
          logger.error('Invalid port number for SSE transport');
          process.exit(1);
        }
        await startSSETransport(serverConfig, port, logger);
        break;

      case 'streamable-http':
        if (isNaN(port)) {
          logger.error('Invalid port number for Streamable HTTP transport');
          process.exit(1);
        }
        await startStreamableHttpTransport(serverConfig, port, logger);
        break;
    }

    logger.info('MCP Runtime ready!', {
      serverId: serverConfig.id,
      serverName: serverConfig.name,
      transport,
      toolsRegistered: serverConfig.tools.length,
    });
  } catch (error: any) {
    console.error('Fatal error:', error.message);
    console.error(error.stack);
    await closeDatabaseConnection();
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  await closeDatabaseConnection();
  process.exit(1);
});

// Run main function
main().catch(async (error) => {
  console.error('Failed to start MCP Runtime:', error);
  await closeDatabaseConnection();
  process.exit(1);
});

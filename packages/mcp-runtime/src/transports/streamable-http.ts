/**
 * Streamable HTTP Transport - Modern MCP transport (MCP spec 2025-03-26)
 *
 * Implements the new Streamable HTTP transport that replaces HTTP+SSE.
 * Uses a SINGLE endpoint that can:
 * - Handle simple request/response
 * - Upgrade to SSE streaming for long-running operations
 * - Support server-to-client notifications
 * - Provide resumable connections
 *
 * Supports hot-reload via ConfigCache.
 *
 * Spec: https://spec.modelcontextprotocol.io/specification/2025-03-26/basic/transports/
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import crypto from 'crypto';
import type { ServerConfig } from '../config-loader.js';
import type { Logger } from '../utils/logger.js';
import { ConfigCache } from '../config-cache.js';
import { registerTools } from '../tools/registry.js';

/**
 * Start MCP server with Streamable HTTP transport (with hot-reload support)
 *
 * Features:
 * - Single /mcp endpoint (POST for messages, GET for resumption)
 * - Automatic SSE upgrade when streaming needed
 * - Session management via Mcp-Session-Id header
 * - Resumable connections with Last-Event-ID
 * - Server-to-client notifications support
 */
export async function startStreamableHttpTransport(
  serverConfig: ServerConfig,
  port: number,
  logger: Logger
): Promise<void> {
  logger.info('Starting MCP server with Streamable HTTP transport (hot-reload enabled)', {
    serverId: serverConfig.id,
    serverName: serverConfig.name,
    port,
    toolCount: serverConfig.tools.length,
    spec: '2025-03-26',
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

  // CORS middleware
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id, Last-Event-ID');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    next();
  });

  // Optional Authorization Bearer middleware
  app.use((req, res, next) => {
    const authToken = process.env.MCP_AUTH_TOKEN;

    // If no auth token configured, allow all requests
    if (!authToken) {
      return next();
    }

    // Skip auth for health check
    if (req.path === '/health' || req.path === '/info') {
      return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      logger.warn('Request rejected: Missing Authorization header', {
        path: req.path,
        clientIp: req.ip || req.socket.remoteAddress,
      });
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing Authorization header',
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      logger.warn('Request rejected: Invalid Authorization format', {
        path: req.path,
        clientIp: req.ip || req.socket.remoteAddress,
      });
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid Authorization header format. Expected: Bearer <token>',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (token !== authToken) {
      logger.warn('Request rejected: Invalid token', {
        path: req.path,
        clientIp: req.ip || req.socket.remoteAddress,
      });
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid authorization token',
      });
    }

    // Token is valid, continue
    next();
  });

  // Request logging middleware
  app.use((req, res, next) => {
    const startTime = Date.now();
    let logged = false;

    // Log after response is sent
    const logRequest = () => {
      if (logged) return;
      logged = true;

      const duration = Date.now() - startTime;
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

      logger.info(`→ ${req.method} ${req.path}`, {
        method: req.method,
        path: req.path,
        query: Object.keys(req.query).length > 0 ? req.query : undefined,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        clientIp,
        sessionId: req.headers['mcp-session-id'],
        userAgent: req.headers['user-agent']?.substring(0, 100),
      });
    };

    // Catch when response finishes
    res.on('finish', () => {
      logRequest();
    });

    next();
  });

  // Health check endpoint (uses live config)
  app.get('/health', (req, res) => {
    const currentConfig = configCache.getConfig();
    res.json({
      status: 'healthy',
      server: currentConfig?.name || serverConfig.name,
      serverId: serverConfig.id,
      toolCount: currentConfig?.tools.length || 0,
      transport: 'streamable-http',
      spec: '2025-03-26',
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
        transport: 'streamable-http',
        spec: '2025-03-26',
      },
      tools: currentConfig.tools.map((tool) => ({
        id: tool.id,
        name: tool.name,
        description: tool.description,
        type: tool.type,
        parameterCount: tool.parameters.length,
      })),
      endpoints: {
        mcp: '/mcp',
        health: '/health',
        info: '/info',
      },
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

  logger.info('Setting up Streamable HTTP endpoint', {
    serverId: serverConfig.id,
    endpoint: '/mcp',
  });

  // Create Streamable HTTP transport
  // The transport handles the MCP protocol, we route HTTP requests to it
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => {
      // Generate cryptographically secure session ID
      return crypto.randomUUID();
    },
    enableJsonResponse: false, // Prefer SSE streaming
    onsessioninitialized: (sessionId) => {
      logger.info('MCP session initialized', { sessionId });
    },
    onsessionclosed: (sessionId) => {
      logger.info('MCP session closed', { sessionId });
    },
  });

  // Connect MCP server to transport
  await server.connect(transport);

  // Single /mcp endpoint handles all MCP communication
  // - POST /mcp → Send JSON-RPC message (may upgrade to SSE if streaming needed)
  // - GET /mcp → Resume broken connection with Last-Event-ID
  // - DELETE /mcp → Close session
  app.all('/mcp', async (req, res) => {
    try {
      // Route request to transport (it handles POST, GET, DELETE)
      // Pass pre-parsed body to avoid stream consumption issues
      await transport.handleRequest(req, res, req.body);
    } catch (error: any) {
      logger.error('Error handling /mcp request', {
        error: error.message,
        method: req.method,
        path: req.path,
      });

      // Only send error if headers not sent yet
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Internal server error',
          message: error.message,
        });
      }
    }
  });

  logger.info('✓ Streamable HTTP transport connected', {
    serverId: serverConfig.id,
    endpoint: '/mcp',
    features: [
      'Single unified endpoint',
      'Automatic SSE upgrade',
      'Session management',
      'Resumable connections',
      'Server notifications',
    ],
  });

  // Start Express server
  const httpServer = app.listen(port, () => {
    logger.info('✓ MCP server running on Streamable HTTP (hot-reload enabled)', {
      serverId: serverConfig.id,
      serverName: serverConfig.name,
      transport: 'streamable-http',
      spec: '2025-03-26',
      port,
      mcpEndpoint: `http://localhost:${port}/mcp`,
      healthCheck: `http://localhost:${port}/health`,
      info: `http://localhost:${port}/info`,
      toolCount: serverConfig.tools.length,
      note: 'Single /mcp endpoint handles all MCP communication',
    });
  });

  // Handle graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down Streamable HTTP transport...');

    // Stop config polling
    configCache.stop();

    // Close HTTP server
    httpServer.close();

    // Close MCP server
    await server.close();

    logger.info('Streamable HTTP transport shutdown complete');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  logger.info(`Streamable HTTP server listening on port ${port}`);
  logger.info(`MCP endpoint: http://localhost:${port}/mcp`);
  logger.info(`  → POST /mcp - Send JSON-RPC messages`);
  logger.info(`  → GET /mcp - Resume broken connection`);
  logger.info(`Health check: http://localhost:${port}/health`);
  logger.info(`Server info: http://localhost:${port}/info`);
}

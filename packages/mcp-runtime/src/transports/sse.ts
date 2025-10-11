/**
 * SSE Transport - Server-Sent Events for web-based MCP clients
 *
 * Exposes MCP server via HTTP with SSE endpoint for browser-based tools.
 * Useful for web applications that need to interact with MCP tools.
 *
 * Supports hot-reload via ConfigCache.
 *
 * Each client connection gets its own SSEServerTransport instance.
 * The transport generates a session ID that clients use for POST /message requests.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import type { ServerConfig } from '../config-loader.js';
import type { Logger } from '../utils/logger.js';
import { ConfigCache } from '../config-cache.js';
import { registerTools } from '../tools/registry.js';

/**
 * SSE Session - stores transport and metadata
 */
interface SSESession {
  transport: SSEServerTransport;
  createdAt: Date;
  clientIp: string;
}

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

  // CORS middleware
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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

  // Session storage - maps session IDs to transports
  const sessions = new Map<string, SSESession>();

  logger.info('Setting up SSE endpoints (per-connection transports)', {
    serverId: serverConfig.id,
  });

  // SSE endpoint - creates new transport for each client connection
  app.get('/sse', async (req, res) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

    logger.info('New SSE connection request', {
      clientIp,
      userAgent: req.headers['user-agent']?.substring(0, 100),
    });

    try {
      // Create transport for this connection
      const transport = new SSEServerTransport('/message', res);

      // Connect to MCP server
      await server.connect(transport);

      // Get the session ID generated by the transport
      const sessionId = transport.sessionId;

      logger.info('SSE transport created and connected', {
        sessionId,
        clientIp,
      });

      // Store session
      sessions.set(sessionId, {
        transport,
        createdAt: new Date(),
        clientIp,
      });

      logger.info(`Active SSE sessions: ${sessions.size}`, {
        sessionId,
        totalSessions: sessions.size,
      });

      // Clean up on close
      transport.onclose = () => {
        sessions.delete(sessionId);
        logger.info('SSE connection closed', {
          sessionId,
          clientIp,
          remainingSessions: sessions.size,
        });
      };

      // Handle errors
      transport.onerror = (error) => {
        logger.error('SSE transport error', {
          sessionId,
          clientIp,
          error: error instanceof Error ? error.message : String(error),
        });
      };
    } catch (error: any) {
      logger.error('Failed to create SSE transport', {
        error: error.message,
        stack: error.stack,
        clientIp,
      });
      res.status(500).json({
        error: 'Failed to establish SSE connection',
        message: error.message,
      });
    }
  });

  // Message endpoint - routes POST messages to correct transport by session ID
  app.post('/message', async (req, res) => {
    const sessionId = req.query.sessionId as string;
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

    logger.info('Received POST /message request', {
      sessionId,
      clientIp,
      hasBody: !!req.body,
      method: req.body?.method,
    });

    if (!sessionId) {
      logger.warn('POST /message missing sessionId query parameter', {
        clientIp,
        query: req.query,
      });
      return res.status(400).json({
        error: 'Missing sessionId',
        message: 'sessionId query parameter is required',
      });
    }

    const session = sessions.get(sessionId);

    if (!session) {
      logger.warn('POST /message for unknown session', {
        sessionId,
        clientIp,
        activeSessions: Array.from(sessions.keys()),
      });
      return res.status(404).json({
        error: 'Session not found',
        message: `No active session with ID: ${sessionId}`,
        activeSessions: sessions.size,
      });
    }

    logger.info('Routing message to transport', {
      sessionId,
      method: req.body?.method,
      clientIp,
    });

    try {
      // Route to the correct transport's handlePostMessage method
      // Pass req.body as third parameter to avoid "stream is not readable" error
      await session.transport.handlePostMessage(req, res, req.body);

      logger.info('Message handled successfully', {
        sessionId,
        method: req.body?.method,
      });
    } catch (error: any) {
      logger.error('Error handling POST /message', {
        sessionId,
        error: error.message,
        stack: error.stack,
      });

      // Only send error response if not already sent
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Message handling failed',
          message: error.message,
        });
      }
    }
  });

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
      note: 'Each client gets its own SSEServerTransport with unique session ID',
    });
  });

  // Handle graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down SSE transport...', {
      activeSessions: sessions.size,
    });

    // Close all active SSE sessions
    for (const [sessionId, session] of sessions) {
      logger.info(`Closing SSE session: ${sessionId}`);
      try {
        await session.transport.close();
      } catch (error) {
        logger.error(`Error closing session ${sessionId}`, { error });
      }
    }
    sessions.clear();

    // Stop config polling
    configCache.stop();

    // Close HTTP server
    httpServer.close();

    // Close MCP server
    await server.close();

    logger.info('SSE transport shutdown complete');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  logger.info(`SSE server listening on port ${port}`);
  logger.info(`Connect to: http://localhost:${port}/sse`);
  logger.info(`Health check: http://localhost:${port}/health`);
}

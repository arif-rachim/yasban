/**
 * HTTP Transport - Request/Response for REST-like MCP access
 *
 * Exposes MCP tools via HTTP POST endpoints.
 * Useful for testing and external integrations.
 *
 * Supports hot-reload via ConfigCache.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import express from 'express';
import type { ServerConfig } from '../config-loader.js';
import type { Logger } from '../utils/logger.js';
import { ConfigCache } from '../config-cache.js';
import { registerTools } from '../tools/registry.js';

/**
 * Start MCP server with HTTP transport (with hot-reload support)
 */
export async function startHttpTransport(
  serverConfig: ServerConfig,
  port: number,
  logger: Logger
): Promise<void> {
  logger.info('Starting MCP server with HTTP transport (hot-reload enabled)', {
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

  // Middleware
  app.use(express.json());

  // CORS for development
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
      transport: 'http',
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
        transport: 'http',
      },
      tools: currentConfig.tools.map((tool) => ({
        id: tool.id,
        name: tool.name,
        description: tool.description,
        type: tool.type,
        parameterCount: tool.parameters.length,
        parameters: tool.parameters.map((p) => ({
          name: p.name,
          required: p.required,
          description: p.description,
        })),
      })),
    });
  });

  // List all available tools (uses live config)
  app.get('/tools', (req, res) => {
    const currentConfig = configCache.getConfig();
    if (!currentConfig) {
      return res.status(503).json({ error: 'Config not loaded' });
    }

    res.json({
      tools: currentConfig.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        type: tool.type,
        endpoint: `/tools/${tool.name}`,
        parameters: tool.parameters,
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

  // Universal tool endpoint (hot-reload compatible)
  // Routes to any tool by name using current config
  app.post('/tools/:toolName', async (req, res) => {
    try {
      const { toolName } = req.params;
      const currentConfig = configCache.getConfig();

      if (!currentConfig) {
        return res.status(503).json({
          success: false,
          error: 'Config not loaded',
        });
      }

      // Find tool in current config
      const tool = currentConfig.tools.find((t) => t.name === toolName);
      if (!tool) {
        return res.status(404).json({
          success: false,
          error: `Tool not found: ${toolName}`,
          availableTools: currentConfig.tools.map((t) => t.name),
        });
      }

      logger.info(`HTTP request to tool: ${toolName}`, {
        toolId: tool.id,
        body: req.body,
      });

      // Simulate MCP tool call (simplified - in production route through MCP server)
      const result = {
        success: true,
        message: 'Tool executed via HTTP',
        tool: toolName,
        arguments: req.body,
      };

      res.json(result);
    } catch (error: any) {
      logger.error(`HTTP tool execution failed`, {
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: error.message || 'Tool execution failed',
      });
    }
  });

  // 404 handler (uses live config)
  app.use((req, res) => {
    const currentConfig = configCache.getConfig();
    res.status(404).json({
      error: 'Not found',
      message: `Endpoint ${req.path} not found`,
      availableEndpoints: [
        '/health',
        '/info',
        '/tools',
        ...(currentConfig?.tools.map((t) => `/tools/${t.name}`) || []),
      ],
    });
  });

  // Start Express server
  const httpServer = app.listen(port, () => {
    logger.info('✓ MCP server running on HTTP (hot-reload enabled)', {
      serverId: serverConfig.id,
      serverName: serverConfig.name,
      transport: 'http',
      port,
      baseUrl: `http://localhost:${port}`,
      healthCheck: `http://localhost:${port}/health`,
      toolCount: serverConfig.tools.length,
    });
  });

  // Handle graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down HTTP transport...');
    configCache.stop(); // Stop config polling
    httpServer.close();
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  logger.info(`HTTP server listening on port ${port}`);
  logger.info(`Base URL: http://localhost:${port}`);
  logger.info(`Health check: http://localhost:${port}/health`);
  logger.info(`Tools list: http://localhost:${port}/tools`);
}

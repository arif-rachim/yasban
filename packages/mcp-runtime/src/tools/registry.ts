/**
 * Tool Registry - Dynamically registers tools with MCP Server
 *
 * Uses ConfigCache to get latest config on each request (hot-reload support).
 * Routes tool execution to appropriate executor wrappers.
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { ServerConfig, ToolConfig } from '../config-loader.js';
import type { Logger } from '../utils/logger.js';
import type { ConfigCache } from '../config-cache.js';
import { executeSqlTool } from './sql-tool.js';
import { executeRestApiTool } from './rest-tool.js';
import { executeWebhook } from './webhook-tool.js';
import { executeJavaScript } from './javascript-tool.js';

/**
 * Convert Zod schema representation to JSON Schema for MCP
 */
function convertZodToJsonSchema(zodSchema: Record<string, any>): Record<string, any> {
  // Simple conversion - expand as needed
  const type = zodSchema.type || 'string';

  const jsonSchema: Record<string, any> = {
    type,
  };

  if (zodSchema.description) {
    jsonSchema.description = zodSchema.description;
  }

  // Handle enums
  if (zodSchema.enum && Array.isArray(zodSchema.enum)) {
    jsonSchema.enum = zodSchema.enum;
  }

  // Handle min/max for numbers
  if (type === 'number' || type === 'integer') {
    if (zodSchema.min !== undefined) jsonSchema.minimum = zodSchema.min;
    if (zodSchema.max !== undefined) jsonSchema.maximum = zodSchema.max;
  }

  // Handle min/max length for strings
  if (type === 'string') {
    if (zodSchema.minLength !== undefined) jsonSchema.minLength = zodSchema.minLength;
    if (zodSchema.maxLength !== undefined) jsonSchema.maxLength = zodSchema.maxLength;
  }

  return jsonSchema;
}

/**
 * Build JSON Schema for tool parameters
 */
function buildParametersSchema(tool: ToolConfig): Record<string, any> {
  const properties: Record<string, any> = {};
  const required: string[] = [];

  for (const param of tool.parameters) {
    properties[param.name] = convertZodToJsonSchema(param.zodSchema);

    if (param.description) {
      properties[param.name].description = param.description;
    }

    if (param.required) {
      required.push(param.name);
    }
  }

  return {
    type: 'object',
    properties,
    required,
  };
}

/**
 * Register tool router with MCP Server (with hot-reload support)
 *
 * Uses ConfigCache to get latest config on each request, enabling hot-reload.
 */
export function registerTools(
  mcpServer: Server,
  configCache: ConfigCache,
  logger: Logger
): void {
  const initialConfig = configCache.getConfig();
  if (!initialConfig) {
    throw new Error('ConfigCache not initialized');
  }

  logger.info(`Registering tool router with MCP Server (hot-reload enabled)`, {
    serverId: initialConfig.id,
    serverName: initialConfig.name,
    initialToolCount: initialConfig.tools.length,
  });

  // Register tools/list handler (for tool discovery)
  mcpServer.setRequestHandler(
    ListToolsRequestSchema,
    async () => {
      // Get LATEST config from cache (hot-reload!)
      const serverConfig = configCache.getConfig();
      if (!serverConfig) {
        logger.error('ConfigCache returned null config for tools/list');
        return { tools: [] };
      }

      // Build tool list from current config
      const tools = serverConfig.tools.map((tool) => ({
        name: tool.name,
        description: tool.description || `Execute ${tool.name} (${tool.type} tool)`,
        inputSchema: buildParametersSchema(tool),
      }));

      logger.debug('tools/list request', { toolCount: tools.length });
      return { tools };
    }
  );

  // Register tools/call handler (for tool execution)
  mcpServer.setRequestHandler(
    CallToolRequestSchema,
    async (request) => {
      // Get LATEST config from cache (hot-reload!)
      const serverConfig = configCache.getConfig();
      if (!serverConfig) {
        logger.error('ConfigCache returned null config');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: false, error: 'Server config not available' }),
            },
          ],
          isError: true,
        };
      }

      // Extract tool name and arguments from request
      const { name: toolName, arguments: args } = request.params;

      // Find tool in current config
      const tool = serverConfig.tools.find((t) => t.name === toolName);
      if (!tool) {
        logger.warn('Tool not found in current config', { toolName });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: false, error: `Tool not found: ${toolName}` }),
            },
          ],
          isError: true,
        };
      }

      logger.info('Tool call received via MCP', {
        toolName,
        toolType: tool.type,
        args,
      });

      // Route to appropriate executor based on tool type
      try {
        // Ensure args is always an object (default to empty object if undefined)
        const toolArgs = args || {};

        switch (tool.type) {
          case 'sql':
            return await executeSqlTool(tool, toolArgs, serverConfig, logger);

          case 'rest':
            return await executeRestApiTool(tool, toolArgs, serverConfig, logger);

          case 'webhook':
            return await executeWebhook(tool, toolArgs, serverConfig, logger);

          case 'javascript':
            return await executeJavaScript(tool, toolArgs, serverConfig, logger);

          default:
            logger.error('Unknown tool type', { toolType: tool.type, toolName });
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: `Unknown tool type: ${tool.type}`,
                  }),
                },
              ],
              isError: true,
            };
        }
      } catch (error: any) {
        logger.error('Tool execution error', {
          toolName,
          error: error.message,
          stack: error.stack,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: error.message || 'Tool execution failed',
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  logger.info('Tool router registered (hot-reload enabled)', {
    serverId: initialConfig.id,
  });

  // Log when config changes
  configCache.on('configChanged', (newConfig, oldChecksum, newChecksum) => {
    logger.info('🔄 Config reloaded - tools updated', {
      serverId: newConfig.id,
      oldChecksum: oldChecksum.substring(0, 8),
      newChecksum: newChecksum.substring(0, 8),
      toolCount: newConfig.tools.length,
      connectionCount: newConfig.connections.length,
    });
  });
}

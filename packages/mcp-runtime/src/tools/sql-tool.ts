/**
 * SQL Tool Wrapper - Adapts sql-executor for MCP SDK
 */

import type { ServerConfig, ToolConfig, ConnectionConfig } from '../config-loader.js';
import type { Logger } from '../utils/logger.js';

// Import executors from shared package
import { executeSQLTool } from '@yasban/shared';
import type { ToolExecutionResult } from '@yasban/shared';

/**
 * Execute SQL tool via MCP
 */
export async function executeSqlTool(
  tool: ToolConfig,
  args: Record<string, any>,
  serverConfig: ServerConfig,
  logger: Logger
): Promise<any> {
  try {
    // Find the connection referenced by this tool
    const sqlConfig = tool.config as any;
    const connectionId = sqlConfig.connectionId;

    if (!connectionId) {
      throw new Error('SQL tool missing connectionId in config');
    }

    // Find connection
    const connection = serverConfig.connections.find((c) => c.id === connectionId);
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    // Prepare tool object in format expected by executor
    const toolWithConnection = {
      id: tool.id,
      name: tool.name,
      description: tool.description,
      type: tool.type,
      config: JSON.stringify(tool.config),
      resultSchema: tool.resultSchema ? JSON.stringify(tool.resultSchema) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
      connection: {
        id: connection.id,
        name: connection.name,
        type: connection.type,
        config: connection.config,
        serverId: serverConfig.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      parameters: tool.parameters.map((p) => ({
        id: `${tool.id}-${p.name}`,
        toolId: tool.id,
        name: p.name,
        zodSchema: JSON.stringify(p.zodSchema),
        description: p.description,
        required: p.required,
        order: p.order,
      })),
      serverId: serverConfig.id,
    };

    logger.info('Executing SQL tool via MCP', {
      toolId: tool.id,
      toolName: tool.name,
      parameters: args,
    });

    // Execute SQL query
    const result: ToolExecutionResult = await executeSQLTool(toolWithConnection as any, args);

    if (!result.success) {
      throw new Error(result.error || 'SQL execution failed');
    }

    // Format response for MCP
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              rowCount: result.rowCount,
              data: result.data,
              schema: result.schema,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error: any) {
    logger.error('SQL tool execution failed', {
      toolId: tool.id,
      toolName: tool.name,
      error: error.message,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error: error.message || 'SQL execution failed',
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
}

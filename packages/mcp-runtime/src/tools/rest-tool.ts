/**
 * REST Tool Wrapper - Adapts rest-executor for MCP SDK
 */

import type { ServerConfig, ToolConfig } from '../config-loader.js';
import type { Logger } from '../utils/logger.js';
import { executeRESTTool } from '@yasban/shared';
import type { ToolExecutionResult } from '@yasban/shared';

/**
 * Execute REST tool via MCP
 */
export async function executeRestApiTool(
  tool: ToolConfig,
  args: Record<string, any>,
  serverConfig: ServerConfig,
  logger: Logger
): Promise<any> {
  try {
    // Prepare tool object in format expected by executor
    const toolObj = {
      id: tool.id,
      name: tool.name,
      description: tool.description,
      type: tool.type,
      config: JSON.stringify(tool.config),
      resultSchema: tool.resultSchema ? JSON.stringify(tool.resultSchema) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
      serverId: serverConfig.id,
    };

    logger.info('Executing REST tool via MCP', {
      toolId: tool.id,
      toolName: tool.name,
      parameters: args,
    });

    // Execute REST API call
    const result: ToolExecutionResult = await executeRESTTool(toolObj as any, args);

    if (!result.success) {
      throw new Error(result.error || 'REST API call failed');
    }

    // Format response for MCP
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              data: result.data,
              statusCode: result.statusCode,
              headers: result.headers,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error: any) {
    logger.error('REST tool execution failed', {
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
              error: error.message || 'REST API call failed',
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

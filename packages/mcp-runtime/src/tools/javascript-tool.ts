/**
 * JavaScript Tool Wrapper - Adapts javascript-executor for MCP SDK
 */

import type { ServerConfig, ToolConfig } from '../config-loader.js';
import type { Logger } from '../utils/logger.js';
import { executeJavaScriptTool } from '@yasban/shared';
import type { ToolExecutionResult } from '@yasban/shared';

/**
 * Execute JavaScript tool via MCP
 */
export async function executeJavaScript(
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

    logger.info('Executing JavaScript tool via MCP', {
      toolId: tool.id,
      toolName: tool.name,
      parameters: args,
    });

    // Execute JavaScript code
    const result: ToolExecutionResult = await executeJavaScriptTool(toolObj as any, args);

    if (!result.success) {
      throw new Error(result.error || 'JavaScript execution failed');
    }

    // Format response for MCP
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              result: result.data,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error: any) {
    logger.error('JavaScript tool execution failed', {
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
              error: error.message || 'JavaScript execution failed',
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

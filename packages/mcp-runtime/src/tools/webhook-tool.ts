/**
 * Webhook Tool Wrapper - Adapts webhook-executor for MCP SDK
 */

import type { ServerConfig, ToolConfig } from '../config-loader.js';
import type { Logger } from '../utils/logger.js';
import { executeWebhookTool } from '@yasban/shared';
import type { ToolExecutionResult } from '@yasban/shared';

/**
 * Execute Webhook tool via MCP
 * Note: Webhooks are passive - this returns webhook URL info, not actual execution
 */
export async function executeWebhook(
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

    logger.info('Generating webhook info via MCP', {
      toolId: tool.id,
      toolName: tool.name,
      parameters: args,
    });

    // Generate webhook info
    const result: ToolExecutionResult = await executeWebhookTool(toolObj as any, args);

    if (!result.success) {
      throw new Error(result.error || 'Webhook info generation failed');
    }

    // Format response for MCP
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              webhookInfo: result.data,
              message: 'Webhook is ready to receive requests',
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error: any) {
    logger.error('Webhook tool execution failed', {
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
              error: error.message || 'Webhook info generation failed',
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

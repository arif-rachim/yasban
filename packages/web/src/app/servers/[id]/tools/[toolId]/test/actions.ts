'use server';

import prisma from '@/lib/prisma';
import {
  executeSQLTool,
  executeRESTTool,
  executeWebhookTool,
  executeJavaScriptTool,
  type ToolExecutionResult,
} from '@yasban/shared';

// Re-export for backward compatibility
export type { ToolExecutionResult };

export async function executeTool(
  toolId: string,
  parameters: Record<string, any>
): Promise<ToolExecutionResult> {
  const startTime = Date.now();

  try {
    // Fetch tool with parameters
    const tool = await prisma.tool.findUnique({
      where: { id: toolId },
      include: {
        parameters: true,
      },
    });

    if (!tool) {
      return {
        success: false,
        error: 'Tool not found',
      };
    }

    // Parse config to get connectionId (for SQL tools)
    const config = JSON.parse(tool.config || '{}');
    let connection = null;

    if (config.connectionId) {
      connection = await prisma.connection.findUnique({
        where: { id: config.connectionId },
      });
    }

    // Create tool object with connection and serverId
    const toolWithConnection: any = {
      ...tool,
      connection,
      serverId: tool.serverId,
    };

    // Route to appropriate executor based on tool type
    let result: ToolExecutionResult;

    switch (tool.type.toUpperCase()) {
      case 'SQL':
        result = await executeSQLTool(toolWithConnection, parameters);
        break;

      case 'REST':
        result = await executeRESTTool(toolWithConnection, parameters);
        break;

      case 'WEBHOOK':
        result = await executeWebhookTool(toolWithConnection, parameters);
        break;

      case 'JAVASCRIPT':
      case 'JS':
        result = await executeJavaScriptTool(toolWithConnection, parameters);
        break;

      default:
        result = {
          success: false,
          error: `Unknown tool type: ${tool.type}`,
        };
    }

    // Add execution time
    const executionTime = Date.now() - startTime;
    result.executionTime = executionTime;

    return result;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
      executionTime: Date.now() - startTime,
    };
  }
}

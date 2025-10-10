import { Tool } from '@prisma/client';
import { ToolExecutionResult } from '@/app/servers/[id]/tools/[toolId]/test/actions';
import { createServerLogger } from '@/lib/logger';
import { parseToolConfig, WebhookToolConfig } from '@/types/tool-config';
// import { replaceInString } from '@/lib/parameter-substitution'; // Available if needed in future

interface ToolWithServerId extends Omit<Tool, 'serverId'> {
  serverId: string;
}

/**
 * Execute webhook tool
 *
 * Note: Webhooks are passive - they receive data rather than send it.
 * This function returns information about the webhook endpoint that can be used
 * to receive data from external services.
 *
 * **Parameter Substitution:**
 * Currently, webhooks do NOT use template parameter substitution since they are
 * passive receivers. However, parameter substitution could be added in the future for:
 * - Dynamic webhook paths: `/webhook/{{tool_id}}` → `/webhook/abc-123`
 * - Custom auth headers: `{"X-Auth-Token": "{{webhook_secret}}"}`
 * - Webhook verification tokens
 *
 * If needed, import and use `replaceInString()` from `@/lib/parameter-substitution`.
 */
export async function executeWebhookTool(
  tool: ToolWithServerId,
  parameters: Record<string, any>
): Promise<ToolExecutionResult> {
  const logger = createServerLogger(tool.serverId);

  let config: WebhookToolConfig;
  try {
    config = parseToolConfig('webhook', tool.config) as WebhookToolConfig;
  } catch (err) {
    logger.error('Webhook tool execution failed - invalid configuration', {
      toolId: tool.id,
      toolName: tool.name,
    });
    return {
      success: false,
      error: 'Invalid webhook configuration',
    };
  }

  logger.info('Generating webhook info', {
    toolId: tool.id,
    toolName: tool.name,
    parameters,
  });

  // Generate webhook URL (this will be the actual endpoint when the MCP server is running)
  const webhookPath = config.path || `/webhook/${tool.id}`;

  // In a real deployment, this would be the actual server URL
  // For now, we'll show a placeholder
  const baseUrl = process.env.WEBHOOK_BASE_URL || 'http://localhost:3000';
  const webhookUrl = `${baseUrl}${webhookPath}`;

  // Webhook information
  const webhookInfo = {
    url: webhookUrl,
    path: webhookPath,
    method: 'POST',
    description: 'Send HTTP requests to this URL from external services',
    note: 'This webhook will be active when the MCP server is running',
    hasHandler: !!config.handler && config.handler.trim() !== '',
  };

  logger.info('✓ Webhook info generated successfully', {
    toolId: tool.id,
    toolName: tool.name,
    webhookUrl,
    hasHandler: webhookInfo.hasHandler,
  });

  return {
    success: true,
    data: {
      type: 'webhook',
      info: webhookInfo,
      handler: config.handler || '// No handler configured',
      message: 'Webhook is ready to receive data. Copy the URL above to use in external services.',
      handlerNote: webhookInfo.hasHandler
        ? 'The handler code above will be executed when this webhook receives data. It has access to params.body, params.headers, params.query, and path parameters.'
        : 'No handler configured. This webhook will only acknowledge receipt of data.',
      curlExample: `curl -X ${webhookInfo.method} "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(parameters, null, 2)}'`,
    },
  };
}

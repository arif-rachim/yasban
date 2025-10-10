import { Tool } from '@prisma/client';
import { ToolExecutionResult } from '@/app/servers/[id]/tools/[toolId]/test/actions';
import { createServerLogger } from '@/lib/logger';
import { parseToolConfig, WebhookToolConfig } from '@/types/tool-config';
import * as os from 'os';
// import { replaceInString } from '@/lib/parameter-substitution'; // Available if needed in future

interface ToolWithServerId extends Omit<Tool, 'serverId'> {
  serverId: string;
}

/**
 * Get the primary network IP address of this machine
 * Skips localhost, internal, and virtual adapters
 */
function getNetworkIP(): string | null {
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (!iface) continue;

    for (const addr of iface) {
      // Skip internal (localhost) and non-IPv4 addresses
      if (addr.family === 'IPv4' && !addr.internal) {
        return addr.address;
      }
    }
  }

  return null;
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

  // Get actual Next.js port (from env or default to 3001)
  const port = process.env.PORT || process.env.NEXT_PUBLIC_PORT || '3001';

  // Get network IP address
  const networkIP = getNetworkIP();

  // Generate webhook URLs
  const webhookPath = config.path || `/webhook/${tool.id}`;
  const apiPath = `/api${webhookPath}`; // Add /api prefix for Next.js API routes

  // Build URLs - both localhost and network
  const localhostUrl = `http://localhost:${port}${apiPath}`;
  const networkUrl = networkIP ? `http://${networkIP}:${port}${apiPath}` : null;

  // Webhook information
  const webhookInfo = {
    url: networkUrl || localhostUrl, // Prefer network URL if available
    localhostUrl: localhostUrl,
    networkUrl: networkUrl,
    path: apiPath,
    storedPath: webhookPath,
    method: 'POST',
    description: 'Send HTTP requests to this URL from external services',
    note: 'This webhook will be active when the Next.js server is running',
    hasHandler: !!config.handler && config.handler.trim() !== '',
  };

  logger.info('✓ Webhook info generated successfully', {
    toolId: tool.id,
    toolName: tool.name,
    localhostUrl,
    networkUrl: networkUrl || 'N/A',
    hasHandler: webhookInfo.hasHandler,
  });

  const primaryUrl = networkUrl || localhostUrl;

  return {
    success: true,
    data: {
      type: 'webhook',
      info: webhookInfo,
      handler: config.handler || '// No handler configured',
      message: networkUrl
        ? `Webhook is ready to receive data. Network URL: ${networkUrl} | Localhost: ${localhostUrl}`
        : `Webhook is ready to receive data. URL: ${localhostUrl}`,
      handlerNote: webhookInfo.hasHandler
        ? 'The handler code above will be executed when this webhook receives data. It has access to params.body, params.headers, params.query, and path parameters.'
        : 'No handler configured. This webhook will only acknowledge receipt of data.',
      curlExample: `curl -X ${webhookInfo.method} "${primaryUrl}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(parameters, null, 2)}'`,
    },
  };
}

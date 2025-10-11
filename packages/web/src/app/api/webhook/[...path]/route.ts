import { NextRequest, NextResponse } from 'next/server';
import { match } from 'path-to-regexp';
import prisma from '@/lib/prisma';
import { parseToolConfig, WebhookToolConfig } from '@yasban/shared';
import { createServerLogger } from '@/lib/logger';

/**
 * Webhook API Route - Catch-all handler
 *
 * Handles webhook requests at any path, matches against configured webhook tools,
 * extracts path parameters, and executes the handler code.
 *
 * Examples:
 * - POST /api/webhook/github/deploy
 * - POST /api/webhook/tenant/acme-corp/payment
 * - POST /api/webhook/user/123/notification
 */

interface WebhookTool {
  id: string;
  serverId: string;
  name: string;
  config: string;
}

const EXECUTION_TIMEOUT_MS = 10000; // 10 second timeout for webhook handlers

/**
 * Find webhook tool that matches the incoming path
 */
async function findMatchingWebhook(incomingPath: string): Promise<{
  tool: WebhookTool;
  config: WebhookToolConfig;
  params: Record<string, string>;
} | null> {
  // Fetch all webhook tools
  const webhookTools = await prisma.tool.findMany({
    where: {
      type: 'webhook',
    },
    select: {
      id: true,
      serverId: true,
      name: true,
      config: true,
    },
  });

  // Try to match against each webhook tool
  for (const tool of webhookTools) {
    try {
      const config = parseToolConfig('webhook', tool.config) as WebhookToolConfig;

      // Normalize paths (ensure they start with /)
      const configPath = config.path.startsWith('/') ? config.path : `/${config.path}`;

      // Use path-to-regexp to match and extract parameters
      const matchFn = match(configPath, { decode: decodeURIComponent });
      const result = matchFn(incomingPath);

      if (result) {
        // Found a match!
        return {
          tool,
          config,
          params: result.params as Record<string, string>,
        };
      }
    } catch (err) {
      console.error(`Error matching webhook tool ${tool.id}:`, err);
      continue;
    }
  }

  return null;
}

/**
 * Execute webhook handler code
 */
async function executeHandler(
  handler: string,
  params: any,
  serverId: string,
  toolName: string
): Promise<any> {
  const logger = createServerLogger(serverId);

  try {
    // Create sandboxed function
    const func = new Function('params', handler);

    // Execute with timeout protection
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`Webhook handler timeout (${EXECUTION_TIMEOUT_MS / 1000}s)`)),
        EXECUTION_TIMEOUT_MS
      );
    });

    const executionPromise = Promise.resolve(func(params));

    // Race between execution and timeout
    const result = await Promise.race([executionPromise, timeoutPromise]);

    logger.info('✓ Webhook handler executed successfully', {
      toolName,
      path: params.url,
    });

    return result;
  } catch (error: any) {
    logger.error('✗ Webhook handler execution failed', {
      toolName,
      path: params.url,
      error: error.message,
    });

    throw error;
  }
}

/**
 * Handle all HTTP methods for webhooks
 */
async function handleWebhook(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const pathSegments = (await context.params).path;
  // Normalize incoming path to match user-configured paths (without /api prefix)
  const incomingPath = `/webhook/${pathSegments.join('/')}`;

  try {
    // Find matching webhook tool
    const match = await findMatchingWebhook(incomingPath);

    if (!match) {
      return NextResponse.json(
        {
          error: 'Webhook not found',
          message: `No webhook configured for path: ${incomingPath}`,
        },
        { status: 404 }
      );
    }

    const { tool, config, params: pathParams } = match;

    // Parse request body
    let body: any = null;
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      try {
        body = await request.json();
      } catch {
        body = null;
      }
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries());
    } else {
      // Try to read as text
      try {
        const text = await request.text();
        body = text;
      } catch {
        body = null;
      }
    }

    // Parse query parameters
    const queryParams: Record<string, string> = {};
    request.nextUrl.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    // Convert headers to plain object
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Build params object for handler
    const handlerParams = {
      ...pathParams,        // Path parameters (e.g., { tenantId: "acme" })
      body,                 // Request body
      headers,              // HTTP headers
      query: queryParams,   // Query parameters
      method: request.method, // HTTP method
      url: incomingPath,    // Full path
    };

    // Execute handler if provided
    if (!config.handler || config.handler.trim() === '') {
      // No handler - just acknowledge receipt
      return NextResponse.json({
        success: true,
        message: 'Webhook received (no handler configured)',
        tool: tool.name,
        path: incomingPath,
        received: {
          pathParams,
          bodyPreview: body ? JSON.stringify(body).substring(0, 100) : null,
        },
      });
    }

    // Execute handler code
    const result = await executeHandler(
      config.handler,
      handlerParams,
      tool.serverId,
      tool.name
    );

    // Return handler result
    if (result && typeof result === 'object') {
      // If handler returns object with status, use it
      const status = result.status || 200;
      delete result.status; // Remove status from response body
      return NextResponse.json(result, { status });
    }

    // Default success response
    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error('Webhook error:', error);

    return NextResponse.json(
      {
        error: 'Webhook execution failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// Export handlers for all HTTP methods
export const GET = handleWebhook;
export const POST = handleWebhook;
export const PUT = handleWebhook;
export const PATCH = handleWebhook;
export const DELETE = handleWebhook;

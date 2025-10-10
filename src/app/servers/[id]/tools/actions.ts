'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { autoCreateSnapshot } from '../versions/actions';
import {
  ToolConfig,
  createSqlConfig,
  createRestConfig,
  createWebhookConfig,
  createJavaScriptConfig,
  serializeToolConfig,
} from '@/types/tool-config';

/**
 * Server Actions for Tool Management
 */

/**
 * Normalize webhook path to ensure consistent format
 * - Ensures path starts with /
 * - Detects /webhook/ prefix (case-insensitive) and strips it
 * - Prepends normalized /webhook/ prefix
 * - Preserves case sensitivity of the actual path
 *
 * Examples:
 * - "sedap" → "/webhook/sedap"
 * - "/Sedap" → "/webhook/Sedap"
 * - "webhook/payment" → "/webhook/payment"
 * - "/Webhook/Test" → "/webhook/Test"
 * - "/WEBHOOK/payment/:id" → "/webhook/payment/:id"
 */
function normalizeWebhookPath(userInput: string): string {
  let path = userInput.trim();

  // Ensure path starts with /
  if (!path.startsWith('/')) {
    path = '/' + path;
  }

  // Check if starts with /webhook/ (case-insensitive)
  if (path.toLowerCase().startsWith('/webhook/')) {
    // Strip the prefix (any case) - 9 characters
    path = path.substring(9);
  } else if (path.startsWith('/')) {
    // User typed /something (no webhook prefix)
    path = path.substring(1); // Remove leading slash
  }

  // Always prepend normalized /webhook/
  return `/webhook/${path}`;
}

export async function createTool(formData: FormData) {
  try {
    const serverId = formData.get('serverId') as string;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const type = formData.get('type') as string;
    const parametersJson = formData.get('parameters') as string;

    if (!serverId || !name || !type) {
      return {
        success: false,
        error: 'Server ID, name, and type are required',
      };
    }

    // Parse parameters if provided
    let parameters = [];
    try {
      parameters = parametersJson ? JSON.parse(parametersJson) : [];
    } catch (err) {
      return { success: false, error: 'Invalid parameters JSON' };
    }

    // Build config based on tool type
    let config: ToolConfig;

    if (type === 'sql') {
      const connectionId = formData.get('connectionId') as string;
      const sqlQuery = formData.get('sqlQuery') as string;
      config = createSqlConfig(connectionId, sqlQuery);
    } else if (type === 'rest') {
      const endpoint = formData.get('endpoint') as string;
      const method = formData.get('method') as string;
      const headersStr = formData.get('headers') as string;
      const bodyStr = formData.get('body') as string;

      // Parse headers and body JSON
      let headers: Record<string, string> | undefined;
      let body: any | undefined;

      try {
        headers = headersStr && headersStr.trim() !== '{}' ? JSON.parse(headersStr) : undefined;
      } catch (err) {
        console.error('Failed to parse headers JSON:', err);
      }

      try {
        body = bodyStr && bodyStr.trim() !== '{}' ? JSON.parse(bodyStr) : undefined;
      } catch (err) {
        console.error('Failed to parse body JSON:', err);
      }

      config = createRestConfig(endpoint, method as any, headers, body);
    } else if (type === 'webhook') {
      const webhookPath = formData.get('webhookPath') as string;
      const webhookHandler = formData.get('webhookHandler') as string;
      const normalizedPath = normalizeWebhookPath(webhookPath);
      config = createWebhookConfig(normalizedPath, webhookHandler);
    } else if (type === 'javascript') {
      const jsCode = formData.get('jsCode') as string;
      config = createJavaScriptConfig(jsCode);
    } else {
      throw new Error(`Unknown tool type: ${type}`);
    }

    // Create tool with parameters as a relation
    const tool = await prisma.tool.create({
      data: {
        serverId,
        name,
        description: description || '',
        type,
        config: serializeToolConfig(config),
      },
    });

    // If parameters exist, create them as separate records
    if (parameters.length > 0) {
      await prisma.parameter.createMany({
        data: parameters.map((param: any, index: number) => ({
          toolId: tool.id,
          name: param.name,
          zodSchema: JSON.stringify({ type: param.type }),
          description: param.description || '',
          required: param.required !== false,
          order: index,
        })),
      });
    }

    revalidatePath(`/servers/${serverId}/tools`);

    // Create auto-snapshot
    await autoCreateSnapshot(serverId, 'Tool created', name);

    return { success: true, data: tool };
  } catch (error: any) {
    console.error('Error creating tool:', error);
    return { success: false, error: error.message };
  }
}

export async function updateTool(formData: FormData) {
  try {
    const toolId = formData.get('toolId') as string;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const type = formData.get('type') as string;
    const parametersJson = formData.get('parameters') as string;

    if (!toolId || !name || !type) {
      return {
        success: false,
        error: 'Tool ID, name, and type are required',
      };
    }

    // Parse parameters if provided
    let parameters = [];
    try {
      parameters = parametersJson ? JSON.parse(parametersJson) : [];
    } catch (err) {
      return { success: false, error: 'Invalid parameters JSON' };
    }

    // Build config based on tool type
    let config: ToolConfig;

    if (type === 'sql') {
      const connectionId = formData.get('connectionId') as string;
      const sqlQuery = formData.get('sqlQuery') as string;
      config = createSqlConfig(connectionId, sqlQuery);
    } else if (type === 'rest') {
      const endpoint = formData.get('endpoint') as string;
      const method = formData.get('method') as string;
      const headersStr = formData.get('headers') as string;
      const bodyStr = formData.get('body') as string;

      // Parse headers and body JSON
      let headers: Record<string, string> | undefined;
      let body: any | undefined;

      try {
        headers = headersStr && headersStr.trim() !== '{}' ? JSON.parse(headersStr) : undefined;
      } catch (err) {
        console.error('Failed to parse headers JSON:', err);
      }

      try {
        body = bodyStr && bodyStr.trim() !== '{}' ? JSON.parse(bodyStr) : undefined;
      } catch (err) {
        console.error('Failed to parse body JSON:', err);
      }

      config = createRestConfig(endpoint, method as any, headers, body);
    } else if (type === 'webhook') {
      const webhookPath = formData.get('webhookPath') as string;
      const webhookHandler = formData.get('webhookHandler') as string;
      const normalizedPath = normalizeWebhookPath(webhookPath);
      config = createWebhookConfig(normalizedPath, webhookHandler);
    } else if (type === 'javascript') {
      const jsCode = formData.get('jsCode') as string;
      config = createJavaScriptConfig(jsCode);
    } else {
      throw new Error(`Unknown tool type: ${type}`);
    }

    // Update tool
    const tool = await prisma.tool.update({
      where: { id: toolId },
      data: {
        name,
        description: description || '',
        config: serializeToolConfig(config),
      },
    });

    // Delete existing parameters and create new ones
    await prisma.parameter.deleteMany({
      where: { toolId },
    });

    if (parameters.length > 0) {
      await prisma.parameter.createMany({
        data: parameters.map((param: any, index: number) => ({
          toolId: tool.id,
          name: param.name,
          zodSchema: JSON.stringify({ type: param.type }),
          description: param.description || '',
          required: param.required !== false,
          order: index,
        })),
      });
    }

    // Revalidate the tools page
    const t = await prisma.tool.findUnique({
      where: { id: toolId },
      select: { serverId: true },
    });

    if (t) {
      revalidatePath(`/servers/${t.serverId}/tools`);
      // Create auto-snapshot
      await autoCreateSnapshot(t.serverId, 'Tool updated', name);
    }

    return { success: true, data: tool };
  } catch (error: any) {
    console.error('Error updating tool:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteTool(toolId: string) {
  try {
    const tool = await prisma.tool.findUnique({
      where: { id: toolId },
      select: { serverId: true, name: true },
    });

    if (!tool) {
      return { success: false, error: 'Tool not found' };
    }

    await prisma.tool.delete({
      where: { id: toolId },
    });

    revalidatePath(`/servers/${tool.serverId}/tools`);

    // Create auto-snapshot
    await autoCreateSnapshot(tool.serverId, 'Tool deleted', tool.name);

    return { success: true, message: 'Tool deleted successfully' };
  } catch (error: any) {
    console.error('Error deleting tool:', error);
    return { success: false, error: error.message };
  }
}

export async function testTool(toolId: string, parameters: Record<string, any>) {
  const { testTool: executeTool } = await import('@/lib/tool-tester');

  try {
    const tool = await prisma.tool.findUnique({
      where: { id: toolId },
    });

    if (!tool) {
      return { success: false, error: 'Tool not found' };
    }

    // Parse tool config
    const config = JSON.parse(tool.config);

    // Execute tool test
    const result = await executeTool(tool.type, config, parameters, tool.serverId);

    // If test was successful and schema was captured, save it
    if (result.success && result.schema && Object.keys(result.schema).length > 0) {
      await prisma.tool.update({
        where: { id: toolId },
        data: {
          resultSchema: JSON.stringify(result.schema),
        },
      });

      revalidatePath(`/servers/${tool.serverId}/tools`);
    }

    return result;
  } catch (error: any) {
    console.error('Error testing tool:', error);
    return { success: false, error: error.message };
  }
}

export async function updateToolSchema(
  toolId: string,
  schema: Record<string, { type: string; description?: string }>
) {
  try {
    const tool = await prisma.tool.findUnique({
      where: { id: toolId },
      select: { serverId: true },
    });

    if (!tool) {
      return { success: false, error: 'Tool not found' };
    }

    await prisma.tool.update({
      where: { id: toolId },
      data: {
        resultSchema: JSON.stringify(schema),
      },
    });

    revalidatePath(`/servers/${tool.serverId}/tools`);

    return { success: true, message: 'Schema updated successfully' };
  } catch (error: any) {
    console.error('Error updating tool schema:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteToolSchema(toolId: string) {
  try {
    const tool = await prisma.tool.findUnique({
      where: { id: toolId },
      select: { serverId: true },
    });

    if (!tool) {
      return { success: false, error: 'Tool not found' };
    }

    await prisma.tool.update({
      where: { id: toolId },
      data: {
        resultSchema: null,
      },
    });

    revalidatePath(`/servers/${tool.serverId}/tools`);

    return { success: true, message: 'Schema deleted successfully' };
  } catch (error: any) {
    console.error('Error deleting tool schema:', error);
    return { success: false, error: error.message };
  }
}

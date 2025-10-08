'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';

/**
 * Server Actions for Tool Management
 */

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
    let config: any = {};

    if (type === 'sql') {
      const connectionId = formData.get('connectionId') as string;
      const sqlQuery = formData.get('sqlQuery') as string;
      config = { connectionId, query: sqlQuery };
    } else if (type === 'rest') {
      const endpoint = formData.get('endpoint') as string;
      const method = formData.get('method') as string;
      const headers = formData.get('headers') as string;
      const body = formData.get('body') as string;
      config = { endpoint, method, headers: headers || '{}', body: body || '{}' };
    } else if (type === 'webhook') {
      const webhookPath = formData.get('webhookPath') as string;
      config = { path: webhookPath };
    } else if (type === 'javascript') {
      const jsCode = formData.get('jsCode') as string;
      config = { code: jsCode };
    }

    // Create tool with parameters as a relation
    const tool = await prisma.tool.create({
      data: {
        serverId,
        name,
        description: description || '',
        type,
        config: JSON.stringify(config),
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
    let config: any = {};

    if (type === 'sql') {
      const connectionId = formData.get('connectionId') as string;
      const sqlQuery = formData.get('sqlQuery') as string;
      config = { connectionId, query: sqlQuery };
    } else if (type === 'rest') {
      const endpoint = formData.get('endpoint') as string;
      const method = formData.get('method') as string;
      const headers = formData.get('headers') as string;
      const body = formData.get('body') as string;
      config = { endpoint, method, headers: headers || '{}', body: body || '{}' };
    } else if (type === 'webhook') {
      const webhookPath = formData.get('webhookPath') as string;
      config = { path: webhookPath };
    } else if (type === 'javascript') {
      const jsCode = formData.get('jsCode') as string;
      config = { code: jsCode };
    }

    // Update tool
    const tool = await prisma.tool.update({
      where: { id: toolId },
      data: {
        name,
        description: description || '',
        config: JSON.stringify(config),
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
      select: { serverId: true },
    });

    await prisma.tool.delete({
      where: { id: toolId },
    });

    if (tool) {
      revalidatePath(`/servers/${tool.serverId}/tools`);
    }

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

    return result;
  } catch (error: any) {
    console.error('Error testing tool:', error);
    return { success: false, error: error.message };
  }
}

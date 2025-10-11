'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';

/**
 * Get all templates with optional category filter
 * @param category - Optional category to filter by ('sql' | 'rest' | 'webhook' | 'javascript')
 * @returns List of templates
 */
export async function getTemplates(category?: string) {
  try {
    const templates = await prisma.template.findMany({
      where: category ? { category } : undefined,
      orderBy: [
        { isBuiltIn: 'desc' }, // Built-in templates first
        { downloads: 'desc' }, // Then by popularity
        { createdAt: 'desc' }, // Then by newest
      ],
    });

    return {
      success: true,
      templates,
    };
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch templates',
      templates: [],
    };
  }
}

/**
 * Get a single template by ID
 * @param id - Template ID
 * @returns Template details
 */
export async function getTemplateById(id: string) {
  try {
    const template = await prisma.template.findUnique({
      where: { id },
    });

    if (!template) {
      return {
        success: false,
        error: 'Template not found',
        template: null,
      };
    }

    return {
      success: true,
      template,
    };
  } catch (error: any) {
    console.error('Error fetching template:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch template',
      template: null,
    };
  }
}

/**
 * Increment template download count
 * @param id - Template ID
 */
export async function incrementTemplateDownloads(id: string) {
  try {
    await prisma.template.update({
      where: { id },
      data: {
        downloads: {
          increment: 1,
        },
      },
    });

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('Error incrementing template downloads:', error);
    return {
      success: false,
      error: error.message || 'Failed to increment downloads',
    };
  }
}

/**
 * Create a server and tool from a template
 * @param templateId - Template ID to use
 * @returns The created server ID
 */
export async function createServerFromTemplate(templateId: string) {
  try {
    // Fetch template
    const template = await prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return {
        success: false,
        error: 'Template not found',
      };
    }

    // Parse template config
    const config = JSON.parse(template.config);

    // Create server with template name
    const server = await prisma.server.create({
      data: {
        name: `From Template: ${template.name}`,
        description: template.description,
        status: 'stopped',
        transport: 'stdio',
        runMode: 'gui',
      },
    });

    // Create tool from template
    const tool = await prisma.tool.create({
      data: {
        serverId: server.id,
        name: template.name,
        description: template.description,
        type: config.type,
        config: template.config,
      },
    });

    // Create parameters if defined in config
    if (config.parameters && Array.isArray(config.parameters)) {
      for (let i = 0; i < config.parameters.length; i++) {
        const param = config.parameters[i];
        await prisma.parameter.create({
          data: {
            toolId: tool.id,
            name: param.name,
            zodSchema: JSON.stringify({
              type: param.type,
              required: param.required !== false,
            }),
            description: param.description || '',
            required: param.required !== false,
            order: i,
          },
        });
      }
    }

    // Increment template downloads
    await prisma.template.update({
      where: { id: templateId },
      data: {
        downloads: {
          increment: 1,
        },
      },
    });

    revalidatePath('/');
    revalidatePath('/templates');

    return {
      success: true,
      serverId: server.id,
      message: 'Server created successfully from template',
    };
  } catch (error: any) {
    console.error('Error creating server from template:', error);
    return {
      success: false,
      error: error.message || 'Failed to create server from template',
    };
  }
}

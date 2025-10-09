'use server';

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

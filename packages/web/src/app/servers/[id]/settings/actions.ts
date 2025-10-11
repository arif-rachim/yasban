'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';

/**
 * Server Actions for Server Settings
 */

export async function updateServerSettings(formData: FormData) {
  try {
    const serverId = formData.get('serverId') as string;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    if (!serverId || !name) {
      return {
        success: false,
        error: 'Server ID and name are required',
      };
    }

    const server = await prisma.server.update({
      where: { id: serverId },
      data: {
        name,
        description: description || '',
      },
    });

    revalidatePath('/');
    revalidatePath(`/servers/${serverId}/settings`);
    revalidatePath(`/servers/${serverId}`);

    return { success: true, data: server };
  } catch (error: any) {
    console.error('Error updating server settings:', error);
    return { success: false, error: error.message };
  }
}

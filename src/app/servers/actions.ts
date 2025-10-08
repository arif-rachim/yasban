'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';

/**
 * Server Actions for Server CRUD
 */

export async function createServer(formData: FormData) {
  try {
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const transport = formData.get('transport') as string;
    const runMode = formData.get('runMode') as string;

    if (!name || !transport || !runMode) {
      return {
        success: false,
        error: 'Name, transport, and run mode are required',
      };
    }

    const server = await prisma.server.create({
      data: {
        name,
        description: description || '',
        transport,
        runMode,
        status: 'stopped',
      },
    });

    revalidatePath('/');

    return { success: true, data: server };
  } catch (error: any) {
    console.error('Error creating server:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteServer(serverId: string) {
  try {
    await prisma.server.delete({
      where: { id: serverId },
    });

    revalidatePath('/');
    redirect('/');
  } catch (error: any) {
    console.error('Error deleting server:', error);
    return { success: false, error: error.message };
  }
}

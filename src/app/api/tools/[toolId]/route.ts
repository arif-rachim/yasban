import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ toolId: string }> }
) {
  try {
    const { toolId } = await params;

    const tool = await prisma.tool.findUnique({
      where: { id: toolId },
      include: {
        parameters: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!tool) {
      return NextResponse.json(
        { error: 'Tool not found' },
        { status: 404 }
      );
    }

    // Parse config to get connectionId
    const config = JSON.parse(tool.config || '{}');
    let connection = null;

    if (config.connectionId) {
      connection = await prisma.connection.findUnique({
        where: { id: config.connectionId },
        select: {
          id: true,
          name: true,
          type: true,
        },
      });
    }

    // Return tool with connection info
    return NextResponse.json({
      ...tool,
      connection,
    });
  } catch (error: any) {
    console.error('Error fetching tool:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

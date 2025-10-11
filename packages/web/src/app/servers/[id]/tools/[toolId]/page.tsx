import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { ToolForm } from '@/components/forms/ToolForm';

interface EditToolPageProps {
  params: Promise<{
    id: string;
    toolId: string;
  }>;
}

export default async function EditToolPage({ params }: EditToolPageProps) {
  const { id: serverId, toolId } = await params;

  // Fetch tool data with parameters
  const tool = await prisma.tool.findUnique({
    where: { id: toolId },
    include: {
      parameters: {
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!tool || tool.serverId !== serverId) {
    notFound();
  }

  // Fetch connections for SQL tools
  const connections = await prisma.connection.findMany({
    where: { serverId },
    select: {
      id: true,
      name: true,
      type: true,
    },
    orderBy: { name: 'asc' },
  });

  return (
    <ToolForm
      mode="edit"
      serverId={serverId}
      connections={connections}
      tool={tool}
    />
  );
}

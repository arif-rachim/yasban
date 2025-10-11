import prisma from '@/lib/prisma';
import { ToolsTable } from './ToolsTable';

interface ToolsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ToolsPage({ params }: ToolsPageProps) {
  const { id: serverId } = await params;

  // Fetch tools server-side with parameters
  const tools = await prisma.tool.findMany({
    where: { serverId },
    include: {
      parameters: {
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  // Transform null to undefined for description
  const transformedTools = tools.map(tool => ({
    ...tool,
    description: tool.description || undefined,
  }));

  return <ToolsTable serverId={serverId} initialTools={transformedTools} />;
}

import prisma from '@/lib/prisma';
import { ToolForm } from '@/components/forms/ToolForm';

interface NewToolPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function NewToolPage({ params }: NewToolPageProps) {
  const { id: serverId } = await params;

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

  return <ToolForm mode="create" serverId={serverId} connections={connections} />;
}

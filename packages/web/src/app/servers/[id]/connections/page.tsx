import prisma from '@/lib/prisma';
import { ConnectionsTable } from './ConnectionsTable';

interface ConnectionsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ConnectionsPage({ params }: ConnectionsPageProps) {
  const { id: serverId } = await params;

  // Fetch connections server-side
  const connections = await prisma.connection.findMany({
    where: { serverId },
    orderBy: { name: 'asc' },
  });

  return <ConnectionsTable serverId={serverId} initialConnections={connections} />;
}

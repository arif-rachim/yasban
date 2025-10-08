import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { ConnectionForm } from '@/components/forms/ConnectionForm';

interface EditConnectionPageProps {
  params: Promise<{
    id: string;
    connectionId: string;
  }>;
}

export default async function EditConnectionPage({ params }: EditConnectionPageProps) {
  const { id: serverId, connectionId } = await params;

  // Fetch connection data server-side
  const connection = await prisma.connection.findUnique({
    where: { id: connectionId },
  });

  if (!connection || connection.serverId !== serverId) {
    notFound();
  }

  return (
    <ConnectionForm
      mode="edit"
      serverId={serverId}
      connection={connection}
    />
  );
}

import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { VersionsList } from './VersionsList';

interface VersionsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function VersionsPage({ params }: VersionsPageProps) {
  const { id: serverId } = await params;

  // Fetch server
  const server = await prisma.server.findUnique({
    where: { id: serverId },
    select: {
      id: true,
      name: true,
    },
  });

  if (!server) {
    notFound();
  }

  // Fetch versions
  const versions = await prisma.version.findMany({
    where: { serverId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      versionNumber: true,
      description: true,
      createdBy: true,
      createdAt: true,
      configSnapshot: true,
    },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Version History</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          View and rollback to previous server configurations
        </p>
      </div>

      <VersionsList serverId={server.id} versions={versions} />
    </div>
  );
}

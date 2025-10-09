import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { LogsViewer } from '@/components/LogsViewer';

interface LogsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function LogsPage({ params }: LogsPageProps) {
  const { id: serverId } = await params;

  const server = await prisma.server.findUnique({
    where: { id: serverId },
    select: {
      id: true,
      name: true,
      status: true,
    },
  });

  if (!server) {
    notFound();
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Server Logs</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          View real-time logs from your MCP server
        </p>
      </div>

      <LogsViewer serverId={server.id} serverStatus={server.status} />
    </div>
  );
}

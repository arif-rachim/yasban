import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { ServerSidebar } from '@/components/ServerSidebar';

interface ServerLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    id: string;
  }>;
}

export default async function ServerLayout({ children, params }: ServerLayoutProps) {
  const { id: serverId } = await params;

  // Fetch server data with Prisma
  const server = await prisma.server.findUnique({
    where: { id: serverId },
  });

  if (!server) {
    notFound();
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <ServerSidebar serverId={serverId} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {server.name}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {server.description || 'No description'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  server.status === 'running'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300'
                }`}
              >
                {server.status}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                {server.transport}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </div>
      </main>
    </div>
  );
}

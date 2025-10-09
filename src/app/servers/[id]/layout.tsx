import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { ServerSidebar } from '@/components/ServerSidebar';
import { ServerHeader } from '@/components/ServerHeader';

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
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-auto" >
      {/* Sidebar */}
      <ServerSidebar serverId={serverId} />

      {/* Main Content */}
      <main className="flex flex-col flex-1 h-screen">
        {/* Header */}
        <ServerHeader server={server} />

        {/* Page Content */}
        <div className="flex flex-col overflow-auto p-4">
          {children}
        </div>
      </main>
    </div>
  );
}

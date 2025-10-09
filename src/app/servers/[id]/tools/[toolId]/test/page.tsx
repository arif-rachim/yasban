import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { ToolTester } from '@/components/ToolTester';
import { BackButton } from '@/components/ui/back-button';

interface TestToolPageProps {
  params: Promise<{
    id: string;
    toolId: string;
  }>;
}

export default async function TestToolPage({ params }: TestToolPageProps) {
  const { id: serverId, toolId } = await params;

  // Fetch tool with parameters
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

  // Parse config to get connectionId (for SQL tools)
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

  // Create tool object with connection
  const toolWithConnection: any = {
    ...tool,
    connection,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <BackButton />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Test Tool: {toolWithConnection.name}
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Execute your tool with custom parameters and view results
          </p>
        </div>
      </div>

      <ToolTester tool={toolWithConnection} serverId={serverId} />
    </div>
  );
}

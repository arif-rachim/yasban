import prisma from '@/lib/prisma';
import { ToolCreationWizard } from './ToolCreationWizard';
import { redirect } from 'next/navigation';

interface ToolWizardPageProps {
  searchParams: Promise<{
    type?: string;
    serverId?: string;
    connectionId?: string;
    step?: string;
  }>;
}

export default async function ToolWizardPage({ searchParams }: ToolWizardPageProps) {
  const params = await searchParams;
  const { type, serverId, connectionId, step } = params;

  // Validate tool type
  const validTypes = ['sql', 'rest', 'webhook', 'javascript'];
  if (!type || !validTypes.includes(type)) {
    redirect('/');
  }

  // Fetch all servers
  const servers = await prisma.server.findMany({
    select: {
      id: true,
      name: true,
      status: true,
    },
    orderBy: { name: 'asc' },
  });

  // Fetch connections for SQL tools (if serverId is provided)
  let connections: Array<{ id: string; name: string; type: string }> = [];
  if (type === 'sql' && serverId) {
    connections = await prisma.connection.findMany({
      where: { serverId },
      select: {
        id: true,
        name: true,
        type: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  return (
    <ToolCreationWizard
      toolType={type as 'sql' | 'rest' | 'webhook' | 'javascript'}
      servers={servers}
      selectedServerId={serverId}
      selectedConnectionId={connectionId}
      connections={connections}
      currentStep={step}
    />
  );
}

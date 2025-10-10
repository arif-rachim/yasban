import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { ConditionalServerLayout } from '@/components/ConditionalServerLayout';

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
    <ConditionalServerLayout server={server} serverId={serverId}>
      {children}
    </ConditionalServerLayout>
  );
}

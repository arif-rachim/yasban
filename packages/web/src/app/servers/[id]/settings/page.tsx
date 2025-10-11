import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { ServerForm } from '@/components/forms/ServerForm';

interface SettingsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { id: serverId } = await params;

  const server = await prisma.server.findUnique({
    where: { id: serverId },
    select: {
      id: true,
      name: true,
      description: true,
      transport: true,
      runMode: true,
      status: true,
    },
  });

  if (!server) {
    notFound();
  }

  return <ServerForm mode="edit" server={server} />;
}

import { ConnectionForm } from '@/components/forms/ConnectionForm';

interface NewConnectionPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function NewConnectionPage({ params }: NewConnectionPageProps) {
  const { id: serverId } = await params;

  return <ConnectionForm mode="create" serverId={serverId} />;
}

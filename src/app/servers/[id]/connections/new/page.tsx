import { ConnectionForm } from '@/components/forms/ConnectionForm';

interface NewConnectionPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    returnTo?: string;
  }>;
}

export default async function NewConnectionPage({ params, searchParams }: NewConnectionPageProps) {
  const { id: serverId } = await params;
  const search = await searchParams;

  return <ConnectionForm mode="create" serverId={serverId} returnTo={search.returnTo} />;
}

import { ServerForm } from '@/components/forms/ServerForm';

interface NewServerPageProps {
  searchParams: Promise<{
    returnTo?: string;
  }>;
}

export default async function NewServerPage({ searchParams }: NewServerPageProps) {
  const params = await searchParams;
  return <ServerForm mode="create" returnTo={params.returnTo} />;
}

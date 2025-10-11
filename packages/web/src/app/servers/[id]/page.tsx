'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ServerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const serverId = params.id as string;

  useEffect(() => {
    // Redirect to tools page as default view
    router.replace(`/servers/${serverId}/tools`);
  }, [serverId, router]);

  return (
    <div className="flex items-center justify-center py-12 ">
      <div className="text-gray-500">Redirecting...</div>
    </div>
  );
}

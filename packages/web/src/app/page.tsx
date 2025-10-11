import prisma from '@/lib/prisma';
import { DashboardClient } from './DashboardClient';

export default async function Dashboard() {
  // Fetch servers with tool count using Prisma
  const servers = await prisma.server.findMany({
    include: {
      _count: {
        select: { tools: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return <DashboardClient servers={servers} />;
}

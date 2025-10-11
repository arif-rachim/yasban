'use client';

import { usePathname } from 'next/navigation';
import { ServerSidebar } from '@/components/ServerSidebar';
import { ServerHeader } from '@/components/ServerHeader';
import { ReactNode } from 'react';

interface Server {
  id: string;
  name: string;
  description: string | null;
  transport: string;
  runMode: string;
  status: string;
  port: number | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ConditionalServerLayoutProps {
  server: Server;
  serverId: string;
  children: ReactNode;
}

/**
 * Conditionally renders sidebar and header based on current pathname
 * Hides them for create/edit pages to provide a focused form experience
 */
export function ConditionalServerLayout({
  server,
  serverId,
  children,
}: ConditionalServerLayoutProps) {
  const pathname = usePathname();

  // Determine if we should hide sidebar/header (form pages need focus)
  const shouldHideNavigation = () => {
    if (!pathname) return false;

    // Hide for "new" pages (create forms)
    if (pathname.endsWith('/new')) {
      return true;
    }

    // Hide for edit tool page: /servers/[id]/tools/[toolId]
    // But NOT for test page: /servers/[id]/tools/[toolId]/test
    const toolEditPattern = /\/servers\/[^/]+\/tools\/[^/]+$/;
    if (toolEditPattern.test(pathname)) {
      return true;
    }

    // Hide for edit connection page: /servers/[id]/connections/[connectionId]
    const connectionEditPattern = /\/servers\/[^/]+\/connections\/[^/]+$/;
    if (connectionEditPattern.test(pathname)) {
      return true;
    }

    return false;
  };

  const hideNav = shouldHideNavigation();

  // Full layout with sidebar and header (default)
  if (!hideNav) {
    return (
      <div className="flex h-full bg-gray-50 dark:bg-gray-900 overflow-auto">
        {/* Sidebar */}
        <ServerSidebar serverId={serverId} />

        {/* Main Content */}
        <main className="flex flex-col flex-1 h-full overflow-auto">
          {/* Header */}
          <ServerHeader server={server} />

          {/* Page Content */}
          <div className="flex flex-col overflow-auto p-4">{children}</div>
        </main>
      </div>
    );
  }

  // Focused layout without sidebar and header (for forms)
  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 py-8 overflow-auto">
      <div className="max-w-5xl mx-auto px-4">{children}</div>
    </div>
  );
}

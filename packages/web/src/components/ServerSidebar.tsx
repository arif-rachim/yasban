'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface ServerSidebarProps {
  serverId: string;
}

export function ServerSidebar({ serverId }: ServerSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const menuItems = [
    { label: 'Tools', path: `/servers/${serverId}/tools` },
    { label: 'Connections', path: `/servers/${serverId}/connections` },
    { label: 'Versions', path: `/servers/${serverId}/versions` },
    { label: 'Logs', path: `/servers/${serverId}/logs` },
    { label: 'Settings', path: `/servers/${serverId}/settings` },
  ];

  const isActive = (path: string) => pathname === path;

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col shrink-0">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">
          Yasban
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          يسبان - Easy Builder
        </p>
      </div>

      <nav className="flex-1 p-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/')}
          className="w-full mb-4"
        >
          ← Back to Dashboard
        </Button>

        <div className="mb-4">
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Server Menu
          </h2>
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.path}>
                <button
                  onClick={() => router.push(item.path)}
                  className={`w-full text-left p-2 rounded transition-colors ${
                    isActive(item.path)
                      ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </aside>
  );
}

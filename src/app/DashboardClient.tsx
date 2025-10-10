'use client';

import { useRouter } from 'next/navigation';

interface Server {
  id: string;
  name: string;
  status: string;
  _count?: {
    tools: number;
  };
}

interface DashboardClientProps {
  servers: Server[];
}

export function DashboardClient({ servers }: DashboardClientProps) {
  const router = useRouter();

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">
            Yasban
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            يسبان - Easy Builder
          </p>
        </div>

        <nav className="flex-1 p-4">
          <div className="mb-4">
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Servers
            </h2>
            {servers.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">
                No servers yet
              </p>
            ) : (
              <ul className="space-y-1">
                {servers.map((server) => (
                  <li
                    key={server.id}
                    onClick={() => router.push(`/servers/${server.id}`)}
                    className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {server.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {server._count?.tools || 0} tools
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            onClick={() => router.push('/servers/new')}
            className="w-full mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            New Server
          </button>
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button className="w-full text-left px-2 py-1 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            Settings
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Dashboard
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Welcome to Yasban - Your MCP Server Builder
          </p>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto">
            {/* Welcome Card */}
            <div className="bg-gradient-to-r from-primary-500 to-accent-500 rounded-lg p-8 text-white mb-6">
              <h3 className="text-3xl font-bold mb-2">Welcome to Yasban!</h3>
              <p className="text-primary-50 mb-4">
                Build MCP servers visually, without code. Get started by creating your first server.
              </p>
              <button
                onClick={() => router.push('/servers/new')}
                className="px-6 py-2 bg-white text-primary-600 rounded-md font-semibold hover:bg-primary-50 transition-colors"
              >
                Create Your First Server
              </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                  {servers.length}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Servers
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="text-3xl font-bold text-accent-600 dark:text-accent-400">
                  {servers.reduce((acc, s) => acc + (s._count?.tools || 0), 0)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Tools
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {servers.filter((s) => s.status === 'running').length}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Running
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => router.push('/wizard/tool?type=sql')}
                  className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-500 dark:hover:border-primary-400 transition-colors text-left"
                >
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    SQL Tool
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Query databases with SQL
                  </div>
                </button>

                <button
                  onClick={() => router.push('/wizard/tool?type=rest')}
                  className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-500 dark:hover:border-primary-400 transition-colors text-left"
                >
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    REST API
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Call HTTP APIs
                  </div>
                </button>

                <button
                  onClick={() => router.push('/wizard/tool?type=webhook')}
                  className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-500 dark:hover:border-primary-400 transition-colors text-left"
                >
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Webhook
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Receive webhook events
                  </div>
                </button>

                <button
                  onClick={() => router.push('/wizard/tool?type=javascript')}
                  className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-500 dark:hover:border-primary-400 transition-colors text-left"
                >
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    JavaScript
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Custom JavaScript code
                  </div>
                </button>

                <button
                  onClick={() => router.push('/templates')}
                  className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-500 dark:hover:border-primary-400 transition-colors text-left"
                >
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Browse Templates
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Start from a template
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

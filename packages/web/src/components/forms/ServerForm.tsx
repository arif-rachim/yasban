'use client';

import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useRef, useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ServerNameInput } from '@/components/ui/server-name-input';
import { createServer } from '@/app/actions/servers';
import { updateServerSettings } from '@/app/servers/[id]/settings/actions';
import { BackButton } from '@/components/ui/back-button';

interface Server {
  id: string;
  name: string;
  description: string | null;
  transport: string;
  runMode: string;
  status: string;
  port: number | null;
}

interface ServerFormProps {
  mode: 'create' | 'edit';
  server?: Server;
  returnTo?: string;
}

function SubmitButton({ mode }: { mode: 'create' | 'edit' }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending
        ? mode === 'create' ? 'Creating...' : 'Saving...'
        : mode === 'create' ? 'Create Server' : 'Save Changes'}
    </Button>
  );
}

export function ServerForm({ mode, server, returnTo }: ServerFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedTransport, setSelectedTransport] = useState(server?.transport || 'stdio');

  const action = mode === 'create' ? createServer : updateServerSettings;

  const [state, formAction] = useActionState(async (prevState: any, formData: FormData) => {
    const result = await action(formData);

    if (result.success) {
      if (mode === 'create') {
        // If returnTo is provided, append serverId and redirect there
        if (returnTo && result.data?.id) {
          const separator = returnTo.includes('?') ? '&' : '?';
          router.push(`${returnTo}${separator}serverId=${result.data.id}`);
        } else {
          router.push('/');
        }
        router.refresh();
      } else {
        // Stay on settings page and show success
        router.refresh();
      }
    }

    return result;
  }, null);

  return (
    <div className="max-w-2xl mx-auto">
      <BackButton fallbackHref={mode === 'create' ? '/' : `/servers/${server?.id}/settings`} />

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {mode === 'create' ? 'Create New Server' : 'Server Settings'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {mode === 'create'
              ? 'Create a new MCP server. You can add tools to it later.'
              : 'Configure your MCP server settings'}
          </p>
        </div>

        <form ref={formRef} action={formAction} className="space-y-6">
          {/* Hidden Fields */}
          {mode === 'edit' && server && (
            <input type="hidden" name="serverId" value={server.id} />
          )}

          {/* Basic Information Section */}
          <div className="space-y-4">
            <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100">
              Basic Information
            </h3>

            {/* Server Name */}
            <ServerNameInput
              id="name"
              name="name"
              placeholder="my-awesome-server"
              defaultValue={server?.name}
              required
            />

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe what this server does..."
                defaultValue={server?.description || ''}
                rows={3}
              />
            </div>
          </div>

          {/* Server Configuration Section (only in create mode or read-only in edit) */}
          {mode === 'create' ? (
            <div className="space-y-4">
              <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100">
                Server Configuration
              </h3>

              {/* Transport */}
              <div className="grid gap-2">
                <Label htmlFor="transport">
                  Transport <span className="text-red-500">*</span>
                </Label>
                <select
                  id="transport"
                  name="transport"
                  defaultValue="stdio"
                  onChange={(e) => setSelectedTransport(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                >
                  <option value="stdio">stdio (Claude Desktop)</option>
                  <option value="sse">SSE (Server-Sent Events, legacy)</option>
                  <option value="streamable-http">Streamable HTTP (recommended)</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Streamable HTTP is recommended for remote access (MCP spec 2025-03-26)
                </p>
              </div>

              {/* Port (conditional - only for SSE and Streamable HTTP) */}
              {(selectedTransport === 'sse' || selectedTransport === 'streamable-http') && (
                <div className="grid gap-2">
                  <Label htmlFor="port">
                    Port (optional)
                  </Label>
                  <Input
                    id="port"
                    name="port"
                    type="number"
                    min="1024"
                    max="65535"
                    placeholder="3100 (auto-assign if empty)"
                    defaultValue={server?.port ? server.port.toString() : ''}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Leave empty to auto-assign an available port starting from 3100
                  </p>
                </div>
              )}

              {/* Run Mode */}
              <div className="grid gap-2">
                <Label htmlFor="runMode">
                  Run Mode <span className="text-red-500">*</span>
                </Label>
                <select
                  id="runMode"
                  name="runMode"
                  defaultValue="gui"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                >
                  <option value="gui">GUI (Manual Start)</option>
                  <option value="service">Service (Auto-start)</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Service mode installs as Windows service/Linux daemon
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100">
                Server Configuration
              </h3>

              {/* Warning when server is running */}
              {server?.status === 'running' && (
                <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-amber-600 dark:text-amber-400 text-lg">⚠️</span>
                    <div className="text-sm">
                      <p className="font-medium text-amber-800 dark:text-amber-300">
                        Server is currently running
                      </p>
                      <p className="text-amber-700 dark:text-amber-400 mt-1">
                        Stop the server to change transport or run mode settings.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-4">
                {/* Transport */}
                <div className="grid gap-2">
                  <Label htmlFor="transport">
                    Transport <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="transport"
                    name="transport"
                    defaultValue={server?.transport}
                    onChange={(e) => setSelectedTransport(e.target.value)}
                    disabled={server?.status === 'running'}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    <option value="stdio">stdio (Claude Desktop)</option>
                    <option value="sse">SSE (Server-Sent Events, legacy)</option>
                    <option value="streamable-http">Streamable HTTP (recommended)</option>
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Streamable HTTP is recommended for remote access (MCP spec 2025-03-26)
                  </p>
                </div>

                {/* Port (conditional - only for SSE and Streamable HTTP) */}
                {(selectedTransport === 'sse' || selectedTransport === 'streamable-http') && (
                  <div className="grid gap-2">
                    <Label htmlFor="port">
                      Port (optional)
                    </Label>
                    <Input
                      id="port"
                      name="port"
                      type="number"
                      min="1024"
                      max="65535"
                      placeholder="3100 (auto-assign if empty)"
                      defaultValue={server?.port ? server.port.toString() : ''}
                      disabled={server?.status === 'running'}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Leave empty to auto-assign an available port starting from 3100
                    </p>
                  </div>
                )}

                {/* Run Mode */}
                <div className="grid gap-2">
                  <Label htmlFor="runMode">
                    Run Mode <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="runMode"
                    name="runMode"
                    defaultValue={server?.runMode}
                    disabled={server?.status === 'running'}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    <option value="gui">GUI (Manual Start)</option>
                    <option value="service">Service (Auto-start)</option>
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Service mode installs as Windows service/Linux daemon
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {state && state.success && mode === 'edit' && (
            <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-3 text-sm text-green-700 dark:text-green-400">
              ✓ Settings saved successfully!
            </div>
          )}

          {/* Error Message */}
          {state && !state.success && state.error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400">
              {state.error}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(mode === 'create' ? '/' : `/servers/${server?.id}/settings`)}
            >
              Cancel
            </Button>
            <SubmitButton mode={mode} />
          </div>
        </form>
      </div>
    </div>
  );
}

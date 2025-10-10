'use client';

import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useRef, useActionState } from 'react';
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
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                >
                  <option value="stdio">stdio (Claude Desktop)</option>
                  <option value="sse">SSE (Server-Sent Events)</option>
                  <option value="http">HTTP</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  How clients will connect to this server
                </p>
              </div>

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

              <div className="grid gap-4">
                {/* Transport (Read-only) */}
                <div className="grid gap-2">
                  <Label>Transport</Label>
                  <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded text-sm text-gray-700 dark:text-gray-300">
                    {server?.transport}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Transport type cannot be changed after creation
                  </p>
                </div>

                {/* Run Mode (Read-only) */}
                <div className="grid gap-2">
                  <Label>Run Mode</Label>
                  <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded text-sm text-gray-700 dark:text-gray-300">
                    {server?.runMode}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Run mode cannot be changed after creation
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

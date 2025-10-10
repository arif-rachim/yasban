'use client';

import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConnectionNameInput } from '@/components/ui/connection-name-input';
import { createConnection, updateConnection, testConnection, testConnectionConfig } from '@/app/servers/[id]/connections/actions';
import { BackButton } from '@/components/ui/back-button';

interface Connection {
  id: string;
  serverId: string;
  name: string;
  type: string;
  config: string;
}

interface ConnectionFormProps {
  mode: 'create' | 'edit';
  serverId: string;
  connection?: Connection;
  returnTo?: string;
}

function SubmitButton({ mode }: { mode: 'create' | 'edit' }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending
        ? mode === 'create' ? 'Creating...' : 'Updating...'
        : mode === 'create' ? 'Create Connection' : 'Update Connection'}
    </Button>
  );
}

export function ConnectionForm({ mode, serverId, connection, returnTo }: ConnectionFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  // Parse existing config if in edit mode
  const existingConfig = connection ? JSON.parse(connection.config) : {};

  // Minimal state for conditional rendering
  const [connectionType, setConnectionType] = useState(connection?.type || 'postgresql');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const action = mode === 'create' ? createConnection : updateConnection;

  const [state, formAction] = useActionState(async (prevState: any, formData: FormData) => {
    const result = await action(formData);

    if (result.success) {
      // If returnTo is provided, append connectionId and redirect there
      if (returnTo && result.data?.id) {
        const separator = returnTo.includes('?') ? '&' : '?';
        router.push(`${returnTo}${separator}connectionId=${result.data.id}`);
      } else {
        router.push(`/servers/${serverId}/connections`);
      }
      router.refresh();
    }

    return result;
  }, null);

  // Handle type change to show/hide fields and set default ports
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value;
    setConnectionType(newType);
    setTestResult(null);

    // Set default ports
    const portInput = formRef.current?.querySelector('input[name="port"]') as HTMLInputElement;
    if (portInput && mode === 'create') {
      switch (newType) {
        case 'postgresql':
          portInput.value = '5432';
          break;
        case 'mysql':
          portInput.value = '3306';
          break;
        case 'mssql':
          portInput.value = '1433';
          break;
        default:
          portInput.value = '';
      }
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      let result;

      if (mode === 'edit' && connection) {
        // Edit mode: Test saved connection
        result = await testConnection(connection.id);
      } else {
        // Create mode: Test with form data
        if (!formRef.current) {
          setTestResult('Error: Form not ready');
          setTesting(false);
          return;
        }

        const formData = new FormData(formRef.current);
        result = await testConnectionConfig(formData);
      }

      if (result.success) {
        setTestResult(result.message || 'Connection test successful!');
      } else {
        setTestResult(`Error: ${result.error}`);
      }
    } catch (err: any) {
      setTestResult(`Error: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  const showDatabaseFields = ['postgresql', 'mysql', 'mssql'].includes(connectionType);
  const showSqliteFields = connectionType === 'sqlite';
  const showRestApiFields = connectionType === 'rest_api';

  return (
    <div className="max-w-2xl mx-auto">
      <BackButton fallbackHref={`/servers/${serverId}/connections`} />

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {mode === 'create' ? 'Create New Connection' : 'Edit Connection'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {mode === 'create'
              ? 'Add a database or API connection to this server.'
              : 'Update the connection settings.'}
          </p>
        </div>

        <form ref={formRef} action={formAction} className="space-y-4">
          {/* Hidden Fields */}
          <input type="hidden" name="serverId" value={serverId} />
          {mode === 'edit' && connection && (
            <>
              <input type="hidden" name="connectionId" value={connection.id} />
              <input type="hidden" name="type" value={connection.type} />
            </>
          )}

          {/* Connection Name */}
          <ConnectionNameInput
            id="name"
            name="name"
            placeholder="my-postgres-db"
            defaultValue={connection?.name}
            required
          />

          {/* Connection Type */}
          <div className="grid gap-2">
            <Label htmlFor="type">
              Connection Type <span className="text-red-500">*</span>
            </Label>
            <select
              id="type"
              name={mode === 'create' ? 'type' : undefined}
              value={connectionType}
              onChange={handleTypeChange}
              disabled={mode === 'edit'}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              required={mode === 'create'}
            >
              <option value="postgresql">PostgreSQL</option>
              <option value="mysql">MySQL</option>
              <option value="mssql">Microsoft SQL Server</option>
              <option value="sqlite">SQLite</option>
              <option value="rest_api">REST API</option>
            </select>
            {mode === 'edit' && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Connection type cannot be changed after creation
              </p>
            )}
          </div>

          {/* Database Connection Fields */}
          {showDatabaseFields && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="host">Host</Label>
                  <Input
                    id="host"
                    name="host"
                    defaultValue={existingConfig.host || 'localhost'}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    name="port"
                    defaultValue={
                      existingConfig.port ||
                      (connectionType === 'postgresql' ? '5432' :
                       connectionType === 'mysql' ? '3306' :
                       connectionType === 'mssql' ? '1433' : '')
                    }
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="database">Database</Label>
                <Input
                  id="database"
                  name="database"
                  defaultValue={existingConfig.database || ''}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  name="username"
                  defaultValue={existingConfig.user || ''}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder={mode === 'edit' ? 'Leave empty to keep existing password' : ''}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="ssl" className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="ssl"
                    name="ssl"
                    value="true"
                    defaultChecked={existingConfig.ssl || false}
                    className="h-4 w-4"
                  />
                  Enable SSL/TLS
                </Label>
              </div>
            </>
          )}

          {/* SQLite Fields */}
          {showSqliteFields && (
            <div className="grid gap-2">
              <Label htmlFor="path">Database File Path</Label>
              <Input
                id="path"
                name="path"
                placeholder="/path/to/database.db"
                defaultValue={existingConfig.path || ''}
              />
            </div>
          )}

          {/* REST API Fields */}
          {showRestApiFields && (
            <div className="grid gap-2">
              <Label htmlFor="baseUrl">Base URL</Label>
              <Input
                id="baseUrl"
                name="baseUrl"
                placeholder="https://api.example.com"
                defaultValue={existingConfig.baseUrl || ''}
              />
            </div>
          )}

          {/* Test Connection Button */}
          <div className="grid gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleTest}
              disabled={testing}
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </Button>
            {mode === 'create' && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Test your connection settings before saving
              </p>
            )}
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`rounded-md p-3 text-sm ${
              testResult.startsWith('Error')
                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
            }`}>
              {testResult.startsWith('Error') ? testResult : `✓ ${testResult}`}
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
              onClick={() => router.push(`/servers/${serverId}/connections`)}
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

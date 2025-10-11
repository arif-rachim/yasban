'use client';

import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ToolNameInput } from '@/components/ui/tool-name-input';
import { ParameterNameInput } from '@/components/ui/parameter-name-input';
import { useToast } from '@/components/ui/use-toast';
import { createTool, updateTool, updateToolSchema, deleteToolSchema } from '@/app/servers/[id]/tools/actions';
import { BackButton } from '@/components/ui/back-button';
import { SchemaEditor } from '@/components/forms/SchemaEditor';
import { parseToolConfig, RestToolConfig, SqlToolConfig, WebhookToolConfig, JavaScriptToolConfig } from '@yasban/shared/types/tool-config';

interface Tool {
  id: string;
  serverId: string;
  name: string;
  description: string | null;
  type: string;
  config: string;
  resultSchema?: string | null;
  parameters?: Array<{
    id: string;
    name: string;
    description: string | null;
    required: boolean;
    zodSchema: string;
    order: number;
  }>;
}

interface Connection {
  id: string;
  name: string;
  type: string;
}

interface ToolFormProps {
  mode: 'create' | 'edit';
  serverId: string;
  connections: Connection[];
  tool?: Tool;
}

function SubmitButton({ mode }: { mode: 'create' | 'edit' }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending
        ? mode === 'create' ? 'Creating...' : 'Updating...'
        : mode === 'create' ? 'Create Tool' : 'Update Tool'}
    </Button>
  );
}

export function ToolForm({ mode, serverId, connections, tool }: ToolFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const { toast } = useToast();

  // Parse existing config if in edit mode
  const existingConfig = tool ? parseToolConfig(tool.type, tool.config) : null;

  // Helper to strip /webhook/ prefix for display in edit mode
  const stripWebhookPrefix = (path: string): string => {
    if (path.toLowerCase().startsWith('/webhook/')) {
      return path.substring(9); // Remove "/webhook/" prefix
    }
    return path;
  };

  // Minimal state for conditional rendering and dynamic lists
  const [toolType, setToolType] = useState(tool?.type || 'sql');
  const [restMethod, setRestMethod] = useState(
    existingConfig && existingConfig.type === 'rest' ? existingConfig.method : 'GET'
  );
  const [parameters, setParameters] = useState<Array<{
    name: string;
    type: string;
    description: string;
    required: boolean;
  }>>([]);
  const [resultSchema, setResultSchema] = useState<Record<string, { type: string; description?: string; required?: boolean }>>({});
  const [savingSchema, setSavingSchema] = useState(false);
  const [deletingSchema, setDeletingSchema] = useState(false);

  // Load existing parameters and schema in edit mode
  useEffect(() => {
    if (mode === 'edit' && tool?.parameters) {
      setParameters(tool.parameters.map(param => ({
        name: param.name,
        type: zodSchemaToType(param.zodSchema),
        description: param.description || '',
        required: param.required,
      })));
    }
    if (mode === 'edit' && tool?.resultSchema) {
      try {
        const parsed = JSON.parse(tool.resultSchema);
        setResultSchema(parsed);
      } catch (err) {
        console.error('Failed to parse result schema:', err);
      }
    }
  }, [mode, tool]);

  const zodSchemaToType = (zodSchema: string): string => {
    try {
      const parsed = JSON.parse(zodSchema);
      return parsed.type || 'string';
    } catch {
      if (zodSchema.includes('number')) return 'number';
      if (zodSchema.includes('boolean')) return 'boolean';
      if (zodSchema.includes('array')) return 'array';
      if (zodSchema.includes('object')) return 'object';
      return 'string';
    }
  };

  const action = mode === 'create' ? createTool : updateTool;

  const [state, formAction] = useActionState(async (prevState: any, formData: FormData) => {
    // Add parameters as JSON
    formData.set('parameters', JSON.stringify(parameters));

    const result = await action(formData);

    if (result.success) {
      router.push(`/servers/${serverId}/tools`);
      router.refresh();
    }

    return result;
  }, null);

  // Handle type change to show/hide fields
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value;
    setToolType(newType);
  };

  const addParameter = () => {
    setParameters([...parameters, { name: '', type: 'string', description: '', required: true }]);
  };

  const removeParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
  };

  const updateParameter = (index: number, field: string, value: any) => {
    const updated = [...parameters];
    updated[index] = { ...updated[index], [field]: value };
    setParameters(updated);
  };

  const showSqlFields = toolType === 'sql';
  const showRestFields = toolType === 'rest';
  const showJavascriptFields = toolType === 'javascript';
  const showWebhookFields = toolType === 'webhook';

  return (
    <div className="max-w-4xl mx-auto">
      <BackButton fallbackHref={`/servers/${serverId}/tools`} />

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {mode === 'create' ? 'Create New Tool' : 'Edit Tool'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {mode === 'create'
              ? 'Add a new tool to this server. Choose a type and configure it.'
              : 'Update the configuration for this tool.'}
          </p>
        </div>

        <form ref={formRef} action={formAction} className="space-y-4">
          {/* Hidden Fields */}
          <input type="hidden" name="serverId" value={serverId} />
          {mode === 'edit' && tool && (
            <>
              <input type="hidden" name="toolId" value={tool.id} />
              <input type="hidden" name="type" value={tool.type} />
            </>
          )}

          <div className="flex gap-4">
            {/* Tool Name */}
            <div className="flex-grow">
              <ToolNameInput
                id="name"
                name="name"
                placeholder="query_users"
                defaultValue={tool?.name}
                required
              />
            </div>

            {/* Tool Type */}
            <div className="grid gap-2">
              <Label htmlFor="type">
                Tool Type <span className="text-red-500">*</span>
              </Label>
              <select
                id="type"
                name={mode === 'create' ? 'type' : undefined}
                value={toolType}
                onChange={handleTypeChange}
                disabled={mode === 'edit'}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                required={mode === 'create'}
              >
                <option value="sql">SQL - Database Query</option>
                <option value="rest">REST - HTTP API Call</option>
                <option value="webhook">Webhook - Receive Events</option>
                <option value="javascript">JavaScript - Custom Code</option>
              </select>
              {mode === 'edit' && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Tool type cannot be changed after creation
                </p>
              )}
            </div>

            {/* Connection Selector (SQL Only) */}
            {showSqlFields && (
              <div className="grid gap-2">
                <Label htmlFor="connectionId">
                  Database Connection {connections.length > 0 && <span className="text-red-500">*</span>}
                </Label>
                {connections.length > 0 ? (
                  <>
                    <select
                      id="connectionId"
                      name="connectionId"
                      defaultValue={existingConfig && existingConfig.type === 'sql' ? existingConfig.connectionId : ''}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      required
                    >
                      <option value="">Select a connection...</option>
                      {connections.map((conn) => (
                        <option key={conn.id} value={conn.id}>
                          {conn.name} ({conn.type})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Select which database connection to use for this SQL tool
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    No connections available. Please create a connection first from the Connections tab.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Describe what this tool does..."
              defaultValue={tool?.description ?? ''}
              rows={2}
            />
          </div>

          {/* Parameters Section */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Parameters</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addParameter}
              >
                + Add Parameter
              </Button>
            </div>
            {parameters.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                No parameters defined. Click "Add Parameter" to define inputs for this tool.
              </p>
            ) : (
              <div className="space-y-3">
                {parameters.map((param, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="flex gap-2">
                        <div>
                          <ParameterNameInput
                            placeholder="param_name"
                            defaultValue={param.name}
                            name={`parameters[${index}][name]`}
                            className="h-8 text-sm"
                            suggestedStyle={toolType === 'sql' ? 'snake_case' : 'camelCase'}
                            allowStylePicker={true}
                            label=""
                            helperText=""
                            showValidation={false}
                          />
                        </div>
                        <div className='w-[100]'>
                          <Label className="text-xs">Type</Label>
                          <select
                            value={param.type}
                            onChange={(e) => updateParameter(index, 'type', e.target.value)}
                            className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-sm"
                          >
                            <option value="string">String</option>
                            <option value="number">Number</option>
                            <option value="boolean">Boolean</option>
                            <option value="array">Array</option>
                            <option value="object">Object</option>
                          </select>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => removeParameter(index)}
                        className="mt-5"
                      >
                        ✕
                      </Button>
                    </div>
                    <div>
                      <Label className="text-xs">Description</Label>
                      <Input
                        placeholder="Parameter description..."
                        value={param.description}
                        onChange={(e) => updateParameter(index, 'description', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={param.required}
                        onChange={(e) => updateParameter(index, 'required', e.target.checked)}
                        className="h-4 w-4"
                      />
                      <Label className="text-xs">Required</Label>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Use parameters like <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">{'{{param_name}}'}</code> in your queries/URLs
            </p>
          </div>

          {/* Type-Specific Configuration Fields */}
          {showSqlFields && (
            <div className="grid gap-2">
              <Label htmlFor="sqlQuery">
                SQL Query <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="sqlQuery"
                name="sqlQuery"
                placeholder="SELECT * FROM table_name WHERE id = {{user_id}}"
                defaultValue={existingConfig && existingConfig.type === 'sql' ? existingConfig.query : ''}
                rows={10}
                className="font-mono text-sm"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Write your SQL query. Use <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">{'{{param_name}}'}</code> for parameters.
              </p>
            </div>
          )}

          {showRestFields && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="endpoint">
                  Endpoint URL <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="endpoint"
                  name="endpoint"
                  placeholder="https://api.example.com/users/{{user_id}}"
                  defaultValue={existingConfig && existingConfig.type === 'rest' ? existingConfig.url : ''}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="method">
                  HTTP Method <span className="text-red-500">*</span>
                </Label>
                <select
                  id="method"
                  name="method"
                  value={restMethod}
                  onChange={(e) => setRestMethod(e.target.value as RestToolConfig['method'])}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="headers">Headers (JSON)</Label>
                <Textarea
                  id="headers"
                  name="headers"
                  placeholder='{"Content-Type": "application/json"}'
                  defaultValue={existingConfig && existingConfig.type === 'rest' && existingConfig.headers ? JSON.stringify(existingConfig.headers, null, 2) : '{}'}
                  rows={3}
                  className="font-mono text-sm"
                />
              </div>

              {restMethod !== 'GET' && (
                <div className="grid gap-2">
                  <Label htmlFor="body">Request Body (JSON)</Label>
                  <Textarea
                    id="body"
                    name="body"
                    placeholder='{"key": "{{param_value}}"}'
                    defaultValue={existingConfig && existingConfig.type === 'rest' && existingConfig.body ? JSON.stringify(existingConfig.body, null, 2) : '{}'}
                    rows={4}
                    className="font-mono text-sm"
                  />
                </div>
              )}
            </>
          )}

          {showJavascriptFields && (
            <div className="grid gap-2">
              <Label htmlFor="jsCode">
                JavaScript Code <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="jsCode"
                name="jsCode"
                placeholder="// Your JavaScript code here&#10;return { result: 'success' };"
                defaultValue={existingConfig && existingConfig.type === 'javascript' ? existingConfig.code : ''}
                rows={12}
                className="font-mono text-sm"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Write JavaScript code. Access parameters via <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">params</code> object.
              </p>
            </div>
          )}

          {showWebhookFields && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="webhookPath">
                  Webhook Path <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="webhookPath"
                  name="webhookPath"
                  placeholder="payment/:paymentId or simply sedap"
                  defaultValue={existingConfig && existingConfig.type === 'webhook' ? stripWebhookPrefix(existingConfig.path) : ''}
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Path for this webhook. <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">/webhook/</code> prefix is auto-added. Supports dynamic parameters using :paramName
                  <br />
                  <strong>Examples:</strong> <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">stripe-payment</code>, <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">user/:userId/action</code>
                  <br />
                  <strong>Full URL will be:</strong> <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">/api/webhook/your-path</code>
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="webhookHandler">
                  Handler Code <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="webhookHandler"
                  name="webhookHandler"
                  placeholder={`// Access incoming data via params object
// Path params: params.tenantId, params.userId
// Payload: params.body
// Headers: params.headers
// Query: params.query

const event = params.body;
const signature = params.headers['x-signature'];

if (!signature) {
  return { status: 401, error: 'No signature' };
}

// Process webhook event
if (event.type === 'payment_success') {
  return {
    success: true,
    message: \`Payment \${event.id} processed\`
  };
}

return { success: true };`}
                  defaultValue={existingConfig && existingConfig.type === 'webhook' ? existingConfig.handler : ''}
                  rows={16}
                  className="font-mono text-sm"
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  JavaScript code to process webhook data. Access incoming data via{' '}
                  <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">params</code> object
                  <br />
                  <strong>Available:</strong> params.body (payload), params.headers, params.query, params.method, and path parameters
                </p>
              </div>
            </>
          )}

          {/* Result Schema Editor (SQL Tools Only, Edit Mode) */}
          {mode === 'edit' && tool && toolType === 'sql' && (
            <div className="grid gap-2">
              <Label className="text-base font-semibold">Result Schema</Label>
              {Object.keys(resultSchema).length > 0 ? (
                <>
                  <SchemaEditor
                    schema={resultSchema}
                    onChange={setResultSchema}
                    editable={true}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        setSavingSchema(true);
                        try {
                          const result = await updateToolSchema(tool.id, resultSchema);
                          if (result.success) {
                            toast({
                              variant: 'success',
                              title: 'Schema Updated',
                              description: 'Schema updated successfully',
                            });
                          } else {
                            toast({
                              variant: 'error',
                              title: 'Error',
                              description: result.error || 'Failed to update schema',
                            });
                          }
                        } catch (err: any) {
                          toast({
                            variant: 'error',
                            title: 'Error',
                            description: err.message,
                          });
                        } finally {
                          setSavingSchema(false);
                        }
                      }}
                      disabled={savingSchema || deletingSchema}
                    >
                      {savingSchema ? 'Saving Schema...' : 'Save Schema'}
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      onClick={async () => {
                        if (!confirm('Are you sure you want to delete the schema? This action cannot be undone.')) {
                          return;
                        }
                        setDeletingSchema(true);
                        try {
                          const result = await deleteToolSchema(tool.id);
                          if (result.success) {
                            setResultSchema({});
                            toast({
                              variant: 'success',
                              title: 'Schema Deleted',
                              description: 'Schema deleted successfully',
                            });
                          } else {
                            toast({
                              variant: 'error',
                              title: 'Error',
                              description: result.error || 'Failed to delete schema',
                            });
                          }
                        } catch (err: any) {
                          toast({
                            variant: 'error',
                            title: 'Error',
                            description: err.message,
                          });
                        } finally {
                          setDeletingSchema(false);
                        }
                      }}
                      disabled={savingSchema || deletingSchema}
                    >
                      {deletingSchema ? 'Deleting Schema...' : 'Clear Schema'}
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No schema captured yet. Run a test to automatically capture the result schema.
                </p>
              )}
            </div>
          )}

          {/* Test Tool Button (Edit Mode Only) */}
          {mode === 'edit' && tool && (
            <div className="grid gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/servers/${serverId}/tools/${tool.id}/test`)}
              >
                Test Tool
              </Button>
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
              onClick={() => router.push(`/servers/${serverId}/tools`)}
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

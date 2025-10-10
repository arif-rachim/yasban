'use client';

import { useState, useEffect, useRef, useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { WizardContainer } from '@/components/wizard/WizardContainer';
import { WizardStep } from '@/components/wizard/WizardStep';
import { WizardNavigation } from '@/components/wizard/WizardNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ToolNameInput } from '@/components/ui/tool-name-input';
import { ParameterNameInput } from '@/components/ui/parameter-name-input';
import { useToast } from '@/components/ui/use-toast';
import { createTool } from '@/app/servers/[id]/tools/actions';
import { ToolTester } from '@/components/ToolTester';

interface Server {
  id: string;
  name: string;
  status: string;
}

interface Connection {
  id: string;
  name: string;
  type: string;
}

interface ToolCreationWizardProps {
  toolType: 'sql' | 'rest' | 'webhook' | 'javascript';
  servers: Server[];
  selectedServerId?: string;
  selectedConnectionId?: string;
  connections: Connection[];
  currentStep?: string;
}

export function ToolCreationWizard({
  toolType,
  servers,
  selectedServerId,
  selectedConnectionId,
  connections,
  currentStep,
}: ToolCreationWizardProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const { toast } = useToast();

  // Determine wizard steps based on tool type
  const getSteps = () => {
    const baseSteps = [
      { id: 'server', title: 'Select Server', description: 'Choose or create' },
    ];

    if (toolType === 'sql') {
      baseSteps.push({
        id: 'connection',
        title: 'Connection',
        description: 'Database connection',
      });
    }

    baseSteps.push(
      { id: 'configure', title: 'Configure', description: 'Tool details' },
      { id: 'test', title: 'Test Tool', description: 'Test & validate' },
      { id: 'review', title: 'Finalize', description: 'Review & confirm' }
    );

    return baseSteps;
  };

  const steps = getSteps();

  // Step state management
  const [currentStepId, setCurrentStepId] = useState(() => {
    if (currentStep) return currentStep;
    // Auto-select server step if not provided
    if (!selectedServerId) return 'server';
    // Auto-select connection step for SQL if needed
    if (toolType === 'sql' && !selectedConnectionId) return 'connection';
    // Otherwise start at configure
    return 'configure';
  });

  const [serverId, setServerId] = useState(selectedServerId || '');
  const [connectionId, setConnectionId] = useState(selectedConnectionId || '');
  const [savedToolId, setSavedToolId] = useState<string | null>(null);
  const [savedTool, setSavedTool] = useState<any | null>(null);

  // Tool configuration state
  const [toolName, setToolName] = useState('');
  const [description, setDescription] = useState('');
  const [sqlQuery, setSqlQuery] = useState('');
  const [restEndpoint, setRestEndpoint] = useState('');
  const [restMethod, setRestMethod] = useState('GET');
  const [restHeaders, setRestHeaders] = useState('{}');
  const [restBody, setRestBody] = useState('{}');
  const [webhookPath, setWebhookPath] = useState('');
  const [jsCode, setJsCode] = useState('');
  const [parameters, setParameters] = useState<Array<{
    name: string;
    type: string;
    description: string;
    required: boolean;
  }>>([]);

  // Update URL when step changes
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('type', toolType);
    if (serverId) params.set('serverId', serverId);
    if (connectionId) params.set('connectionId', connectionId);
    params.set('step', currentStepId);
    router.replace(`/wizard/tool?${params.toString()}`, { scroll: false });
  }, [currentStepId, serverId, connectionId, toolType, router]);

  const getCurrentStepIndex = () => {
    return steps.findIndex((s) => s.id === currentStepId);
  };

  const canGoNext = () => {
    const stepIndex = getCurrentStepIndex();
    if (stepIndex === -1) return false;

    const step = steps[stepIndex];

    if (step.id === 'server') {
      return serverId !== '';
    }

    if (step.id === 'connection') {
      return connectionId !== '';
    }

    // Configure step - form validation will handle required fields
    // Review step - always allow saving
    return true;
  };

  const handleNext = async () => {
    const stepIndex = getCurrentStepIndex();
    const currentStep = steps[stepIndex];

    // Special handling: Save tool when moving from "configure" to "test"
    if (currentStep.id === 'configure' && !savedToolId) {
      // Save the tool first
      if (formRef.current) {
        const formData = new FormData(formRef.current);

        // Add parameters
        formData.set('parameters', JSON.stringify(parameters));

        // Call create action
        const result = await createTool(formData);

        if (result.success && result.data) {
          setSavedToolId(result.data.id);

          // Fetch the complete tool with parameters for testing
          const response = await fetch(`/api/tools/${result.data.id}`);
          if (response.ok) {
            const toolData = await response.json();
            setSavedTool(toolData);
          }

          // Move to test step
          if (stepIndex < steps.length - 1) {
            setCurrentStepId(steps[stepIndex + 1].id);
          }
        } else {
          // Show error - tool creation failed
          toast({
            variant: 'error',
            title: 'Failed to Save Tool',
            description: result.error || 'An error occurred while saving the tool',
          });
        }
        return;
      }
    }

    // Normal navigation for other steps
    if (stepIndex < steps.length - 1) {
      setCurrentStepId(steps[stepIndex + 1].id);
    }
  };

  const handlePrevious = () => {
    const stepIndex = getCurrentStepIndex();
    if (stepIndex > 0) {
      setCurrentStepId(steps[stepIndex - 1].id);
    }
  };

  const handleCancel = () => {
    router.push('/');
  };

  const handleCreateServer = () => {
    const returnUrl = `/wizard/tool?type=${toolType}`;
    router.push(`/servers/new?returnTo=${encodeURIComponent(returnUrl)}`);
  };

  const handleCreateConnection = () => {
    const returnUrl = `/wizard/tool?type=${toolType}&serverId=${serverId}`;
    router.push(
      `/servers/${serverId}/connections/new?returnTo=${encodeURIComponent(returnUrl)}`
    );
  };

  const addParameter = () => {
    setParameters([
      ...parameters,
      { name: '', type: 'string', description: '', required: true },
    ]);
  };

  const removeParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
  };

  const updateParameter = (index: number, field: string, value: any) => {
    const updated = [...parameters];
    updated[index] = { ...updated[index], [field]: value };
    setParameters(updated);
  };

  // Note: Tool is saved when moving from Configure to Test step
  // No need for separate save action in Review step

  // Get tool type label
  const getToolTypeLabel = () => {
    switch (toolType) {
      case 'sql':
        return 'SQL Tool';
      case 'rest':
        return 'REST API Tool';
      case 'webhook':
        return 'Webhook Tool';
      case 'javascript':
        return 'JavaScript Tool';
      default:
        return 'Tool';
    }
  };

  return (
    <WizardContainer
      title={`Create ${getToolTypeLabel()}`}
      description="Follow the steps to create your tool"
      steps={steps}
      currentStepId={currentStepId}
    >
      <form ref={formRef}>
        {/* Hidden fields */}
        <input type="hidden" name="serverId" value={serverId} />
        <input type="hidden" name="type" value={toolType} />
        {toolType === 'sql' && (
          <input type="hidden" name="connectionId" value={connectionId} />
        )}

        {/* Step: Server Selection */}
        {currentStepId === 'server' && (
          <WizardStep
            title="Select Server"
            description="Choose which server this tool belongs to, or create a new one"
          >
            <div className="space-y-4">
              {servers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    No servers found. Create your first server to continue.
                  </p>
                  <Button onClick={handleCreateServer}>Create Server</Button>
                </div>
              ) : (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="server-select">Server</Label>
                    <select
                      id="server-select"
                      value={serverId}
                      onChange={(e) => setServerId(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      required
                    >
                      <option value="">Select a server...</option>
                      {servers.map((server) => (
                        <option key={server.id} value={server.id}>
                          {server.name} ({server.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCreateServer}
                    >
                      + Create New Server
                    </Button>
                  </div>
                </>
              )}
            </div>
            <WizardNavigation
              onNext={handleNext}
              onCancel={handleCancel}
              canGoNext={canGoNext()}
              showPrevious={false}
            />
          </WizardStep>
        )}

        {/* Step: Connection Selection (SQL only) */}
        {currentStepId === 'connection' && toolType === 'sql' && (
          <WizardStep
            title="Select Connection"
            description="Choose a database connection for this SQL tool"
          >
            <div className="space-y-4">
              {connections.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    No connections found for this server. Create a database connection
                    to continue.
                  </p>
                  <Button type="button" onClick={handleCreateConnection}>
                    Create Connection
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="connection-select">Database Connection</Label>
                    <select
                      id="connection-select"
                      value={connectionId}
                      onChange={(e) => setConnectionId(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      required
                    >
                      <option value="">Select a connection...</option>
                      {connections.map((conn) => (
                        <option key={conn.id} value={conn.id}>
                          {conn.name} ({conn.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCreateConnection}
                    >
                      + Create New Connection
                    </Button>
                  </div>
                </>
              )}
            </div>
            <WizardNavigation
              onPrevious={handlePrevious}
              onNext={handleNext}
              onCancel={handleCancel}
              canGoNext={canGoNext()}
            />
          </WizardStep>
        )}

        {/* Step: Configure Tool */}
        {currentStepId === 'configure' && (
          <WizardStep
            title="Configure Tool"
            description="Set up the tool details and parameters"
          >
            <div className="space-y-4">
              {/* Tool Name */}
              <ToolNameInput
                id="name"
                name="name"
                placeholder="query_users"
                defaultValue={toolName}
                onValidationChange={(valid) => {
                  // Track validation state if needed
                }}
                required
              />

              {/* Description */}
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Describe what this tool does..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Type-specific fields */}
              {toolType === 'sql' && (
                <div className="grid gap-2">
                  <Label htmlFor="sqlQuery">
                    SQL Query <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="sqlQuery"
                    name="sqlQuery"
                    placeholder="SELECT * FROM users WHERE id = {{user_id}}"
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                    rows={10}
                    className="font-mono text-sm"
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Use{' '}
                    <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                      {'{{param_name}}'}
                    </code>{' '}
                    for parameters
                  </p>
                </div>
              )}

              {toolType === 'rest' && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="endpoint">
                      Endpoint URL <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="endpoint"
                      name="endpoint"
                      placeholder="https://api.example.com/users/{{user_id}}"
                      value={restEndpoint}
                      onChange={(e) => setRestEndpoint(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="method">HTTP Method</Label>
                    <select
                      id="method"
                      name="method"
                      value={restMethod}
                      onChange={(e) => setRestMethod(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                      value={restHeaders}
                      onChange={(e) => setRestHeaders(e.target.value)}
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
                        value={restBody}
                        onChange={(e) => setRestBody(e.target.value)}
                        rows={4}
                        className="font-mono text-sm"
                      />
                    </div>
                  )}
                </>
              )}

              {toolType === 'webhook' && (
                <div className="grid gap-2">
                  <Label htmlFor="webhookPath">
                    Webhook Path <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="webhookPath"
                    name="webhookPath"
                    placeholder="/webhook/my-hook"
                    value={webhookPath}
                    onChange={(e) => setWebhookPath(e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    The URL path where this webhook will receive events
                  </p>
                </div>
              )}

              {toolType === 'javascript' && (
                <div className="grid gap-2">
                  <Label htmlFor="jsCode">
                    JavaScript Code <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="jsCode"
                    name="jsCode"
                    placeholder="// Your JavaScript code here&#10;return { result: 'success' };"
                    value={jsCode}
                    onChange={(e) => setJsCode(e.target.value)}
                    rows={12}
                    className="font-mono text-sm"
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Access parameters via{' '}
                    <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                      params
                    </code>{' '}
                    object
                  </p>
                </div>
              )}

              {/* Parameters */}
              <div className="grid gap-2 pt-4">
                <div className="flex items-center justify-between">
                  <Label>Parameters</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addParameter}>
                    + Add Parameter
                  </Button>
                </div>
                {parameters.length === 0 ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    No parameters defined. Click "Add Parameter" to define inputs.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {parameters.map((param, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2"
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex gap-2 flex-1">
                            <div>
                              <ParameterNameInput
                                placeholder="param_name"
                                value={param.name}
                                onChange={(e) =>
                                  updateParameter(index, 'name', e.target.value)
                                }
                                name={`parameters[${index}][name]`}
                                className="h-8 text-sm"
                                suggestedStyle={toolType === 'sql' ? 'snake_case' : 'camelCase'}
                                allowStylePicker={true}
                                label=""
                                helperText=""
                                showValidation={false}
                              />
                            </div>
                            <div className="w-[100px]">
                              <Label className="text-xs">Type</Label>
                              <select
                                value={param.type}
                                onChange={(e) =>
                                  updateParameter(index, 'type', e.target.value)
                                }
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
                            onChange={(e) =>
                              updateParameter(index, 'description', e.target.value)
                            }
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={param.required}
                            onChange={(e) =>
                              updateParameter(index, 'required', e.target.checked)
                            }
                            className="h-4 w-4"
                          />
                          <Label className="text-xs">Required</Label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <WizardNavigation
              onPrevious={handlePrevious}
              onNext={handleNext}
              onCancel={handleCancel}
              canGoNext={canGoNext()}
            />
          </WizardStep>
        )}

        {/* Step: Test Tool */}
        {currentStepId === 'test' && (
          <WizardStep
            title="Test Your Tool"
            description="Test the tool with different parameters to ensure it works correctly"
          >
            {savedToolId && savedTool ? (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    ✓ Tool saved successfully! You can now test it with different parameter values.
                  </p>
                </div>

                <ToolTester tool={savedTool} serverId={serverId} />
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">
                  Loading tool...
                </p>
              </div>
            )}

            <WizardNavigation
              onPrevious={handlePrevious}
              onNext={handleNext}
              onCancel={handleCancel}
              previousLabel="Back to Configure"
              nextLabel="Continue to Review"
              canGoNext={true}
            />
          </WizardStep>
        )}

        {/* Step: Review */}
        {currentStepId === 'review' && (
          <WizardStep
            title="Review & Finalize"
            description="Review your configuration and finalize the tool"
          >
            <div className="space-y-6">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                <div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Tool Name
                  </div>
                  <div className="text-gray-900 dark:text-gray-100">{toolName}</div>
                </div>

                {description && (
                  <div>
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Description
                    </div>
                    <div className="text-gray-900 dark:text-gray-100">
                      {description}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Type
                  </div>
                  <div className="text-gray-900 dark:text-gray-100">
                    {getToolTypeLabel()}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Server
                  </div>
                  <div className="text-gray-900 dark:text-gray-100">
                    {servers.find((s) => s.id === serverId)?.name || 'Unknown'}
                  </div>
                </div>

                {toolType === 'sql' && connectionId && (
                  <div>
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Connection
                    </div>
                    <div className="text-gray-900 dark:text-gray-100">
                      {connections.find((c) => c.id === connectionId)?.name ||
                        'Unknown'}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Parameters
                  </div>
                  <div className="text-gray-900 dark:text-gray-100">
                    {parameters.length === 0
                      ? 'None'
                      : `${parameters.length} parameter(s) defined`}
                  </div>
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm text-green-800 dark:text-green-200">
                  ✓ Your tool has been created and tested successfully! Click "Finish" to view it in your tools list.
                </p>
              </div>
            </div>
            <WizardNavigation
              onPrevious={handlePrevious}
              previousLabel="Back to Test"
              nextLabel="Finish"
              onNext={() => router.push(`/servers/${serverId}/tools`)}
              canGoNext={true}
              showNext={true}
              showCancel={false}
            />
          </WizardStep>
        )}
      </form>
    </WizardContainer>
  );
}

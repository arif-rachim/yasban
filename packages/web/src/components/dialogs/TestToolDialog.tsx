'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { testTool } from '@/app/servers/[id]/tools/actions';
import { SchemaEditor } from '@/components/forms/SchemaEditor';

interface TestToolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tool: {
    id: string;
    name: string;
    description?: string;
    type: string;
    parameters?: Array<{
      id: string;
      name: string;
      description?: string;
      required: boolean;
      zodSchema: string;
    }>;
  } | null;
}

export function TestToolDialog({
  open,
  onOpenChange,
  tool,
}: TestToolDialogProps) {
  const [paramValues, setParamValues] = useState<Record<string, any>>({});
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleTest = async () => {
    if (!tool) return;

    setTesting(true);
    setResult(null);

    try {
      const testResult = await testTool(tool.id, paramValues);
      setResult(testResult);
    } catch (err: any) {
      setResult({
        success: false,
        error: err.message || 'An unexpected error occurred',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleParamChange = (paramName: string, value: any) => {
    setParamValues({ ...paramValues, [paramName]: value });
  };

  const handleClose = () => {
    setParamValues({});
    setResult(null);
    onOpenChange(false);
  };

  if (!tool) return null;

  const hasParameters = tool.parameters && tool.parameters.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Test Tool: {tool.name}</DialogTitle>
          <DialogDescription>
            {tool.description || 'Execute this tool with test parameters'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Parameters Input */}
          {hasParameters ? (
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Parameters</Label>
              {tool.parameters!.map((param) => (
                <div key={param.id} className="grid gap-2">
                  <Label htmlFor={param.name} className="text-sm">
                    {param.name}
                    {param.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  <Input
                    id={param.name}
                    placeholder={param.description || `Enter ${param.name}...`}
                    value={paramValues[param.name] || ''}
                    onChange={(e) => handleParamChange(param.name, e.target.value)}
                    disabled={testing}
                  />
                  {param.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {param.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              This tool has no parameters. Click "Run Test" to execute.
            </p>
          )}

          {/* Test Button */}
          <Button onClick={handleTest} disabled={testing} className="w-full">
            {testing ? 'Testing...' : 'Run Test'}
          </Button>

          {/* Result Display */}
          {result && result.success && (
            <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                  ✓ {result.message}
                </p>
                {result.duration !== undefined && (
                  <p className="text-xs text-green-600 dark:text-green-500">
                    {result.duration}ms
                  </p>
                )}
              </div>
              {result.rowCount !== undefined && (
                <p className="text-xs text-green-600 dark:text-green-500">
                  {result.rowCount} row{result.rowCount !== 1 ? 's' : ''}
                </p>
              )}
              {result.statusCode !== undefined && (
                <p className="text-xs text-green-600 dark:text-green-500">
                  HTTP {result.statusCode}
                </p>
              )}
              {result.schema && Object.keys(result.schema).length > 0 && (
                <div className="mt-2">
                  <Label className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2 block">
                    Captured Schema:
                  </Label>
                  <div className="bg-white dark:bg-gray-950 rounded border border-green-200 dark:border-green-800">
                    <SchemaEditor schema={result.schema} editable={false} />
                  </div>
                </div>
              )}
              {result.data && (
                <div className="mt-2">
                  <Label className="text-xs font-semibold text-green-700 dark:text-green-400">
                    Result:
                  </Label>
                  <Textarea
                    value={JSON.stringify(result.data, null, 2)}
                    readOnly
                    rows={10}
                    className="mt-1 font-mono text-xs bg-white dark:bg-gray-950 text-green-900 dark:text-green-100"
                  />
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {result && !result.success && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400">
              <p className="font-semibold">✗ {result.message || 'Test Failed'}</p>
              {result.error && <p className="mt-1">{result.error}</p>}
              {result.duration !== undefined && (
                <p className="text-xs mt-1">Duration: {result.duration}ms</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={testing}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

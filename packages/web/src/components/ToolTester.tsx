'use client';

import { useState, useTransition } from 'react';
import { Tool, Parameter, Connection } from '@prisma/client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ResultsViewer } from './ResultsViewer';
import { executeTool, ToolExecutionResult } from '@/app/servers/[id]/tools/[toolId]/test/actions';

interface ToolWithRelations extends Tool {
  parameters: Parameter[];
  connection: { id: string; name: string; type: string } | null;
}

interface ToolTesterProps {
  tool: ToolWithRelations;
  serverId: string;
}

export function ToolTester({ tool, serverId }: ToolTesterProps) {
  const [isPending, startTransition] = useTransition();
  const [paramValues, setParamValues] = useState<Record<string, any>>(() => {
    // Initialize with empty values
    const initial: Record<string, any> = {};
    tool.parameters.forEach((param) => {
      initial[param.name] = '';
    });
    return initial;
  });
  const [result, setResult] = useState<ToolExecutionResult | null>(null);

  const handleParamChange = (name: string, value: string) => {
    setParamValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleRun = () => {
    startTransition(async () => {
      setResult(null);
      const executionResult = await executeTool(tool.id, paramValues);
      setResult(executionResult);
    });
  };

  const handleClear = () => {
    const initial: Record<string, any> = {};
    tool.parameters.forEach((param) => {
      initial[param.name] = '';
    });
    setParamValues(initial);
    setResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Tool Info Card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Tool Type</label>
            <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-1">
              {tool.type}
            </p>
          </div>
          {tool.connection && (
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Connection
              </label>
              <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-1">
                {tool.connection.name} ({tool.connection.type})
              </p>
            </div>
          )}
        </div>

        {tool.description && (
          <div className="mt-4">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Description
            </label>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{tool.description}</p>
          </div>
        )}
      </div>

      {/* Parameters Form */}
      {tool.parameters.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Parameters
          </h2>
          <div className="space-y-4">
            {tool.parameters.map((param) => (
              <div key={param.id}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {param.name}
                  {param.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {param.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {param.description}
                  </p>
                )}
                <Input
                  type="text"
                  value={paramValues[param.name] || ''}
                  onChange={(e) => handleParamChange(param.name, e.target.value)}
                  placeholder={`Enter ${param.name}`}
                  className="w-full"
                  disabled={isPending}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              onClick={handleRun}
              disabled={isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isPending ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Running...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Run Tool
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleClear} disabled={isPending}>
              Clear
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            No parameters configured for this tool.
          </p>
          <div className="flex justify-center mt-4">
            <Button
              onClick={handleRun}
              disabled={isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isPending ? 'Running...' : 'Run Tool'}
            </Button>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Results</h2>
          <ResultsViewer result={result} toolType={tool.type} toolId={tool.id} />
        </div>
      )}
    </div>
  );
}

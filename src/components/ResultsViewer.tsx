'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { SchemaEditor } from './forms/SchemaEditor';
import { useToast } from './ui/use-toast';
import { updateToolSchema } from '@/app/servers/[id]/tools/actions';
import { DataTable } from './ui/data-table';
import { ColumnDef } from '@tanstack/react-table';

interface ResultsViewerProps {
  result: {
    success: boolean;
    data?: any;
    error?: string;
    executionTime?: number;
    rowCount?: number;
    schema?: Record<string, { type: string; description?: string; required?: boolean }>;
  };
  toolType: string;
  toolId: string;
}

export function ResultsViewer({ result, toolType, toolId }: ResultsViewerProps) {
  const [viewMode, setViewMode] = useState<'table' | 'json'>('table');
  const [editableSchema, setEditableSchema] = useState(result.schema || {});
  const [savingSchema, setSavingSchema] = useState(false);
  const { toast } = useToast();

  // Copy to clipboard
  const handleCopy = () => {
    const text = JSON.stringify(result.data, null, 2);
    navigator.clipboard.writeText(text);
  };

  // Download as JSON
  const handleDownload = () => {
    const text = JSON.stringify(result.data, null, 2);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tool-results-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Save schema to tool
  const handleSaveSchema = async () => {
    setSavingSchema(true);
    try {
      const response = await updateToolSchema(toolId, editableSchema);
      if (response.success) {
        toast({
          variant: 'success',
          title: 'Schema Saved',
          description: 'Schema saved successfully to the tool',
        });
      } else {
        toast({
          variant: 'error',
          title: 'Error Saving Schema',
          description: response.error || 'Failed to save schema',
        });
      }
    } catch (error: any) {
      toast({
        variant: 'error',
        title: 'Error',
        description: `Error saving schema: ${error.message}`,
      });
    } finally {
      setSavingSchema(false);
    }
  };

  // Error display
  if (!result.success) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 text-red-500">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
              Execution Failed
            </h3>
            <p className="text-sm text-red-800 dark:text-red-200 font-mono whitespace-pre-wrap">
              {result.error}
            </p>
            {result.executionTime && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                Failed after {result.executionTime}ms
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Success display
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 text-green-500">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
                Execution Successful
              </h3>
              <div className="flex items-center gap-4 mt-1 text-xs text-green-700 dark:text-green-300">
                {result.executionTime && <span>Time: {result.executionTime}ms</span>}
                {result.rowCount !== undefined && <span>Rows: {result.rowCount}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {toolType.toUpperCase() === 'SQL' && Array.isArray(result.data) && result.data.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode(viewMode === 'table' ? 'json' : 'table')}
                >
                  {viewMode === 'table' ? 'JSON View' : 'Table View'}
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={handleCopy}>
              Copy
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              Download
            </Button>
          </div>
        </div>
      </div>

      {/* Schema Section (if available) */}
      {result.schema && Object.keys(result.schema).length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-900">
          <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 block">
            Captured Schema:
          </Label>
          <div className="bg-white dark:bg-gray-950 rounded border border-gray-200 dark:border-gray-700 p-4">
            <SchemaEditor
              schema={editableSchema}
              onChange={setEditableSchema}
              editable={true}
            />
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              onClick={handleSaveSchema}
              disabled={savingSchema}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {savingSchema ? 'Saving...' : 'Save Schema to Tool'}
            </Button>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="flex flex-col p-6">
        {renderResults(result.data, toolType, viewMode)}
      </div>
    </div>
  );
}

function renderResults(data: any, toolType: string, viewMode: 'table' | 'json') {
  // Webhook results
  if (data?.type === 'webhook') {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-4">
          <p className="text-sm text-blue-900 dark:text-blue-100 mb-3">{data.message}</p>
          <div className="space-y-2">
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Webhook URL
              </label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm font-mono">
                  {data.info.url}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(data.info.url)}
                >
                  Copy
                </Button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Method
              </label>
              <p className="text-sm font-mono mt-1">{data.info.method}</p>
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block">
            Example cURL Command
          </label>
          <pre className="bg-gray-900 dark:bg-black text-gray-100 rounded p-4 text-xs font-mono overflow-x-auto">
            {data.curlExample}
          </pre>
        </div>
      </div>
    );
  }

  // REST API results
  if (data?.status !== undefined && toolType.toUpperCase() === 'REST') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Status</label>
            <p className="text-sm font-mono mt-1">
              {data.status} {data.statusText}
            </p>
          </div>
        </div>

        {data.headers && Object.keys(data.headers).length > 0 && (
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block">
              Response Headers
            </label>
            <pre className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-3 text-xs font-mono overflow-x-auto">
              {JSON.stringify(data.headers, null, 2)}
            </pre>
          </div>
        )}

        <div>
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block">
            Response Body
          </label>
          <pre className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-3 text-xs font-mono overflow-x-auto max-h-96">
            {JSON.stringify(data.data, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  // SQL results - Table view
  if (Array.isArray(data) && data.length > 0 && viewMode === 'table') {
    // Dynamically create columns from data keys
    const columns: ColumnDef<any>[] = Object.keys(data[0]).map((key) => ({
      accessorKey: key,
      header: key,
      cell: ({ getValue }) => {
        const value = getValue();
        if (value === null || value === undefined) {
          return <span className="text-gray-400 italic">null</span>;
        }
        if (typeof value === 'object') {
          return <span className="font-mono text-xs text-gray-700 dark:text-gray-300">{JSON.stringify(value)}</span>;
        }
        return <span className="font-mono text-xs text-gray-700 dark:text-gray-300">{String(value)}</span>;
      },
    }));

    return <DataTable columns={columns} data={data} searchPlaceholder="Search results..." />;
  }

  // Default: JSON view
  return (
    <pre className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-4 text-xs font-mono overflow-x-auto max-h-96">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

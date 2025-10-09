'use client';

import { useRouter } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { deleteTool } from './actions';

interface Tool {
  id: string;
  name: string;
  description?: string;
  type: string;
  config: any;
  createdAt: Date;
  parameters?: any[];
}

interface ToolsTableProps {
  serverId: string;
  initialTools: Tool[];
}

export function ToolsTable({ serverId, initialTools }: ToolsTableProps) {
  const router = useRouter();

  const handleDeleteTool = async (toolId: string, toolName: string) => {
    if (!confirm(`Are you sure you want to delete tool "${toolName}"?`)) {
      return;
    }

    try {
      const result = await deleteTool(toolId);
      if (result.success) {
        // Page will auto-refresh due to revalidatePath
        window.location.reload();
      } else {
        alert(`Failed to delete tool: ${result.error}`);
      }
    } catch (err: any) {
      alert(`Error deleting tool: ${err.message}`);
    }
  };

  const columns: ColumnDef<Tool>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => <div className="font-medium">{row.getValue('name')}</div>,
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <span className="px-2 py-1 rounded text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
          {row.getValue('type')}
        </span>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {row.getValue('description') || 'No description'}
        </div>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Created At',
      cell: ({ row }) => (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {new Date(row.getValue('createdAt')).toLocaleDateString()}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const tool = row.original;
        return (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/servers/${serverId}/tools/${tool.id}`)}
            >
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/servers/${serverId}/tools/${tool.id}/test`)}
            >
              Test
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDeleteTool(tool.id, tool.name)}
            >
              Delete
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Tools</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {initialTools.length} tool{initialTools.length !== 1 ? 's' : ''} configured
          </p>
        </div>
        <Button onClick={() => router.push(`/servers/${serverId}/tools/new`)}>
          New Tool
        </Button>
      </div>

      {/* Table */}
      {initialTools.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">No tools yet</p>
          <Button onClick={() => router.push(`/servers/${serverId}/tools/new`)}>
            Create Your First Tool
          </Button>
        </div>
      ) : (
        <DataTable columns={columns} data={initialTools} searchPlaceholder="Search tools..." />
      )}
    </div>
  );
}

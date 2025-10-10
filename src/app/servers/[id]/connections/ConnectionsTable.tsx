'use client';

import { useRouter } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { useToast } from '@/components/ui/use-toast';
import { deleteConnection, testConnection } from './actions';

interface Connection {
  id: string;
  serverId: string;
  name: string;
  type: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ConnectionsTableProps {
  serverId: string;
  initialConnections: Connection[];
}

export function ConnectionsTable({ serverId, initialConnections }: ConnectionsTableProps) {
  const router = useRouter();
  const { toast } = useToast();

  const handleTestConnection = async (connectionId: string) => {
    try {
      const result = await testConnection(connectionId);
      if (result.success) {
        toast({
          variant: 'success',
          title: 'Connection Test Successful',
          description: result.message || 'Connection test successful!',
        });
      } else {
        toast({
          variant: 'error',
          title: 'Connection Test Failed',
          description: result.error || 'Failed to test connection',
        });
      }
    } catch (err: any) {
      toast({
        variant: 'error',
        title: 'Error',
        description: `Error testing connection: ${err.message}`,
      });
    }
  };

  const handleDeleteConnection = async (connectionId: string, connectionName: string) => {
    if (!confirm(`Are you sure you want to delete connection "${connectionName}"?`)) {
      return;
    }

    try {
      const result = await deleteConnection(connectionId);
      if (result.success) {
        // Page will auto-refresh due to revalidatePath
        window.location.reload();
      } else {
        toast({
          variant: 'error',
          title: 'Failed to Delete Connection',
          description: result.error || 'An error occurred while deleting the connection',
        });
      }
    } catch (err: any) {
      toast({
        variant: 'error',
        title: 'Error',
        description: `Error deleting connection: ${err.message}`,
      });
    }
  };

  const columns: ColumnDef<Connection>[] = [
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
      accessorKey: 'createdAt',
      header: 'Created At',
      cell: ({ row }) => (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {new Date(row.getValue('createdAt')).toLocaleDateString()}
        </div>
      ),
    },
    {
      accessorKey: 'updatedAt',
      header: 'Updated At',
      cell: ({ row }) => (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {new Date(row.getValue('updatedAt')).toLocaleDateString()}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const connection = row.original;
        return (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/servers/${serverId}/connections/${connection.id}`)}
            >
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleTestConnection(connection.id)}>
              Test
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDeleteConnection(connection.id, connection.name)}
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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Connections</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {initialConnections.length} connection{initialConnections.length !== 1 ? 's' : ''}{' '}
            configured
          </p>
        </div>
        <Button onClick={() => router.push(`/servers/${serverId}/connections/new`)}>
          New Connection
        </Button>
      </div>

      {/* Table */}
      {initialConnections.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">No connections yet</p>
          <Button onClick={() => router.push(`/servers/${serverId}/connections/new`)}>
            Create Your First Connection
          </Button>
        </div>
      ) : (
        <DataTable columns={columns} data={initialConnections} searchPlaceholder="Search connections..." />
      )}

    </div>
  );
}

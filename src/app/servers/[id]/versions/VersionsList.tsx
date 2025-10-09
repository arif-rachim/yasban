'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { createSnapshot, rollbackToVersion, deleteVersion } from './actions';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Version {
  id: string;
  versionNumber: number;
  description: string | null;
  createdBy: string;
  createdAt: Date;
  configSnapshot: string;
}

interface VersionsListProps {
  serverId: string;
  versions: Version[];
}

export function VersionsList({ serverId, versions }: VersionsListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [rollingBack, setRollingBack] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [snapshotDescription, setSnapshotDescription] = useState('');
  const [showRollbackDialog, setShowRollbackDialog] = useState(false);
  const [rollbackTarget, setRollbackTarget] = useState<{ id: string; number: number } | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; number: number } | null>(null);

  const handleCreateSnapshot = async () => {
    if (creating) return;

    setCreating(true);
    try {
      const result = await createSnapshot(serverId, snapshotDescription || undefined);
      if (result.success) {
        toast({
          variant: 'success',
          title: 'Success',
          description: result.message || 'Snapshot created successfully',
        });
        setShowCreateDialog(false);
        setSnapshotDescription('');
        router.refresh();
      } else {
        toast({
          variant: 'error',
          title: 'Error',
          description: result.error,
        });
      }
    } catch (error: any) {
      toast({
        variant: 'error',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setCreating(false);
    }
  };

  const handleRollback = async () => {
    if (!rollbackTarget || rollingBack) return;

    setRollingBack(rollbackTarget.id);
    try {
      const result = await rollbackToVersion(serverId, rollbackTarget.id);
      if (result.success) {
        toast({
          variant: 'success',
          title: 'Success',
          description: result.message || 'Rollback successful',
        });
        setShowRollbackDialog(false);
        setRollbackTarget(null);
        router.refresh();
      } else {
        toast({
          variant: 'error',
          title: 'Error',
          description: result.error,
        });
      }
    } catch (error: any) {
      toast({
        variant: 'error',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setRollingBack(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return;

    setDeleting(deleteTarget.id);
    try {
      const result = await deleteVersion(deleteTarget.id);
      if (result.success) {
        toast({
          variant: 'success',
          title: 'Success',
          description: result.message || 'Version deleted successfully',
        });
        setShowDeleteDialog(false);
        setDeleteTarget(null);
        router.refresh();
      } else {
        toast({
          variant: 'error',
          title: 'Error',
          description: result.error,
        });
      }
    } catch (error: any) {
      toast({
        variant: 'error',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setDeleting(null);
    }
  };

  const toggleExpanded = (versionId: string) => {
    setExpandedVersion(expandedVersion === versionId ? null : versionId);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const getSnapshotSummary = (configSnapshot: string) => {
    try {
      const snapshot = JSON.parse(configSnapshot);
      const toolCount = snapshot.tools?.length || 0;
      const connCount = snapshot.connections?.length || 0;
      return `${toolCount} tool${toolCount !== 1 ? 's' : ''}, ${connCount} connection${connCount !== 1 ? 's' : ''}`;
    } catch {
      return 'Unable to parse snapshot';
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Snapshots</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {versions.length} snapshot{versions.length !== 1 ? 's' : ''}
            </p>
          </div>

          <Button onClick={() => setShowCreateDialog(true)} disabled={creating}>
            {creating ? 'Creating...' : '+ Create Snapshot'}
          </Button>
        </div>

        {/* Versions list */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {versions.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                No snapshots yet
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Snapshots are automatically created when you create, update, or delete tools and connections.
              </p>
            </div>
          ) : (
            versions.map((version, index) => (
              <div
                key={version.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                        v{version.versionNumber}
                      </span>
                      {index === 0 && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300 text-xs font-medium rounded">
                          Current
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded ${
                          version.createdBy === 'user'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {version.createdBy === 'user' ? 'Manual' : 'Auto'}
                      </span>
                    </div>

                    <p className="text-sm text-gray-900 dark:text-gray-100 mb-1">
                      {version.description || 'No description'}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>{formatDate(version.createdAt)}</span>
                      <span>{getSnapshotSummary(version.configSnapshot)}</span>
                    </div>

                    {/* Expanded snapshot details */}
                    {expandedVersion === version.id && (
                      <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded text-xs">
                        <pre className="overflow-auto max-h-96 text-gray-700 dark:text-gray-300">
                          {JSON.stringify(JSON.parse(version.configSnapshot), null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleExpanded(version.id)}
                    >
                      {expandedVersion === version.id ? 'Hide' : 'View'}
                    </Button>

                    {index !== 0 && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRollbackTarget({ id: version.id, number: version.versionNumber });
                            setShowRollbackDialog(true);
                          }}
                          disabled={!!rollingBack}
                        >
                          {rollingBack === version.id ? 'Rolling back...' : 'Rollback'}
                        </Button>

                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            setDeleteTarget({ id: version.id, number: version.versionNumber });
                            setShowDeleteDialog(true);
                          }}
                          disabled={!!deleting}
                        >
                          {deleting === version.id ? 'Deleting...' : 'Delete'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Snapshot Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Snapshot</DialogTitle>
            <DialogDescription>
              Enter a description for this snapshot (optional).
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={snapshotDescription}
              onChange={(e) => setSnapshotDescription(e.target.value)}
              placeholder="e.g., Before major refactoring"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setSnapshotDescription('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateSnapshot} disabled={creating}>
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rollback Confirmation Dialog */}
      <AlertDialog open={showRollbackDialog} onOpenChange={setShowRollbackDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Rollback</AlertDialogTitle>
            <AlertDialogDescription>
              {rollbackTarget && (
                <>
                  Are you sure you want to rollback to v{rollbackTarget.number}?
                  <br /><br />
                  This will:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Replace current tools and connections with v{rollbackTarget.number}</li>
                    <li>Create a &quot;before rollback&quot; snapshot for safety</li>
                    <li>This action can be undone by rolling back again</li>
                  </ul>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRollback} disabled={!!rollingBack}>
              {rollingBack ? 'Rolling back...' : 'Rollback'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  Are you sure you want to delete v{deleteTarget.number}?
                  <br /><br />
                  <strong>This action cannot be undone.</strong>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={!!deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

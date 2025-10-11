'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
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
import { useToast } from '@/components/ui/use-toast';
import { deleteServer } from '@/app/actions/servers';
import { startServerGUI, stopServerGUI } from '@/app/servers/[id]/actions';
import {
  installService,
  uninstallService,
} from '@/app/servers/[id]/service-actions';

interface ServerHeaderProps {
  server: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    transport: string;
    port: number | null;
    runMode: string;
    serviceInstalled: boolean;
  };
}

export function ServerHeader({ server }: ServerHeaderProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isUninstalling, setIsUninstalling] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const result = await deleteServer(server.id);

      if (result.success) {
        toast({
          variant: 'success',
          title: 'Server Deleted',
          description: result.message || 'Server deleted successfully',
        });

        // Navigate to home page after successful deletion
        router.push('/');
      } else {
        toast({
          variant: 'error',
          title: 'Error',
          description: result.error || 'Failed to delete server',
        });
        setIsDeleting(false);
      }
    } catch (error: any) {
      toast({
        variant: 'error',
        title: 'Error',
        description: error.message || 'Failed to delete server',
      });
      setIsDeleting(false);
    }
  };

  const handleStart = async () => {
    setIsStarting(true);

    try {
      const result = await startServerGUI(server.id);

      if (result.success) {
        toast({
          variant: 'success',
          title: 'Server Started',
          description: result.message || 'Server started successfully',
        });
      } else {
        toast({
          variant: 'error',
          title: 'Failed to Start',
          description: result.error || 'Failed to start server',
        });
      }
    } catch (error: any) {
      toast({
        variant: 'error',
        title: 'Error',
        description: error.message || 'Failed to start server',
      });
    } finally {
      setIsStarting(false);
    }
  };

  const handleStop = async () => {
    setIsStopping(true);

    try {
      const result = await stopServerGUI(server.id);

      if (result.success) {
        toast({
          variant: 'success',
          title: 'Server Stopped',
          description: result.message || 'Server stopped successfully',
        });
      } else {
        toast({
          variant: 'error',
          title: 'Failed to Stop',
          description: result.error || 'Failed to stop server',
        });
      }
    } catch (error: any) {
      toast({
        variant: 'error',
        title: 'Error',
        description: error.message || 'Failed to stop server',
      });
    } finally {
      setIsStopping(false);
    }
  };

  // Service mode handlers
  const handleInstallService = async () => {
    setIsInstalling(true);

    try {
      const result = await installService(server.id);

      if (result.success) {
        toast({
          variant: 'success',
          title: 'Service Installed',
          description: result.message || 'Service installed successfully',
        });
      } else {
        toast({
          variant: 'error',
          title: 'Failed to Install',
          description: result.error || 'Failed to install service',
        });
      }
    } catch (error: any) {
      toast({
        variant: 'error',
        title: 'Error',
        description: error.message || 'Failed to install service',
      });
    } finally {
      setIsInstalling(false);
    }
  };

  const handleUninstallService = async () => {
    setIsUninstalling(true);

    try {
      const result = await uninstallService(server.id);

      if (result.success) {
        toast({
          variant: 'success',
          title: 'Service Uninstalled',
          description: result.message || 'Service uninstalled successfully',
        });
      } else {
        toast({
          variant: 'error',
          title: 'Failed to Uninstall',
          description: result.error || 'Failed to uninstall service',
        });
      }
    } catch (error: any) {
      toast({
        variant: 'error',
        title: 'Error',
        description: error.message || 'Failed to uninstall service',
      });
    } finally {
      setIsUninstalling(false);
    }
  };


  return (
    <>
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {server.name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {server.description || 'No description'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Status Badge - Only show for GUI mode */}
            {server.runMode === 'gui' && (
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  server.status === 'running'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300'
                }`}
              >
                {server.status === 'running' ? '● Running' : '○ Stopped'}
              </span>
            )}

            {/* Transport Badge */}
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
              {server.transport}
            </span>

            {/* Port Badge (only show when running and port is set) */}
            {server.status === 'running' && server.port && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300">
                Port {server.port}
              </span>
            )}

            {/* Conditional Controls based on runMode */}
            {server.runMode === 'gui' ? (
              // GUI Mode: Start/Stop Controls
              server.status === 'stopped' ? (
                <Button
                  size="sm"
                  onClick={handleStart}
                  disabled={isStarting}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isStarting ? 'Starting...' : '▶ Start Server'}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleStop}
                  disabled={isStopping}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {isStopping ? 'Stopping...' : '⏹ Stop Server'}
                </Button>
              )
            ) : (
              // Service Mode: Install/Uninstall only (auto-start configured)
              <>
                {!server.serviceInstalled ? (
                  // Service not installed: Show Install button
                  <Button
                    size="sm"
                    onClick={handleInstallService}
                    disabled={isInstalling}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isInstalling ? 'Installing...' : '📦 Install Service'}
                  </Button>
                ) : (
                  // Service installed: Show badge and Uninstall button
                  <>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300">
                      ✓ Service Installed (Auto-Start)
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleUninstallService}
                      disabled={isUninstalling}
                      className="border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      {isUninstalling ? 'Uninstalling...' : '🗑️ Uninstall Service'}
                    </Button>
                  </>
                )}
              </>
            )}

            {/* Delete Button */}
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
            >
              Delete Server
            </Button>
          </div>
        </div>
      </header>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Server</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{server.name}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              This will permanently delete:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>All tools</li>
              <li>All connections</li>
              <li>All version snapshots</li>
              <li>All logs and environment variables</li>
            </ul>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus-visible:ring-red-500"
            >
              {isDeleting ? 'Deleting...' : 'Delete Server'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

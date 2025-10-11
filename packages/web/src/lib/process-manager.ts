/**
 * Process Manager - Manages MCP Runtime processes in GUI mode
 *
 * Handles spawning and managing child processes for MCP servers.
 * Processes run as children of Next.js and are killed when the app closes.
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import prisma from '@/lib/prisma';
import { createServerLogger, getServerLogPath } from '@/lib/logger';
import { RuntimeExtractor } from './runtime-extractor';

/**
 * ProcessManager - Singleton for managing MCP runtime processes
 */
class ProcessManager {
  private processes = new Map<string, ChildProcess>();

  /**
   * Get path to MCP runtime executable
   *
   * Returns different paths based on environment:
   * - Development: ../../packages/mcp-runtime/dist/index.js (relative workspace path)
   * - Production: %APPDATA%/Yasban/mcp-runtime/index.js (extracted path)
   */
  private getRuntimePath(): string {
    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
      // Development: Use relative path to workspace
      // process.cwd() is packages/web/, so go up to workspace root
      return path.join(
        process.cwd(),
        '..',  // Up to packages/
        '..',  // Up to yasban/ (workspace root)
        'packages',
        'mcp-runtime',
        'dist',
        'index.js'
      );
    } else {
      // Production: Use extracted runtime from user data
      return RuntimeExtractor.getRuntimeExecutable();
    }
  }

  /**
   * Start MCP server in GUI mode (as child process)
   */
  async startGUI(serverId: string, transport: string, port: number): Promise<void> {
    // Check if already running
    if (this.processes.has(serverId)) {
      throw new Error('Server is already running');
    }

    // Create winston logger for this server
    const logger = createServerLogger(serverId);

    // Get runtime path (environment-aware)
    const runtimePath = this.getRuntimePath();

    // Get log file path for unified logging
    const logFilePath = getServerLogPath(serverId);

    logger.info(`Starting MCP server with ${transport} transport on port ${port}`, {
      serverId,
      transport,
      port,
      runtimePath,
      logFilePath,
      environment: process.env.NODE_ENV || 'production',
    });

    // Verify runtime exists
    if (!fs.existsSync(runtimePath)) {
      const errorMsg = `MCP runtime not found at ${runtimePath}. ` +
        (process.env.NODE_ENV === 'development'
          ? `Run 'npm run build:mcp' to build the runtime.`
          : `Please reinstall the application.`);

      logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Spawn MCP runtime process
    const proc = spawn(
      'node',
      [
        runtimePath,
        '--server',
        serverId,
        '--transport',
        transport,
        '--port',
        port.toString(),
        '--log-level',
        'info',
        '--log-file',
        logFilePath,
      ],
      {
        detached: false, // Process dies when parent (Next.js) dies
        stdio: ['ignore', 'pipe', 'pipe'], // Capture stdout/stderr
        cwd: process.cwd(),
      }
    );

    // Store process reference
    this.processes.set(serverId, proc);

    // Handle stdout (info logs)
    proc.stdout?.on('data', (data) => {
      const output = data.toString().trim();
      logger.info(`MCP Runtime: ${output}`);
    });

    // Handle stderr (error logs)
    proc.stderr?.on('data', (data) => {
      const output = data.toString().trim();
      logger.error(`MCP Runtime Error: ${output}`);
    });

    // Handle process exit
    proc.on('exit', async (code, signal) => {
      if (code === 0) {
        logger.info(`MCP server stopped gracefully`, { code, signal });
      } else {
        logger.error(`MCP server crashed`, { code, signal });
      }

      // Remove from active processes
      this.processes.delete(serverId);

      // Update database status to 'stopped' (keep port for next restart)
      try {
        await prisma.server.update({
          where: { id: serverId },
          data: { status: 'stopped' },
        });
      } catch (error) {
        logger.error(`Failed to update server status in database`, { error });
      }
    });

    // Handle process errors
    proc.on('error', (error) => {
      logger.error(`MCP server process error`, { error: error.message, stack: error.stack });
      this.processes.delete(serverId);
    });

    // Wait and verify process is still running (3 seconds to detect port conflicts)
    await new Promise<void>((resolve, reject) => {
      let exited = false;

      const timeout = setTimeout(() => {
        if (!exited && this.processes.has(serverId)) {
          // Process still alive after 3 seconds = success!
          resolve();
        } else if (exited) {
          // Process exited during startup
          reject(new Error('Process exited immediately after start'));
        }
      }, 3000);

      // If process exits during the wait, reject
      proc.once('exit', (code, signal) => {
        exited = true;
        clearTimeout(timeout);
        this.processes.delete(serverId);
        reject(
          new Error(
            `Process exited immediately with code ${code}, signal ${signal}. Check server logs for details.`
          )
        );
      });
    });

    logger.info(`MCP server started successfully`, { serverId, transport, port });
  }

  /**
   * Stop MCP server in GUI mode
   */
  async stopGUI(serverId: string): Promise<void> {
    const logger = createServerLogger(serverId);
    const proc = this.processes.get(serverId);

    if (!proc) {
      // Process not found - it may have already crashed or never started
      logger.warn(`Process not found (may have already exited)`);
      // Don't throw error - just return and let caller update DB
      return;
    }

    logger.info(`Stopping MCP server...`, { serverId });

    // Send SIGTERM to gracefully shutdown
    proc.kill('SIGTERM');

    // Wait for process to exit
    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        // Force kill if not exited after 5 seconds
        if (this.processes.has(serverId)) {
          logger.warn(`Force killing MCP server (did not respond to SIGTERM)`);
          proc.kill('SIGKILL');
        }
        resolve(undefined);
      }, 5000);

      proc.on('exit', () => {
        clearTimeout(timeout);
        resolve(undefined);
      });
    });

    // Remove from active processes
    this.processes.delete(serverId);

    logger.info(`MCP server stopped`, { serverId });
  }

  /**
   * Stop all running processes (called on app shutdown)
   */
  async stopAll(): Promise<void> {
    console.log(`[ProcessManager] Stopping all ${this.processes.size} running MCP servers`);

    const stopPromises: Promise<void>[] = [];

    for (const [serverId, proc] of this.processes) {
      stopPromises.push(
        new Promise((resolve) => {
          console.log(`[ProcessManager] Stopping MCP server ${serverId}`);

          // Send SIGTERM
          proc.kill('SIGTERM');

          // Wait for exit or force kill after timeout
          const timeout = setTimeout(() => {
            if (this.processes.has(serverId)) {
              console.warn(`[ProcessManager] Force killing MCP server ${serverId}`);
              proc.kill('SIGKILL');
            }
            resolve();
          }, 3000);

          proc.on('exit', () => {
            clearTimeout(timeout);
            resolve();
          });
        })
      );
    }

    // Wait for all processes to stop
    await Promise.all(stopPromises);

    // Clear all processes
    this.processes.clear();

    console.log('[ProcessManager] All MCP servers stopped');
  }

  /**
   * Check if a server is currently running
   */
  isRunning(serverId: string): boolean {
    return this.processes.has(serverId);
  }

  /**
   * Get list of running server IDs
   */
  getRunningServers(): string[] {
    return Array.from(this.processes.keys());
  }
}

// Export singleton instance
export const processManager = new ProcessManager();

// Cleanup on process termination
process.on('SIGTERM', async () => {
  console.log('[ProcessManager] Received SIGTERM, stopping all MCP processes...');
  await processManager.stopAll();
});

process.on('SIGINT', async () => {
  console.log('[ProcessManager] Received SIGINT, stopping all MCP processes...');
  await processManager.stopAll();
});

// Cleanup on uncaught errors
process.on('beforeExit', async () => {
  console.log('[ProcessManager] Process exiting, stopping all MCP processes...');
  await processManager.stopAll();
});

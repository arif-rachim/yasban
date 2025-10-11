/**
 * Runtime Paths - Utility for getting MCP runtime paths
 *
 * This module provides path utilities that work in both:
 * - Electron main process (for extraction)
 * - Next.js server context (for spawning processes)
 *
 * Unlike runtime-extractor.ts, this doesn't require the Electron app module.
 */

import path from 'path';
import os from 'os';

/**
 * Get the MCP runtime directory name
 */
export const RUNTIME_DIR_NAME = 'mcp-runtime';

/**
 * Get the runtime path for production (user data directory)
 *
 * Returns:
 * - Windows: C:\Users\User\AppData\Roaming\Yasban\mcp-runtime
 * - macOS: ~/Library/Application Support/Yasban/mcp-runtime
 * - Linux: ~/.config/Yasban/mcp-runtime
 *
 * Note: This uses os.homedir() instead of electron.app.getPath('userData')
 * so it can be used in both Electron and Next.js contexts.
 */
export function getRuntimePath(): string {
  const homeDir = os.homedir();

  let userDataDir: string;
  if (process.platform === 'win32') {
    userDataDir = path.join(homeDir, 'AppData', 'Roaming', 'Yasban');
  } else if (process.platform === 'darwin') {
    userDataDir = path.join(homeDir, 'Library', 'Application Support', 'Yasban');
  } else {
    // Linux and others
    userDataDir = path.join(homeDir, '.config', 'Yasban');
  }

  return path.join(userDataDir, RUNTIME_DIR_NAME);
}

/**
 * Get the path to the main runtime executable
 *
 * Returns:
 * - Windows: C:\Users\User\AppData\Roaming\Yasban\mcp-runtime\index.js
 * - macOS: ~/Library/Application Support/Yasban/mcp-runtime/index.js
 * - Linux: ~/.config/Yasban/mcp-runtime/index.js
 */
export function getRuntimeExecutable(): string {
  return path.join(getRuntimePath(), 'index.js');
}

/**
 * Get the development runtime path (workspace relative)
 *
 * Returns: ../../packages/mcp-runtime/dist/index.js
 */
export function getDevelopmentRuntimePath(): string {
  // process.cwd() is packages/web/
  return path.join(
    process.cwd(),
    '..',  // Up to packages/
    '..',  // Up to yasban/ (workspace root)
    'packages',
    'mcp-runtime',
    'dist',
    'index.js'
  );
}

/**
 * Get the appropriate runtime path based on environment
 *
 * - Development: Uses workspace relative path
 * - Production: Uses extracted user data path
 */
export function getRuntimePathForEnvironment(): string {
  const isDev = process.env.NODE_ENV === 'development';
  return isDev ? getDevelopmentRuntimePath() : getRuntimeExecutable();
}

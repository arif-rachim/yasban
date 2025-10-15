/**
 * Runtime Paths - Utility for getting MCP runtime paths
 *
 * This module provides path utilities for accessing the MCP runtime
 * from the Next.js server context (for spawning MCP processes).
 *
 * Since we're no longer using Electron, the runtime is always accessed
 * from the workspace directory structure.
 */

import path from 'path';

/**
 * Get the runtime path (workspace relative)
 *
 * Returns the path to the MCP runtime executable:
 * - ../../packages/mcp-runtime/dist/index.js (from packages/web/)
 *
 * This works in both development and production since the app
 * runs directly from the workspace (not packaged).
 */
export function getRuntimePathForEnvironment(): string {
  // process.cwd() is packages/web/ when Next.js is running
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

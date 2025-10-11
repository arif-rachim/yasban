/**
 * Common Types - Shared interfaces and types for tool executors
 */

import type { Tool, Connection, Parameter } from '@prisma/client';

/**
 * Tool execution result interface
 * Returned by all tool executors (SQL, REST, Webhook, JavaScript)
 */
export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime?: number;
  rowCount?: number;
  schema?: Record<string, { type: string; description?: string; required?: boolean }>;
  statusCode?: number; // For REST tools
  headers?: Record<string, string>; // For REST tools
}

/**
 * Tool with connection (used by SQL executor)
 */
export interface ToolWithConnection extends Omit<Tool, 'serverId'> {
  connection: Connection | null;
  parameters: Parameter[];
  serverId: string;
}

/**
 * Tool with server ID (used by REST, Webhook, JavaScript executors)
 */
export interface ToolWithServerId extends Omit<Tool, 'serverId'> {
  serverId: string;
}

/**
 * Logger interface (winston-compatible)
 */
export interface Logger {
  info(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}

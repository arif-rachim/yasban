/**
 * Type-safe tool configuration definitions
 *
 * This module provides strongly-typed configuration interfaces for all tool types,
 * using discriminated unions to ensure type safety and prevent field name mismatches.
 */

/**
 * SQL Tool Configuration
 * Used for database queries (PostgreSQL, MySQL, MSSQL, SQLite)
 */
export interface SqlToolConfig {
  type: 'sql';
  connectionId: string;
  query: string;
}

/**
 * REST API Tool Configuration
 * Used for HTTP API calls
 */
export interface RestToolConfig {
  type: 'rest';
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
}

/**
 * Webhook Tool Configuration
 * Used for receiving webhook events
 */
export interface WebhookToolConfig {
  type: 'webhook';
  path: string;
}

/**
 * JavaScript Tool Configuration
 * Used for custom JavaScript execution
 */
export interface JavaScriptToolConfig {
  type: 'javascript';
  code: string;
}

/**
 * Discriminated union of all tool configurations
 * The 'type' field allows TypeScript to narrow the type
 */
export type ToolConfig =
  | SqlToolConfig
  | RestToolConfig
  | WebhookToolConfig
  | JavaScriptToolConfig;

/**
 * Type guard for SQL configuration
 */
export function isSqlConfig(config: ToolConfig): config is SqlToolConfig {
  return config.type === 'sql';
}

/**
 * Type guard for REST configuration
 */
export function isRestConfig(config: ToolConfig): config is RestToolConfig {
  return config.type === 'rest';
}

/**
 * Type guard for Webhook configuration
 */
export function isWebhookConfig(config: ToolConfig): config is WebhookToolConfig {
  return config.type === 'webhook';
}

/**
 * Type guard for JavaScript configuration
 */
export function isJavaScriptConfig(config: ToolConfig): config is JavaScriptToolConfig {
  return config.type === 'javascript';
}

/**
 * Parse tool configuration from JSON string with type safety
 *
 * @param type - The tool type (sql, rest, webhook, javascript)
 * @param configJson - JSON string containing the configuration
 * @returns Typed configuration object
 * @throws Error if JSON parsing fails
 */
export function parseToolConfig(type: string, configJson: string): ToolConfig {
  const parsed = JSON.parse(configJson);

  // Add type discriminator if not present
  const config = { ...parsed, type: type.toLowerCase() };

  return config as ToolConfig;
}

/**
 * Serialize tool configuration to JSON string
 *
 * @param config - Typed configuration object
 * @returns JSON string
 */
export function serializeToolConfig(config: ToolConfig): string {
  return JSON.stringify(config);
}

/**
 * Create a SQL tool configuration
 */
export function createSqlConfig(connectionId: string, query: string): SqlToolConfig {
  return {
    type: 'sql',
    connectionId,
    query,
  };
}

/**
 * Create a REST tool configuration
 */
export function createRestConfig(
  url: string,
  method: RestToolConfig['method'],
  headers?: Record<string, string>,
  body?: any
): RestToolConfig {
  return {
    type: 'rest',
    url,
    method,
    headers,
    body,
  };
}

/**
 * Create a Webhook tool configuration
 */
export function createWebhookConfig(path: string): WebhookToolConfig {
  return {
    type: 'webhook',
    path,
  };
}

/**
 * Create a JavaScript tool configuration
 */
export function createJavaScriptConfig(code: string): JavaScriptToolConfig {
  return {
    type: 'javascript',
    code,
  };
}

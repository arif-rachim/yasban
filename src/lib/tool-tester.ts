import { Client as PgClient } from 'pg';
import mysql from 'mysql2/promise';
import { Connection as TediousConnection, Request as TediousRequest, TYPES } from 'tedious';
import Database from 'better-sqlite3';
import axios from 'axios';
import { createServerLogger } from './logger';
import prisma from './prisma';

interface ToolConfig {
  connectionId?: string;
  query?: string;
  endpoint?: string;
  method?: string;
  headers?: string;
  body?: string;
  path?: string;
  code?: string;
}

interface TestResult {
  success: boolean;
  message: string;
  error?: string;
  duration?: number;
  data?: any;
  rowCount?: number;
  statusCode?: number;
}

/**
 * Mask password based on environment
 * Development: Show actual password
 * Production: Show ***
 */
function maskPassword(password?: string): string {
  if (!password) return '';

  const isDev = process.env.NODE_ENV === 'development';
  return isDev ? password : '***';
}

/**
 * Format connection string for logging
 */
function formatConnectionString(
  protocol: string,
  config: any
): string {
  const { host, port, database, user, password, path: dbPath, baseUrl } = config;

  if (protocol === 'sqlite') {
    return `sqlite://${dbPath}`;
  }

  if (protocol === 'http' || protocol === 'https') {
    return baseUrl || '';
  }

  const maskedPassword = maskPassword(password);
  const userPart = user ? `${user}:${maskedPassword}@` : '';
  const portPart = port ? `:${port}` : '';
  const dbPart = database ? `/${database}` : '';

  return `${protocol}://${userPart}${host}${portPart}${dbPart}`;
}

/**
 * Substitute parameters into a string template
 */
function substituteParameters(template: string, parameters: Record<string, any>): string {
  let result = template;
  debugger;
  for (const [key, value] of Object.entries(parameters)) {
    // Replace {{paramName}} with value
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, String(value));
  }
  return result;
}

/**
 * Test a SQL tool
 */
async function testSQLTool(
  config: ToolConfig,
  parameters: Record<string, any>,
  serverId: string
): Promise<TestResult> {
  const logger = createServerLogger(serverId);
  const startTime = Date.now();

  if (!config.connectionId || !config.query) {
    return {
      success: false,
      message: 'SQL tool requires connectionId and query in config',
      error: 'SQL tool requires connectionId and query in config',
    };
  }

  // Get connection details
  const connection = await prisma.connection.findUnique({
    where: { id: config.connectionId },
  });

  if (!connection) {
    return {
      success: false,
      message: `Connection not found: ${config.connectionId}`,
      error: `Connection not found: ${config.connectionId}`,
    };
  }

  const connectionConfig = JSON.parse(connection.config);
  const connectionType = connection.type;

  // Substitute parameters into query
  const query = substituteParameters(config.query, parameters);

  logger.info('Testing SQL tool', {
    toolType: 'sql',
    connectionType,
    connectionString: formatConnectionString(connectionType, connectionConfig),
    query,
    parameters,
  });

  try {
    let result: any;
    let rowCount = 0;

    if (connectionType === 'postgresql') {
      const client = new PgClient({
        host: connectionConfig.host,
        port: connectionConfig.port || 5432,
        database: connectionConfig.database,
        user: connectionConfig.user,
        password: connectionConfig.password,
        ssl: connectionConfig.ssl ? { rejectUnauthorized: false } : undefined,
        connectionTimeoutMillis: 10000,
      });

      await client.connect();
      const queryResult = await client.query(query);
      result = queryResult.rows;
      rowCount = queryResult.rowCount || 0;
      await client.end();
    } else if (connectionType === 'mysql') {
      const conn = await mysql.createConnection({
        host: connectionConfig.host,
        port: connectionConfig.port || 3306,
        database: connectionConfig.database,
        user: connectionConfig.user,
        password: connectionConfig.password,
        ssl: connectionConfig.ssl ? { rejectUnauthorized: false } : undefined,
        connectTimeout: 10000,
      });

      const [rows] = await conn.query(query);
      result = rows;
      rowCount = Array.isArray(rows) ? rows.length : 0;
      await conn.end();
    } else if (connectionType === 'mssql') {
      result = await new Promise((resolve, reject) => {
        const conn = new TediousConnection({
          server: connectionConfig.host || 'localhost',
          authentication: {
            type: 'default',
            options: {
              userName: connectionConfig.user || '',
              password: connectionConfig.password || '',
            },
          },
          options: {
            port: connectionConfig.port || 1433,
            database: connectionConfig.database,
            encrypt: connectionConfig.ssl || false,
            trustServerCertificate: true,
            connectTimeout: 10000,
          },
        });

        conn.on('connect', (err) => {
          if (err) {
            reject(err);
            return;
          }

          const rows: any[] = [];
          const request = new TediousRequest(query, (err) => {
            conn.close();
            if (err) {
              reject(err);
            } else {
              resolve(rows);
            }
          });

          request.on('row', (columns: any) => {
            const row: any = {};
            columns.forEach((column: any) => {
              row[column.metadata.colName] = column.value;
            });
            rows.push(row);
          });

          conn.execSql(request);
        });

        conn.connect();
      });

      rowCount = result.length;
    } else if (connectionType === 'sqlite') {
      const db = new Database(connectionConfig.path || '');
      result = db.prepare(query).all();
      rowCount = result.length;
      db.close();
    } else {
      return {
        success: false,
        message: `Unsupported connection type: ${connectionType}`,
        error: `Unsupported connection type: ${connectionType}`,
      };
    }

    const duration = Date.now() - startTime;
    logger.info(`✓ SQL tool test successful (${duration}ms)`, {
      rowCount,
      duration,
    });

    return {
      success: true,
      message: `Query executed successfully. Retrieved ${rowCount} row${rowCount !== 1 ? 's' : ''}.`,
      duration,
      data: result,
      rowCount,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error(`✗ SQL tool test failed (${duration}ms)`, {
      error: error.message,
      duration,
    });

    return {
      success: false,
      message: 'SQL query execution failed',
      error: error.message,
      duration,
    };
  }
}

/**
 * Test a REST API tool
 */
async function testRestApiTool(
  config: ToolConfig,
  parameters: Record<string, any>,
  serverId: string
): Promise<TestResult> {
  const logger = createServerLogger(serverId);
  const startTime = Date.now();

  if (!config.endpoint || !config.method) {
    return {
      success: false,
      message: 'REST API tool requires endpoint and method in config',
      error: 'REST API tool requires endpoint and method in config',
    };
  }

  // Substitute parameters
  const endpoint = substituteParameters(config.endpoint, parameters);
  const method = config.method.toUpperCase();
  const headers = config.headers ? JSON.parse(substituteParameters(config.headers, parameters)) : {};
  const body = config.body ? JSON.parse(substituteParameters(config.body, parameters)) : undefined;

  logger.info('Testing REST API tool', {
    toolType: 'rest',
    endpoint,
    method,
    parameters,
  });

  try {
    const response = await axios({
      method: method as any,
      url: endpoint,
      headers,
      data: body,
      timeout: 30000,
      validateStatus: () => true, // Accept any status code
    });

    const duration = Date.now() - startTime;
    logger.info(`✓ REST API tool test successful (${duration}ms)`, {
      statusCode: response.status,
      duration,
    });

    return {
      success: true,
      message: `API request completed with status ${response.status}`,
      duration,
      data: response.data,
      statusCode: response.status,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error(`✗ REST API tool test failed (${duration}ms)`, {
      error: error.message,
      duration,
    });

    return {
      success: false,
      message: 'REST API request failed',
      error: error.message,
      duration,
    };
  }
}

/**
 * Test a webhook tool (mock test)
 */
async function testWebhookTool(
  config: ToolConfig,
  parameters: Record<string, any>,
  serverId: string
): Promise<TestResult> {
  const logger = createServerLogger(serverId);

  if (!config.path) {
    return {
      success: false,
      message: 'Webhook tool requires path in config',
      error: 'Webhook tool requires path in config',
    };
  }

  logger.info('Testing webhook tool (mock)', {
    toolType: 'webhook',
    path: config.path,
  });

  // Webhooks are receivers, so we can't really test them
  // Return a mock success response
  return {
    success: true,
    message: `Webhook would be available at: ${config.path}`,
    duration: 0,
    data: {
      info: 'Webhooks are receivers and cannot be tested directly',
      path: config.path,
      mockPayload: parameters,
    },
  };
}

/**
 * Test a JavaScript transformation tool
 */
async function testJavaScriptTool(
  config: ToolConfig,
  parameters: Record<string, any>,
  serverId: string
): Promise<TestResult> {
  const logger = createServerLogger(serverId);
  const startTime = Date.now();

  if (!config.code) {
    return {
      success: false,
      message: 'JavaScript tool requires code in config',
      error: 'JavaScript tool requires code in config',
    };
  }

  logger.info('Testing JavaScript tool', {
    toolType: 'javascript',
    parameters,
  });

  try {
    // Create a sandboxed function
    // WARNING: This is a basic sandbox. For production, use isolated-vm
    const func = new Function('params', config.code);

    // Execute with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Execution timeout (5s)')), 5000);
    });

    const executionPromise = Promise.resolve(func(parameters));

    const result = await Promise.race([executionPromise, timeoutPromise]);

    const duration = Date.now() - startTime;
    logger.info(`✓ JavaScript tool test successful (${duration}ms)`, {
      duration,
    });

    return {
      success: true,
      message: 'JavaScript code executed successfully',
      duration,
      data: result,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error(`✗ JavaScript tool test failed (${duration}ms)`, {
      error: error.message,
      duration,
    });

    return {
      success: false,
      message: 'JavaScript execution failed',
      error: error.message,
      duration,
    };
  }
}

/**
 * Test a tool based on its type
 *
 * @param type - Tool type (sql, rest, webhook, javascript)
 * @param config - Tool configuration
 * @param parameters - Test parameters
 * @param serverId - Server ID for logging
 * @returns Test result with success status and data
 */
export async function testTool(
  type: string,
  config: ToolConfig,
  parameters: Record<string, any>,
  serverId: string
): Promise<TestResult> {
  switch (type) {
    case 'sql':
      return testSQLTool(config, parameters, serverId);
    case 'rest':
      return testRestApiTool(config, parameters, serverId);
    case 'webhook':
      return testWebhookTool(config, parameters, serverId);
    case 'javascript':
      return testJavaScriptTool(config, parameters, serverId);
    default:
      return {
        success: false,
        message: `Unsupported tool type: ${type}`,
        error: 'Invalid tool type',
      };
  }
}

/**
 * @deprecated Legacy tool testing implementation
 *
 * This file contains the original all-in-one tool testing implementation.
 * It is currently only used by the legacy TestToolDialog component.
 *
 * **For new code, use the modular executors instead:**
 * - src/lib/executors/sql-executor.ts
 * - src/lib/executors/rest-executor.ts
 * - src/lib/executors/webhook-executor.ts
 * - src/lib/executors/javascript-executor.ts
 *
 * **For tool testing UI:**
 * - Use: /servers/[id]/tools/[toolId]/test page
 * - Server Action: src/app/servers/[id]/tools/[toolId]/test/actions.ts
 *
 * This file is kept for backward compatibility but may be removed in a future version.
 */

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
  schema?: Record<string, { type: string; description?: string }>;
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
  for (const [key, value] of Object.entries(parameters)) {
    // Replace {{paramName}} with value
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, String(value));
  }
  return result;
}

/**
 * Infer JSON Schema type from a value
 * Returns: "null", "boolean", "integer", "number", "array", "object", "string"
 */
function inferJsonSchemaType(value: any): string {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'boolean') {
    return 'boolean';
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'integer' : 'number';
  }

  if (Array.isArray(value)) {
    return 'array';
  }

  if (typeof value === 'object') {
    return 'object';
  }

  return 'string';
}

/**
 * Infer schema from query result data
 * Examines the result rows and determines the type for each column
 * Used as fallback when driver field metadata is unavailable
 */
function inferSchema(data: any[]): Record<string, { type: string }> {
  if (!data || data.length === 0) {
    return {};
  }

  const schema: Record<string, { type: string }> = {};
  const firstRow = data[0];

  if (!firstRow || typeof firstRow !== 'object') {
    return {};
  }

  // Get all column names from first row
  const columnNames = Object.keys(firstRow);

  for (const columnName of columnNames) {
    let inferredType = 'string';

    // Try to infer type from first row
    let value = firstRow[columnName];

    // If first row has null/undefined, scan up to 10 rows to find a non-null value
    if (value === null || value === undefined) {
      for (let i = 1; i < Math.min(data.length, 10); i++) {
        if (data[i] && data[i][columnName] !== null && data[i][columnName] !== undefined) {
          value = data[i][columnName];
          break;
        }
      }
    }

    inferredType = inferJsonSchemaType(value);

    schema[columnName] = { type: inferredType };
  }

  return schema;
}

/**
 * Map PostgreSQL data type ID (OID) to JSON Schema type
 * Reference: https://github.com/brianc/node-pg-types
 */
function mapPostgresType(dataTypeID: number): string {
  const typeMap: Record<number, string> = {
    16: 'boolean',      // bool
    20: 'integer',      // int8 (bigint)
    21: 'integer',      // int2 (smallint)
    23: 'integer',      // int4 (integer)
    26: 'integer',      // oid
    700: 'number',      // float4 (real)
    701: 'number',      // float8 (double precision)
    1700: 'number',     // numeric/decimal
    25: 'string',       // text
    1042: 'string',     // bpchar (char)
    1043: 'string',     // varchar
    1082: 'string',     // date
    1083: 'string',     // time
    1114: 'string',     // timestamp
    1184: 'string',     // timestamptz
    114: 'object',      // json
    3802: 'object',     // jsonb
    1000: 'array',      // _bool (boolean array)
    1005: 'array',      // _int2 (smallint array)
    1007: 'array',      // _int4 (integer array)
    1016: 'array',      // _int8 (bigint array)
    1021: 'array',      // _float4 (real array)
    1022: 'array',      // _float8 (double precision array)
    1009: 'array',      // _text (text array)
  };
  return typeMap[dataTypeID] || 'string';
}

/**
 * Map MySQL column type to JSON Schema type
 * Reference: mysql2 FieldPacket.columnType
 */
function mapMysqlType(columnType: number): string {
  const typeMap: Record<number, string> = {
    1: 'integer',       // TINYINT
    2: 'integer',       // SMALLINT
    3: 'integer',       // INT
    8: 'integer',       // BIGINT
    9: 'integer',       // MEDIUMINT
    4: 'number',        // FLOAT
    5: 'number',        // DOUBLE
    246: 'number',      // DECIMAL/NUMERIC
    0: 'number',        // DECIMAL (old)
    7: 'string',        // TIMESTAMP
    10: 'string',       // DATE
    11: 'string',       // TIME
    12: 'string',       // DATETIME
    13: 'string',       // YEAR
    15: 'string',       // VARCHAR
    253: 'string',      // VARCHAR
    254: 'string',      // CHAR
    249: 'string',      // TINYTEXT
    250: 'string',      // MEDIUMTEXT
    251: 'string',      // LONGTEXT
    252: 'string',      // BLOB/TEXT
    245: 'object',      // JSON
    16: 'boolean',      // BIT (often used for boolean)
  };
  return typeMap[columnType] || 'string';
}

/**
 * Map SQL Server (MSSQL) type name to JSON Schema type
 * Reference: tedious column metadata
 */
function mapMssqlType(typeName: string): string {
  const lowerType = typeName.toLowerCase();

  if (lowerType === 'bit') return 'boolean';

  if (['tinyint', 'smallint', 'int', 'bigint'].includes(lowerType)) {
    return 'integer';
  }

  if (['decimal', 'numeric', 'float', 'real', 'money', 'smallmoney'].includes(lowerType)) {
    return 'number';
  }

  if (['date', 'datetime', 'datetime2', 'smalldatetime', 'time', 'datetimeoffset'].includes(lowerType)) {
    return 'string';
  }

  if (['varchar', 'nvarchar', 'char', 'nchar', 'text', 'ntext', 'xml'].includes(lowerType)) {
    return 'string';
  }

  return 'string';
}

/**
 * Map SQLite type name to JSON Schema type
 * Reference: SQLite affinity types
 */
function mapSqliteType(typeName: string | null): string {
  if (!typeName) return 'string';

  const lowerType = typeName.toLowerCase();

  if (lowerType.includes('int')) return 'integer';
  if (lowerType.includes('real') || lowerType.includes('float') || lowerType.includes('double')) {
    return 'number';
  }
  if (lowerType.includes('bool')) return 'boolean';
  if (lowerType.includes('blob')) return 'string'; // Binary data as string

  return 'string';
}

/**
 * Create schema from database field metadata
 */
function createSchemaFromFields(
  fields: Array<{ name: string; [key: string]: any }>,
  connectionType: string
): Record<string, { type: string }> {
  const schema: Record<string, { type: string }> = {};

  for (const field of fields) {
    let type = 'string';

    if (connectionType === 'postgresql' && 'dataTypeID' in field) {
      type = mapPostgresType(field.dataTypeID);
    } else if (connectionType === 'mysql' && 'columnType' in field) {
      type = mapMysqlType(field.columnType);
    } else if (connectionType === 'mssql' && 'typeName' in field) {
      type = mapMssqlType(field.typeName);
    } else if (connectionType === 'sqlite' && 'type' in field) {
      type = mapSqliteType(field.type);
    }

    schema[field.name] = { type };
  }

  return schema;
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
    let fieldsSchema: Record<string, { type: string }> = {};

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

      // Extract schema from PostgreSQL field metadata
      if (queryResult.fields && queryResult.fields.length > 0) {
        fieldsSchema = createSchemaFromFields(
          queryResult.fields.map(f => ({ name: f.name, dataTypeID: f.dataTypeID })),
          'postgresql'
        );
      }

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

      const [rows, fields] = await conn.query(query);
      result = rows;
      rowCount = Array.isArray(rows) ? rows.length : 0;

      // Extract schema from MySQL field metadata
      if (fields && Array.isArray(fields) && fields.length > 0) {
        fieldsSchema = createSchemaFromFields(
          fields.map((f: any) => ({ name: f.name, columnType: f.columnType })),
          'mysql'
        );
      }

      await conn.end();
    } else if (connectionType === 'mssql') {
      const mssqlResult: { rows: any[]; fields: any[] } = await new Promise((resolve, reject) => {
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
          let columnMetadata: any[] = [];

          const request = new TediousRequest(query, (err) => {
            conn.close();
            if (err) {
              reject(err);
            } else {
              resolve({ rows, fields: columnMetadata });
            }
          });

          request.on('columnMetadata', (columns: any) => {
            columnMetadata = columns.map((col: any) => ({
              name: col.colName,
              typeName: col.type.name,
            }));
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

      result = mssqlResult.rows;
      rowCount = result.length;

      // Extract schema from MSSQL field metadata
      if (mssqlResult.fields && mssqlResult.fields.length > 0) {
        fieldsSchema = createSchemaFromFields(mssqlResult.fields, 'mssql');
      }
    } else if (connectionType === 'sqlite') {
      const db = new Database(connectionConfig.path || '');
      const stmt = db.prepare(query);
      result = stmt.all();
      rowCount = result.length;

      // Extract schema from SQLite column metadata
      const columns = stmt.columns();
      if (columns && columns.length > 0) {
        fieldsSchema = createSchemaFromFields(
          columns.map(c => ({ name: c.name, type: c.type })),
          'sqlite'
        );
      }

      db.close();
    } else {
      return {
        success: false,
        message: `Unsupported connection type: ${connectionType}`,
        error: `Unsupported connection type: ${connectionType}`,
      };
    }

    const duration = Date.now() - startTime;

    // Use driver field metadata schema, fallback to inferSchema if unavailable
    let schema = fieldsSchema;
    if (!schema || Object.keys(schema).length === 0) {
      schema = inferSchema(result); // Fallback for edge cases
    }

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
      schema,
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

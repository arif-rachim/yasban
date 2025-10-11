import { Client as PgClient } from 'pg';
import mysql from 'mysql2/promise';
import { Connection as TediousConnection, Request as TediousRequest, TYPES } from 'tedious';
import Database from 'better-sqlite3';
import { Connection } from '@prisma/client';
import type { ToolExecutionResult, ToolWithConnection } from '../types/common';
import { createServerLogger } from '../utils/logger';
import { replaceInString } from '../utils/parameter-substitution';
import { parseToolConfig, type SqlToolConfig } from '../types/tool-config';

const MAX_ROWS = 1000;
const QUERY_TIMEOUT_MS = 30000;

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
): Record<string, { type: string; required?: boolean }> {
  const schema: Record<string, { type: string; required?: boolean }> = {};

  for (const field of fields) {
    let type = 'string';
    let required: boolean | undefined;

    if (connectionType === 'postgresql' && 'dataTypeID' in field) {
      type = mapPostgresType(field.dataTypeID);
      // PostgreSQL: field.notNull or !field.nullable
      if ('notNull' in field) {
        required = field.notNull === true;
      } else if ('nullable' in field) {
        required = field.nullable === false;
      }
    } else if (connectionType === 'mysql' && 'columnType' in field) {
      type = mapMysqlType(field.columnType);
      // MySQL: Check NOT_NULL_FLAG (bit 0) in flags
      if ('flags' in field && typeof field.flags === 'number') {
        required = (field.flags & 1) !== 0;
      }
    } else if (connectionType === 'mssql' && 'typeName' in field) {
      type = mapMssqlType(field.typeName);
      // MSSQL: field.nullable
      if ('nullable' in field) {
        required = field.nullable === false;
      }
    } else if (connectionType === 'sqlite' && 'type' in field) {
      type = mapSqliteType(field.type);
      // SQLite: field.notnull (0 = nullable, 1 = not null)
      if ('notnull' in field) {
        required = field.notnull === 1;
      }
    }

    schema[field.name] = { type, required };
  }

  return schema;
}

/**
 * Execute SQL query on PostgreSQL
 */
async function executePostgresQuery(
  connection: Connection,
  sql: string,
  parameters: Record<string, any>
): Promise<ToolExecutionResult> {
  const config = JSON.parse(connection.config);
  const client = new PgClient({
    host: config.host,
    port: config.port || 5432,
    database: config.database,
    user: config.user,
    password: config.password,
    ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 10000,
    query_timeout: QUERY_TIMEOUT_MS,
  });

  try {
    await client.connect();

    const processedSql = replaceInString(sql, parameters);
    const result = await client.query(processedSql);

    await client.end();

    // Extract schema from PostgreSQL field metadata
    let schema: Record<string, { type: string; required?: boolean }> = {};
    if (result.fields && result.fields.length > 0) {
      schema = createSchemaFromFields(
        result.fields.map(f => ({
          name: f.name,
          dataTypeID: f.dataTypeID,
          // Note: pg driver doesn't expose nullable info in query results
          // Would need to query information_schema for table metadata
        })),
        'postgresql'
      );
    } else {
      // Fallback to inferring schema from data
      schema = inferSchema(result.rows);
    }

    return {
      success: true,
      data: result.rows.slice(0, MAX_ROWS),
      rowCount: result.rowCount || 0,
      schema,
    };
  } catch (error: any) {
    try {
      await client.end();
    } catch {}

    return {
      success: false,
      error: error.message || 'PostgreSQL query failed',
    };
  }
}

/**
 * Execute SQL query on MySQL
 */
async function executeMySQLQuery(
  connection: Connection,
  sql: string,
  parameters: Record<string, any>
): Promise<ToolExecutionResult> {
  const config = JSON.parse(connection.config);

  try {
    const conn = await mysql.createConnection({
      host: config.host,
      port: config.port || 3306,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
      connectTimeout: 10000,
    });

    const processedSql = replaceInString(sql, parameters);

    const [rows, fields] = await conn.query(processedSql);
    await conn.end();

    const rowsArray = Array.isArray(rows) ? rows : [];

    // Extract schema from MySQL field metadata
    let schema: Record<string, { type: string; required?: boolean }> = {};
    if (fields && Array.isArray(fields) && fields.length > 0) {
      schema = createSchemaFromFields(
        fields.map((f: any) => ({
          name: f.name,
          columnType: f.columnType,
          flags: f.flags, // Contains NOT_NULL_FLAG and other flags
        })),
        'mysql'
      );
    } else {
      // Fallback to inferring schema from data
      schema = inferSchema(rowsArray);
    }

    return {
      success: true,
      data: rowsArray.slice(0, MAX_ROWS),
      rowCount: rowsArray.length,
      schema,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'MySQL query failed',
    };
  }
}

/**
 * Execute SQL query on MSSQL
 */
async function executeMSSQLQuery(
  connection: Connection,
  sql: string,
  parameters: Record<string, any>
): Promise<ToolExecutionResult> {
  const config = JSON.parse(connection.config);

  return new Promise((resolve) => {
    const conn = new TediousConnection({
      server: config.host || 'localhost',
      authentication: {
        type: 'default',
        options: {
          userName: config.user || '',
          password: config.password || '',
        },
      },
      options: {
        port: config.port || 1433,
        database: config.database,
        encrypt: config.ssl || false,
        trustServerCertificate: true,
        connectTimeout: 10000,
        requestTimeout: QUERY_TIMEOUT_MS,
      },
    });

    conn.on('connect', (err) => {
      if (err) {
        resolve({
          success: false,
          error: err.message || 'MSSQL connection failed',
        });
        return;
      }

      // Replace parameter placeholders with @paramName
      let processedSql = sql;
      Object.keys(parameters).forEach((name) => {
        // Match $paramName, ${paramName}, or {{paramName}}
        const patterns = [
          new RegExp(`\\$${name}\\b`, 'g'),           // $paramName
          new RegExp(`\\$\\{${name}\\}`, 'g'),        // ${paramName}
          new RegExp(`\\{\\{${name}\\}\\}`, 'g'),     // {{paramName}}
        ];

        patterns.forEach((regex) => {
          processedSql = processedSql.replace(regex, `@${name}`);
        });
      });

      const request = new TediousRequest(processedSql, (err, rowCount) => {
        conn.close();

        if (err) {
          resolve({
            success: false,
            error: err.message || 'MSSQL query failed',
          });
        }
      });

      // Add parameters
      Object.entries(parameters).forEach(([name, value]) => {
        request.addParameter(name, TYPES.NVarChar, value);
      });

      const rows: any[] = [];
      let columnMetadata: any[] = [];

      // Capture column metadata
      request.on('columnMetadata', (columns: any) => {
        columnMetadata = columns.map((col: any) => ({
          name: col.colName,
          typeName: col.type.name,
          nullable: col.nullable, // MSSQL provides nullable property
        }));
      });

      request.on('row', (columns: any) => {
        const row: any = {};
        columns.forEach((col: any) => {
          row[col.metadata.colName] = col.value;
        });
        rows.push(row);
      });

      request.on('requestCompleted', () => {
        // Extract schema from MSSQL field metadata
        let schema: Record<string, { type: string; required?: boolean }> = {};
        if (columnMetadata && columnMetadata.length > 0) {
          schema = createSchemaFromFields(columnMetadata, 'mssql');
        } else {
          // Fallback to inferring schema from data
          schema = inferSchema(rows);
        }

        resolve({
          success: true,
          data: rows.slice(0, MAX_ROWS),
          rowCount: rows.length,
          schema,
        });
      });

      conn.execSql(request);
    });

    conn.connect();
  });
}

/**
 * Execute SQL query on SQLite
 */
async function executeSQLiteQuery(
  connection: Connection,
  sql: string,
  parameters: Record<string, any>
): Promise<ToolExecutionResult> {
  const config = JSON.parse(connection.config);

  try {
    const db = new Database(config.path || '', { readonly: true });

    const processedSql = replaceInString(sql, parameters);

    const stmt = db.prepare(processedSql);
    const rows = stmt.all();

    // Extract schema from SQLite column metadata
    let schema: Record<string, { type: string; required?: boolean }> = {};
    const columns = stmt.columns();
    if (columns && columns.length > 0) {
      schema = createSchemaFromFields(
        columns.map(c => ({
          name: c.name,
          type: c.type,
          // Note: stmt.columns() doesn't expose notnull info
          // Would need to query PRAGMA table_info() for nullable metadata
        })),
        'sqlite'
      );
    } else {
      // Fallback to inferring schema from data
      schema = inferSchema(rows);
    }

    db.close();

    const rowsArray = Array.isArray(rows) ? rows : [];
    return {
      success: true,
      data: rowsArray.slice(0, MAX_ROWS),
      rowCount: rowsArray.length,
      schema,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'SQLite query failed',
    };
  }
}

/**
 * Execute SQL tool
 */
export async function executeSQLTool(
  tool: ToolWithConnection,
  parameters: Record<string, any>
): Promise<ToolExecutionResult> {
  const logger = createServerLogger(tool.serverId);
  const startTime = Date.now();

  if (!tool.connection) {
    logger.error('SQL tool execution failed - no connection', {
      toolId: tool.id,
      toolName: tool.name,
    });
    return {
      success: false,
      error: 'No connection configured for this SQL tool',
    };
  }

  // Parse config to get query
  const config = parseToolConfig('sql', tool.config) as SqlToolConfig;
  const sql = config.query || '';
  if (!sql) {
    logger.error('SQL tool execution failed - no query', {
      toolId: tool.id,
      toolName: tool.name,
    });
    return {
      success: false,
      error: 'No SQL query configured',
    };
  }

  logger.info('Executing SQL tool', {
    toolId: tool.id,
    toolName: tool.name,
    connectionType: tool.connection.type,
    query: sql,
    parameters,
  });

  // Route to appropriate database executor
  let result: ToolExecutionResult;
  switch (tool.connection.type) {
    case 'postgresql':
      result = await executePostgresQuery(tool.connection, sql, parameters);
      break;
    case 'mysql':
      result = await executeMySQLQuery(tool.connection, sql, parameters);
      break;
    case 'mssql':
      result = await executeMSSQLQuery(tool.connection, sql, parameters);
      break;
    case 'sqlite':
      result = await executeSQLiteQuery(tool.connection, sql, parameters);
      break;
    default:
      result = {
        success: false,
        error: `Unsupported database type: ${tool.connection.type}`,
      };
  }

  const duration = Date.now() - startTime;

  if (result.success) {
    logger.info('✓ SQL tool execution successful', {
      toolId: tool.id,
      toolName: tool.name,
      duration,
      rowCount: result.rowCount,
    });
  } else {
    logger.error('✗ SQL tool execution failed', {
      toolId: tool.id,
      toolName: tool.name,
      duration,
      error: result.error,
    });
  }

  return result;
}

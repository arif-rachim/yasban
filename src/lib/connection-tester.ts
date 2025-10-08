import { Client as PgClient } from 'pg';
import mysql from 'mysql2/promise';
import { Connection as TediousConnection, Request as TediousRequest } from 'tedious';
import Database from 'better-sqlite3';
import axios from 'axios';
import { createServerLogger } from './logger';

interface ConnectionConfig {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
  path?: string;
  baseUrl?: string;
}

interface TestResult {
  success: boolean;
  message: string;
  error?: string;
  duration?: number;
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
  config: ConnectionConfig
): string {
  const { host, port, database, user, password, path, baseUrl } = config;

  if (protocol === 'sqlite') {
    return `sqlite://${path}`;
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
 * Test a PostgreSQL connection
 */
async function testPostgresConnection(
  config: ConnectionConfig,
  serverId: string
): Promise<TestResult> {
  const logger = createServerLogger(serverId);
  const startTime = Date.now();

  logger.info('Testing PostgreSQL connection', {
    connectionString: formatConnectionString('postgresql', config)
  });

  const client = new PgClient({
    host: config.host,
    port: config.port || 5432,
    database: config.database,
    user: config.user,
    password: config.password,
    ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    await client.query('SELECT 1');
    await client.end();

    const duration = Date.now() - startTime;
    logger.info(`✓ PostgreSQL connection successful (${duration}ms)`, {
      connectionString: formatConnectionString('postgresql', config),
      duration,
    });

    return {
      success: true,
      message: `Successfully connected to PostgreSQL database "${config.database}" at ${config.host}:${config.port}`,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error(`✗ PostgreSQL connection failed (${duration}ms)`, {
      connectionString: formatConnectionString('postgresql', config),
      error: error.message,
      duration,
    });

    return {
      success: false,
      message: 'Failed to connect to PostgreSQL',
      error: error.message,
      duration,
    };
  }
}

/**
 * Test a MySQL connection
 */
async function testMySQLConnection(
  config: ConnectionConfig,
  serverId: string
): Promise<TestResult> {
  const logger = createServerLogger(serverId);
  const startTime = Date.now();

  logger.info('Testing MySQL connection', {
    connectionString: formatConnectionString('mysql', config)
  });

  try {
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port || 3306,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
      connectTimeout: 10000,
    });

    await connection.query('SELECT 1');
    await connection.end();

    const duration = Date.now() - startTime;
    logger.info(`✓ MySQL connection successful (${duration}ms)`, {
      connectionString: formatConnectionString('mysql', config),
      duration,
    });

    return {
      success: true,
      message: `Successfully connected to MySQL database "${config.database}" at ${config.host}:${config.port}`,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error(`✗ MySQL connection failed (${duration}ms)`, {
      connectionString: formatConnectionString('mysql', config),
      error: error.message,
      duration,
    });

    return {
      success: false,
      message: 'Failed to connect to MySQL',
      error: error.message,
      duration,
    };
  }
}

/**
 * Test a Microsoft SQL Server connection
 */
async function testMSSQLConnection(
  config: ConnectionConfig,
  serverId: string
): Promise<TestResult> {
  const logger = createServerLogger(serverId);
  const startTime = Date.now();

  logger.info('Testing MSSQL connection', {
    connectionString: formatConnectionString('mssql', config)
  });

  return new Promise((resolve) => {
    const connection = new TediousConnection({
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
      },
    });

    connection.on('connect', (err) => {
      if (err) {
        const duration = Date.now() - startTime;
        logger.error(`✗ MSSQL connection failed (${duration}ms)`, {
          connectionString: formatConnectionString('mssql', config),
          error: err.message,
          duration,
        });

        resolve({
          success: false,
          message: 'Failed to connect to MSSQL',
          error: err.message,
          duration,
        });
        return;
      }

      // Test query
      const request = new TediousRequest('SELECT 1', (err) => {
        connection.close();

        const duration = Date.now() - startTime;

        if (err) {
          logger.error(`✗ MSSQL query failed (${duration}ms)`, {
            connectionString: formatConnectionString('mssql', config),
            error: err.message,
            duration,
          });

          resolve({
            success: false,
            message: 'Connected but query failed',
            error: err.message,
            duration,
          });
        } else {
          logger.info(`✓ MSSQL connection successful (${duration}ms)`, {
            connectionString: formatConnectionString('mssql', config),
            duration,
          });

          resolve({
            success: true,
            message: `Successfully connected to MSSQL database "${config.database}" at ${config.host}:${config.port}`,
            duration,
          });
        }
      });

      connection.execSql(request);
    });

    connection.connect();
  });
}

/**
 * Test a SQLite connection
 */
async function testSQLiteConnection(
  config: ConnectionConfig,
  serverId: string
): Promise<TestResult> {
  const logger = createServerLogger(serverId);
  const startTime = Date.now();

  logger.info('Testing SQLite connection', {
    connectionString: formatConnectionString('sqlite', config)
  });

  try {
    const db = new Database(config.path || '', { readonly: true });
    db.prepare('SELECT 1').get();
    db.close();

    const duration = Date.now() - startTime;
    logger.info(`✓ SQLite connection successful (${duration}ms)`, {
      connectionString: formatConnectionString('sqlite', config),
      duration,
    });

    return {
      success: true,
      message: `Successfully opened SQLite database at ${config.path}`,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error(`✗ SQLite connection failed (${duration}ms)`, {
      connectionString: formatConnectionString('sqlite', config),
      error: error.message,
      duration,
    });

    return {
      success: false,
      message: 'Failed to open SQLite database',
      error: error.message,
      duration,
    };
  }
}

/**
 * Test a REST API connection
 */
async function testRestApiConnection(
  config: ConnectionConfig,
  serverId: string
): Promise<TestResult> {
  const logger = createServerLogger(serverId);
  const startTime = Date.now();

  logger.info('Testing REST API connection', {
    connectionString: formatConnectionString('https', config)
  });

  try {
    const response = await axios.get(config.baseUrl || '', {
      timeout: 10000,
      validateStatus: () => true, // Accept any status code
    });

    const duration = Date.now() - startTime;
    logger.info(`✓ REST API connection successful (${duration}ms)`, {
      connectionString: formatConnectionString('https', config),
      status: response.status,
      duration,
    });

    return {
      success: true,
      message: `Successfully connected to REST API at ${config.baseUrl} (HTTP ${response.status})`,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error(`✗ REST API connection failed (${duration}ms)`, {
      connectionString: formatConnectionString('https', config),
      error: error.message,
      duration,
    });

    return {
      success: false,
      message: 'Failed to connect to REST API',
      error: error.message,
      duration,
    };
  }
}

/**
 * Test a connection based on its type
 *
 * @param type - Connection type (postgresql, mysql, mssql, sqlite, rest_api)
 * @param config - Connection configuration
 * @param serverId - Server ID for logging
 * @returns Test result with success status and message
 */
export async function testConnection(
  type: string,
  config: ConnectionConfig,
  serverId: string
): Promise<TestResult> {
  switch (type) {
    case 'postgresql':
      return testPostgresConnection(config, serverId);
    case 'mysql':
      return testMySQLConnection(config, serverId);
    case 'mssql':
      return testMSSQLConnection(config, serverId);
    case 'sqlite':
      return testSQLiteConnection(config, serverId);
    case 'rest_api':
      return testRestApiConnection(config, serverId);
    default:
      return {
        success: false,
        message: `Unsupported connection type: ${type}`,
        error: 'Invalid connection type',
      };
  }
}

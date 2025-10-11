import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import os from 'os';

/**
 * Get the logs directory path
 * Uses app data directory: C:\Users\{user}\AppData\Roaming\yasban\logs
 */
export function getLogsDirectory(): string {
  // In development, use local logs directory
  if (process.env.NODE_ENV === 'development') {
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    return logsDir;
  }

  // In production, use app data directory
  const homeDir = os.homedir();
  const appDataDir = process.platform === 'win32'
    ? path.join(homeDir, 'AppData', 'Roaming', 'yasban')
    : process.platform === 'darwin'
    ? path.join(homeDir, 'Library', 'Application Support', 'yasban')
    : path.join(homeDir, '.config', 'yasban');

  const logsDir = path.join(appDataDir, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  return logsDir;
}

/**
 * Create a Winston logger for a specific server
 *
 * @param serverId - The server ID to create logger for
 * @returns Winston logger instance
 */
export function createServerLogger(serverId: string): winston.Logger {
  const logsDir = getLogsDirectory();

  return winston.createLogger({
    level: 'debug',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        let log = `${timestamp} [${level.toUpperCase()}] ${message}`;

        // Add stack trace if error
        if (stack) {
          log += `\n${stack}`;
        }

        // Add metadata if present
        if (Object.keys(meta).length > 0) {
          log += ` ${JSON.stringify(meta)}`;
        }

        return log;
      })
    ),
    transports: [
      // Console transport for development
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} ${level}: ${message}`;
          })
        ),
      }),

      // Daily rotate file transport
      new DailyRotateFile({
        filename: path.join(logsDir, `server-${serverId}-%DATE%.log`),
        datePattern: 'YYYY-MM-DD',
        maxSize: '10m',
        maxFiles: '14d',
        zippedArchive: true,
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
            let log = `${timestamp} [${level.toUpperCase()}] ${message}`;

            if (stack) {
              log += `\n${stack}`;
            }

            if (Object.keys(meta).length > 0) {
              log += ` ${JSON.stringify(meta)}`;
            }

            return log;
          })
        ),
      }),
    ],
  });
}

/**
 * Get the current log file path for a server
 *
 * @param serverId - The server ID
 * @returns Path to the current log file
 */
export function getServerLogPath(serverId: string): string {
  const logsDir = getLogsDirectory();
  const today = new Date().toISOString().split('T')[0];
  return path.join(logsDir, `server-${serverId}-${today}.log`);
}

/**
 * Initialize logs directory on app startup
 * Call this from the main process
 */
export function initializeLogsDirectory(): void {
  try {
    getLogsDirectory();
    console.log('✓ Logs directory initialized');
  } catch (error) {
    console.error('✗ Failed to initialize logs directory:', error);
  }
}

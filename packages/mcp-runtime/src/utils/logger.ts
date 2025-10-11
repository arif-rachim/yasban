/**
 * Logger - Winston-based logger for MCP Runtime
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';

export interface LoggerOptions {
  serverId: string;
  serverName: string;
  logFilePath?: string; // Optional: path to log file for unified logging
}

export function createLogger(options: LoggerOptions): winston.Logger;
export function createLogger(serverId: string, serverName: string, logFilePath?: string): winston.Logger;
export function createLogger(
  optionsOrServerId: LoggerOptions | string,
  serverName?: string,
  logFilePath?: string
): winston.Logger {
  // Handle both call signatures
  const opts: LoggerOptions = typeof optionsOrServerId === 'string'
    ? { serverId: optionsOrServerId, serverName: serverName!, logFilePath }
    : optionsOrServerId;

  const { serverId, serverName: sName, logFilePath: logFile } = opts;

  // Base format for log messages
  const baseFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
      let log = `${timestamp} [${level.toUpperCase()}] ${message}`;

      // Add stack trace if error
      if (stack) {
        log += `\n${stack}`;
      }

      // Add metadata if present (exclude internal winston meta)
      const metaKeys = Object.keys(meta).filter(key => !['serverId', 'serverName', 'component', 'level'].includes(key));
      if (metaKeys.length > 0) {
        const cleanMeta: Record<string, any> = {};
        metaKeys.forEach(key => cleanMeta[key] = meta[key]);
        log += ` ${JSON.stringify(cleanMeta)}`;
      }

      return log;
    })
  );

  const transports: winston.transport[] = [
    // Console output (always enabled for stdout capture)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        baseFormat
      ),
    }),
  ];

  // Add file transport if log file path is provided
  if (logFile) {
    // Ensure log directory exists
    const logDir = path.dirname(logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Extract filename pattern for daily rotation
    const filename = path.basename(logFile);
    const filenameWithoutExt = filename.replace(/\.\w+$/, '');
    const ext = path.extname(logFile);

    transports.push(
      new DailyRotateFile({
        dirname: logDir,
        filename: `${filenameWithoutExt}-%DATE%${ext}`,
        datePattern: 'YYYY-MM-DD',
        maxSize: '10m',
        maxFiles: '14d',
        zippedArchive: false,
        format: baseFormat,
      })
    );
  }

  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    defaultMeta: { serverId, serverName: sName, component: 'mcp-runtime' },
    transports,
  });
}

export type Logger = ReturnType<typeof createLogger>;

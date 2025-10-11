/**
 * Logger - Winston-based logger for MCP Runtime
 */

import winston from 'winston';

export function createLogger(serverId: string, serverName: string) {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { serverId, serverName, component: 'mcp-runtime' },
    transports: [
      // Console output
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
            return `${timestamp} [${level}] ${message} ${metaStr}`;
          })
        ),
      }),
    ],
  });
}

export type Logger = ReturnType<typeof createLogger>;

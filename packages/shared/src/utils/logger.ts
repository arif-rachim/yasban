/**
 * Shared Logger - Simple winston logger for executors
 *
 * This logger can be used by both Next.js app and MCP runtime.
 * Each consumer can create their own logger instance with appropriate metadata.
 */

import winston from 'winston';

/**
 * Create a logger instance for a specific server
 */
export function createServerLogger(serverId: string, serverName?: string) {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: {
      serverId,
      serverName: serverName || serverId,
      component: 'tool-executor'
    },
    transports: [
      // Console output for development
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length > 3 // Skip default meta
              ? JSON.stringify(meta)
              : '';
            return `${timestamp} [${level}] ${message} ${metaStr}`;
          })
        ),
      }),
    ],
  });
}

/**
 * Logger type (winston-compatible)
 */
export type Logger = ReturnType<typeof createServerLogger>;

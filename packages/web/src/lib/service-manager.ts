/**
 * Service Manager - Cross-platform service/daemon management
 *
 * Handles installation, uninstallation, start/stop of MCP runtime as OS services
 * - Windows: Uses node-windows
 * - Linux: Uses node-linux
 * - Mac: Not supported yet
 */

import { platform } from 'os';
import { join, resolve } from 'path';
import prisma from './prisma';
import { createServerLogger } from './logger';
import type winston from 'winston';

type ServiceStatus = 'installed' | 'not_installed';

interface ServiceConfig {
  serverId: string;
  serverName: string;
  transport: string;
  port: number | null;
}

export class ServiceManager {
  private platform: string;

  constructor() {
    this.platform = platform();
  }

  /**
   * Check if the current platform supports service installation
   */
  isPlatformSupported(): boolean {
    return this.platform === 'win32' || this.platform === 'linux';
  }

  /**
   * Get the OS-specific service name
   */
  getServiceName(serverName: string): string {
    // Sanitize server name for service naming (remove spaces, special chars)
    const sanitized = serverName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
    return `yasban-${sanitized}`;
  }

  /**
   * Install the service
   */
  async install(config: ServiceConfig): Promise<void> {
    const logger = createServerLogger(config.serverId);

    logger.info(`Starting service installation for ${config.serverName}`, {
      serverId: config.serverId,
      transport: config.transport,
      port: config.port,
      platform: this.platform,
    });

    if (!this.isPlatformSupported()) {
      const error = `Service installation not supported on ${this.platform}`;
      logger.error(error);
      throw new Error(error);
    }

    const serviceName = this.getServiceName(config.serverName);
    logger.info(`Service name: ${serviceName}`);

    try {
      logger.info(`Installing service on ${this.platform}...`);

      // Note: We don't check admin privileges here - let node-windows trigger UAC
      // Windows will show UAC prompt automatically when service installation is attempted

      if (this.platform === 'win32') {
        await this.installWindows(config, serviceName, logger);
      } else if (this.platform === 'linux') {
        await this.installLinux(config, serviceName, logger);
      }

      logger.info('Service installed successfully, updating database...');

      // Update database to mark service as installed
      await prisma.server.update({
        where: { id: config.serverId },
        data: {
          serviceInstalled: true,
          serviceName: serviceName,
        },
      });

      logger.info('Service installation completed successfully', {
        serviceName,
        serverId: config.serverId,
      });
    } catch (error: any) {
      logger.error('Service installation failed', {
        error: error.message,
        stack: error.stack,
      });

      // Check if it's a permission error and provide helpful message
      let errorMessage = error.message;
      if (error.message?.includes('EPERM') || error.message?.includes('permission') || error.message?.includes('Access is denied')) {
        errorMessage = 'Service installation requires administrator privileges. The UAC prompt may have been declined or the application needs to be run as Administrator.';
      }

      throw new Error(`Failed to install service: ${errorMessage}`);
    }
  }

  /**
   * Uninstall the service
   */
  async uninstall(serverId: string): Promise<void> {
    const logger = createServerLogger(serverId);

    logger.info('Starting service uninstallation', { serverId, platform: this.platform });

    if (!this.isPlatformSupported()) {
      const error = `Service uninstallation not supported on ${this.platform}`;
      logger.error(error);
      throw new Error(error);
    }

    try {
      const server = await prisma.server.findUnique({
        where: { id: serverId },
        select: { serviceName: true, serviceInstalled: true },
      });

      if (!server || !server.serviceInstalled || !server.serviceName) {
        const error = 'Service is not installed';
        logger.warn(error);
        throw new Error(error);
      }

      logger.info(`Uninstalling service: ${server.serviceName}`);

      if (this.platform === 'win32') {
        await this.uninstallWindows(server.serviceName, logger);
      } else if (this.platform === 'linux') {
        await this.uninstallLinux(server.serviceName, logger);
      }

      logger.info('Service uninstalled successfully, updating database...');

      // Update database to mark service as uninstalled
      await prisma.server.update({
        where: { id: serverId },
        data: {
          serviceInstalled: false,
          serviceName: null,
          status: 'stopped', // Reset status since service is removed
        },
      });

      logger.info('Service uninstallation completed successfully', { serverId });
    } catch (error: any) {
      logger.error('Service uninstallation failed', {
        error: error.message,
        stack: error.stack,
      });
      throw new Error(`Failed to uninstall service: ${error.message}`);
    }
  }


  /**
   * Get service status (installed or not)
   * Services configured with auto-start will automatically start on system boot
   */
  async getStatus(serverId: string): Promise<ServiceStatus> {
    const logger = createServerLogger(serverId);

    try {
      logger.info('Checking service installation status', { serverId });

      const server = await prisma.server.findUnique({
        where: { id: serverId },
        select: { serviceName: true, serviceInstalled: true },
      });

      if (!server || !server.serviceInstalled || !server.serviceName) {
        logger.info('Service not installed');
        return 'not_installed';
      }

      logger.info(`Service installed: ${server.serviceName}`);
      return 'installed';
    } catch (error: any) {
      logger.error('Error getting service status', {
        error: error.message,
        stack: error.stack,
      });
      return 'not_installed';
    }
  }

  // ============================================
  // Windows-specific methods
  // ============================================

  private async installWindows(config: ServiceConfig, serviceName: string, logger: winston.Logger): Promise<void> {
    let nodeWindows;
    try {
      nodeWindows = require('node-windows');
    } catch (error) {
      const message = 'node-windows module not found. Please install it: npm install node-windows';
      logger.error(message);
      throw new Error(message);
    }
    const Service = nodeWindows.Service;

    // Get the path to the mcp-runtime script
    const scriptPath = this.getMcpRuntimePath();
    logger.info(`MCP Runtime path: ${scriptPath}`);

    // Calculate absolute database path
    const workspaceRoot = resolve(process.cwd(), '..', '..');
    const dbPath = join(workspaceRoot, 'prisma', 'dev.db');
    const absoluteDbUrl = `file:${dbPath.replace(/\\/g, '/')}`;
    logger.info(`Absolute database URL: ${absoluteDbUrl}`);

    // Calculate absolute log file path (using workspace root, not web package directory)
    const logsDir = join(workspaceRoot, 'logs');
    const logFilePath = join(logsDir, `server-${config.serverId}.log`);
    logger.info(`Log file path: ${logFilePath}`);

    // Build CLI arguments
    const args = [
      '--server', config.serverId,
      '--transport', config.transport,
      '--log-file', logFilePath,
    ];

    if (config.port) {
      args.push('--port', config.port.toString());
    }

    logger.info(`Service arguments: ${args.join(' ')}`);

    // Build service description with port, endpoint path, log path, and database path
    let description = '';
    if (config.port) {
      let endpointPath = '';
      if (config.transport === 'sse') {
        endpointPath = '/sse';
      } else if (config.transport === 'streamable-http') {
        endpointPath = '/mcp';
      }
      description = `Port ${config.port}${endpointPath} | Log: ${logFilePath} | DB: ${dbPath}`;
    } else {
      // stdio transport (no port)
      description = `${config.transport} | Log: ${logFilePath} | DB: ${dbPath}`;
    }

    // Create service configuration with auto-start
    const svc = new Service({
      name: serviceName,
      description: description,
      script: scriptPath,
      nodeOptions: [],
      scriptOptions: args.join(' '),
      startMode: 'auto', // Auto-start service on boot
      env: [
        {
          name: 'DATABASE_URL',
          value: absoluteDbUrl,
        },
      ],
    });

    logger.info('Calling Windows Service installer...');
    logger.info('A UAC (User Account Control) prompt should appear - please click "Yes" to allow service installation');

    return new Promise((resolve, reject) => {
      // Set a timeout to detect if UAC was declined
      const timeout = setTimeout(() => {
        logger.warn('Service installation taking longer than expected - UAC prompt may be waiting for user response');
      }, 5000);

      svc.on('install', () => {
        clearTimeout(timeout);
        logger.info(`Windows service ${serviceName} installed successfully`);
        resolve();
      });

      svc.on('error', (error: Error) => {
        clearTimeout(timeout);
        logger.error('Windows service installation error', {
          error: error.message,
          stack: error.stack,
        });
        reject(error);
      });

      try {
        svc.install();
      } catch (error: any) {
        clearTimeout(timeout);
        logger.error('Failed to start service installation', {
          error: error.message,
          stack: error.stack,
        });
        reject(error);
      }
    });
  }

  private async uninstallWindows(serviceName: string, logger: winston.Logger): Promise<void> {
    let nodeWindows;
    try {
      nodeWindows = require('node-windows');
    } catch (error) {
      const message = 'node-windows module not found. Please install it: npm install node-windows';
      logger.error(message);
      throw new Error(message);
    }
    const Service = nodeWindows.Service;

    const scriptPath = this.getMcpRuntimePath();
    logger.info(`Uninstalling Windows service: ${serviceName}`);
    logger.info(`Script path: ${scriptPath}`);

    const svc = new Service({
      name: serviceName,
      script: scriptPath,
    });

    return new Promise((resolve, reject) => {
      svc.on('uninstall', () => {
        logger.info(`Windows service ${serviceName} uninstalled successfully`);
        resolve();
      });

      svc.on('error', (error: Error) => {
        logger.error('Windows service uninstall error', {
          error: error.message,
          stack: error.stack,
        });
        reject(error);
      });

      svc.uninstall();
    });
  }


  // ============================================
  // Linux-specific methods
  // ============================================

  private async installLinux(config: ServiceConfig, serviceName: string, logger: winston.Logger): Promise<void> {
    let nodeLinux;
    try {
      nodeLinux = require('node-linux');
    } catch (error) {
      const message = 'node-linux module not found. This module is only available on Linux systems.';
      logger.error(message);
      throw new Error(message);
    }
    const Service = nodeLinux.Service;

    const scriptPath = this.getMcpRuntimePath();
    logger.info(`MCP Runtime path: ${scriptPath}`);

    // Calculate absolute database path
    const workspaceRoot = resolve(process.cwd(), '..', '..');
    const dbPath = join(workspaceRoot, 'prisma', 'dev.db');
    const absoluteDbUrl = `file:${dbPath}`;
    logger.info(`Absolute database URL: ${absoluteDbUrl}`);

    // Calculate absolute log file path (using workspace root, not web package directory)
    const logsDir = join(workspaceRoot, 'logs');
    const logFilePath = join(logsDir, `server-${config.serverId}.log`);
    logger.info(`Log file path: ${logFilePath}`);

    const args = [
      '--server', config.serverId,
      '--transport', config.transport,
      '--log-file', logFilePath,
    ];

    if (config.port) {
      args.push('--port', config.port.toString());
    }

    logger.info(`Service arguments: ${args.join(' ')}`);

    // Build service description with port, endpoint path, log path, and database path
    let description = '';
    if (config.port) {
      let endpointPath = '';
      if (config.transport === 'sse') {
        endpointPath = '/sse';
      } else if (config.transport === 'streamable-http') {
        endpointPath = '/mcp';
      }
      description = `Port ${config.port}${endpointPath} | Log: ${logFilePath} | DB: ${dbPath}`;
    } else {
      // stdio transport (no port)
      description = `${config.transport} | Log: ${logFilePath} | DB: ${dbPath}`;
    }

    const svc = new Service({
      name: serviceName,
      description: description,
      script: scriptPath,
      scriptOptions: args.join(' '),
      startMode: 'auto', // Auto-start daemon on boot
      env: [
        {
          name: 'DATABASE_URL',
          value: absoluteDbUrl,
        },
      ],
    });

    logger.info('Calling Linux daemon installer...');
    logger.info('Note: This may require sudo privileges');

    return new Promise((resolve, reject) => {
      svc.on('install', () => {
        logger.info(`Linux daemon ${serviceName} installed successfully`);
        resolve();
      });

      svc.on('error', (error: Error) => {
        logger.error('Linux daemon installation error', {
          error: error.message,
          stack: error.stack,
        });
        reject(error);
      });

      svc.install();
    });
  }

  private async uninstallLinux(serviceName: string, logger: winston.Logger): Promise<void> {
    let nodeLinux;
    try {
      nodeLinux = require('node-linux');
    } catch (error) {
      const message = 'node-linux module not found. This module is only available on Linux systems.';
      logger.error(message);
      throw new Error(message);
    }
    const Service = nodeLinux.Service;

    const scriptPath = this.getMcpRuntimePath();
    logger.info(`Uninstalling Linux daemon: ${serviceName}`);
    logger.info(`Script path: ${scriptPath}`);

    const svc = new Service({
      name: serviceName,
      script: scriptPath,
    });

    return new Promise((resolve, reject) => {
      svc.on('uninstall', () => {
        logger.info(`Linux daemon ${serviceName} uninstalled successfully`);
        resolve();
      });

      svc.on('error', (error: Error) => {
        logger.error('Linux daemon uninstall error', {
          error: error.message,
          stack: error.stack,
        });
        reject(error);
      });

      svc.uninstall();
    });
  }


  // ============================================
  // Helper methods
  // ============================================

  /**
   * Get the path to the MCP runtime script
   */
  private getMcpRuntimePath(): string {
    // When running from packages/web, process.cwd() returns .../packages/web
    // We need to go up 2 levels to get to workspace root, then down to mcp-runtime
    const webDir = process.cwd();
    const workspaceRoot = resolve(webDir, '..', '..');
    const mcpRuntimePath = join(workspaceRoot, 'packages', 'mcp-runtime', 'dist', 'index.js');

    return mcpRuntimePath;
  }
}

// Export singleton instance
export const serviceManager = new ServiceManager();

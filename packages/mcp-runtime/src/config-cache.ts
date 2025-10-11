/**
 * Config Cache - Polls database for config changes and caches results
 *
 * Polls the database every 2 seconds to detect config changes via checksum comparison.
 * Emits 'configChanged' event when the config has been modified.
 * Provides cached config to avoid DB hits on every request.
 */

import { EventEmitter } from 'events';
import type { ServerConfig } from './config-loader.js';
import { loadServerConfig, getConfigChecksum } from './config-loader.js';
import type { Logger } from './utils/logger.js';

/**
 * Config cache events
 */
export interface ConfigCacheEvents {
  configChanged: (newConfig: ServerConfig, oldChecksum: string, newChecksum: string) => void;
  error: (error: Error) => void;
}

/**
 * Config cache options
 */
export interface ConfigCacheOptions {
  /** Poll interval in milliseconds (default: 2000 = 2 seconds) */
  pollInterval?: number;
  /** Server ID to monitor */
  serverId: string;
  /** Logger instance */
  logger: Logger;
}

/**
 * ConfigCache - Manages config polling and caching
 */
export class ConfigCache extends EventEmitter {
  private serverId: string;
  private logger: Logger;
  private pollInterval: number;
  private pollingTimer: NodeJS.Timeout | null = null;
  private currentConfig: ServerConfig | null = null;
  private currentChecksum: string | null = null;
  private isPolling = false;

  constructor(options: ConfigCacheOptions) {
    super();
    this.serverId = options.serverId;
    this.logger = options.logger;
    this.pollInterval = options.pollInterval || 2000; // Default 2 seconds
  }

  /**
   * Start polling for config changes
   */
  async start(): Promise<void> {
    if (this.isPolling) {
      this.logger.warn('ConfigCache already started, ignoring duplicate start()');
      return;
    }

    this.logger.info('Starting config cache polling', {
      serverId: this.serverId,
      pollInterval: this.pollInterval,
    });

    // Load initial config
    try {
      await this._loadConfig();
      this.logger.info('Initial config loaded', {
        serverId: this.serverId,
        checksum: this.currentChecksum,
        toolCount: this.currentConfig?.tools.length || 0,
      });
    } catch (error: any) {
      this.logger.error('Failed to load initial config', {
        serverId: this.serverId,
        error: error.message,
      });
      throw error;
    }

    // Start polling
    this.isPolling = true;
    this._schedulePoll();
  }

  /**
   * Stop polling
   */
  stop(): void {
    if (!this.isPolling) {
      return;
    }

    this.logger.info('Stopping config cache polling', {
      serverId: this.serverId,
    });

    this.isPolling = false;

    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  /**
   * Get current cached config
   * Returns null if config hasn't been loaded yet
   */
  getConfig(): ServerConfig | null {
    return this.currentConfig;
  }

  /**
   * Get current checksum
   */
  getChecksum(): string | null {
    return this.currentChecksum;
  }

  /**
   * Force reload config from database (for testing)
   */
  async forceReload(): Promise<void> {
    this.logger.info('Force reloading config', { serverId: this.serverId });
    await this._pollDatabase();
  }

  /**
   * Schedule next poll
   */
  private _schedulePoll(): void {
    if (!this.isPolling) {
      return;
    }

    this.pollingTimer = setTimeout(async () => {
      await this._pollDatabase();
      this._schedulePoll(); // Schedule next poll
    }, this.pollInterval);
  }

  /**
   * Poll database for config changes
   */
  private async _pollDatabase(): Promise<void> {
    if (!this.isPolling) {
      return;
    }

    try {
      // Get current checksum from database
      const newChecksum = await getConfigChecksum(this.serverId);

      // Compare with cached checksum
      if (newChecksum !== this.currentChecksum) {
        const oldChecksum = this.currentChecksum || '(none)';

        this.logger.info('Config change detected', {
          serverId: this.serverId,
          oldChecksum,
          newChecksum,
        });

        // Load new config
        await this._loadConfig();

        // Emit change event
        this.emit('configChanged', this.currentConfig!, oldChecksum, newChecksum);

        this.logger.info('Config reloaded successfully', {
          serverId: this.serverId,
          toolCount: this.currentConfig?.tools.length || 0,
          connectionCount: this.currentConfig?.connections.length || 0,
        });
      }
    } catch (error: any) {
      this.logger.error('Error polling database for config changes', {
        serverId: this.serverId,
        error: error.message,
      });

      // Emit error event
      this.emit('error', error);
    }
  }

  /**
   * Load config from database and update cache
   */
  private async _loadConfig(): Promise<void> {
    const config = await loadServerConfig(this.serverId);
    const checksum = await getConfigChecksum(this.serverId);

    this.currentConfig = config;
    this.currentChecksum = checksum;
  }
}

/**
 * Type-safe event emitter for ConfigCache
 */
export interface ConfigCache {
  on<K extends keyof ConfigCacheEvents>(
    event: K,
    listener: ConfigCacheEvents[K]
  ): this;

  emit<K extends keyof ConfigCacheEvents>(
    event: K,
    ...args: Parameters<ConfigCacheEvents[K]>
  ): boolean;
}

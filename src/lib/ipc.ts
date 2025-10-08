/**
 * IPC API Wrapper for Renderer Process
 * Type-safe wrapper around window.api
 */

// Declare window.api type
declare global {
  interface Window {
    api: {
      servers: {
        list: () => Promise<any>;
        get: (id: string) => Promise<any>;
        create: (data: any) => Promise<any>;
        update: (id: string, data: any) => Promise<any>;
        delete: (id: string) => Promise<any>;
      };
      tools: {
        list: (serverId: string) => Promise<any>;
        get: (id: string) => Promise<any>;
        create: (data: any) => Promise<any>;
        update: (id: string, data: any) => Promise<any>;
        delete: (id: string) => Promise<any>;
      };
      connections: {
        list: (serverId: string) => Promise<any>;
        get: (id: string) => Promise<any>;
        create: (data: any) => Promise<any>;
        update: (id: string, data: any) => Promise<any>;
        delete: (id: string) => Promise<any>;
        test: (id: string) => Promise<any>;
      };
      versions: {
        list: (serverId: string) => Promise<any>;
        create: (serverId: string, description: string) => Promise<any>;
        rollback: (serverId: string, versionNumber: number) => Promise<any>;
      };
      services: {
        install: (serverId: string) => Promise<any>;
        uninstall: (serverId: string) => Promise<any>;
        start: (serverId: string) => Promise<any>;
        stop: (serverId: string) => Promise<any>;
        restart: (serverId: string) => Promise<any>;
        status: (serverId: string) => Promise<any>;
        logs: (serverId: string, lines?: number) => Promise<any>;
      };
      test: {
        execute: (toolId: string, params: any) => Promise<any>;
      };
    };
  }
}

// Export API (with null check for development)
export const api = typeof window !== 'undefined' ? window.api : null;

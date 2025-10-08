import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  // Server operations
  servers: {
    list: () => ipcRenderer.invoke('server:list'),
    get: (id: string) => ipcRenderer.invoke('server:get', id),
    create: (data: any) => ipcRenderer.invoke('server:create', data),
    update: (id: string, data: any) => ipcRenderer.invoke('server:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('server:delete', id),
  },

  // Tool operations
  tools: {
    list: (serverId: string) => ipcRenderer.invoke('tool:list', serverId),
    get: (id: string) => ipcRenderer.invoke('tool:get', id),
    create: (data: any) => ipcRenderer.invoke('tool:create', data),
    update: (id: string, data: any) => ipcRenderer.invoke('tool:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('tool:delete', id),
  },

  // Connection operations
  connections: {
    list: (serverId: string) => ipcRenderer.invoke('connection:list', serverId),
    get: (id: string) => ipcRenderer.invoke('connection:get', id),
    create: (data: any) => ipcRenderer.invoke('connection:create', data),
    update: (id: string, data: any) => ipcRenderer.invoke('connection:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('connection:delete', id),
    test: (id: string) => ipcRenderer.invoke('connection:test', id),
  },

  // Version operations
  versions: {
    list: (serverId: string) => ipcRenderer.invoke('version:list', serverId),
    create: (serverId: string, description: string) =>
      ipcRenderer.invoke('version:create', serverId, description),
    rollback: (serverId: string, versionNumber: number) =>
      ipcRenderer.invoke('version:rollback', serverId, versionNumber),
  },

  // Service operations
  services: {
    install: (serverId: string) => ipcRenderer.invoke('service:install', serverId),
    uninstall: (serverId: string) => ipcRenderer.invoke('service:uninstall', serverId),
    start: (serverId: string) => ipcRenderer.invoke('service:start', serverId),
    stop: (serverId: string) => ipcRenderer.invoke('service:stop', serverId),
    restart: (serverId: string) => ipcRenderer.invoke('service:restart', serverId),
    status: (serverId: string) => ipcRenderer.invoke('service:status', serverId),
    logs: (serverId: string, lines?: number) =>
      ipcRenderer.invoke('service:logs', serverId, lines),
  },

  // Test operations
  test: {
    execute: (toolId: string, params: any) =>
      ipcRenderer.invoke('test:execute', toolId, params),
  },
});

// Note: Type definitions moved to src/lib/ipc.ts

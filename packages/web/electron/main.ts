import { app, BrowserWindow } from 'electron';
import path from 'path';
import { RuntimeExtractor } from './runtime-extractor';

/**
 * Yasban - Electron Main Process
 *
 * Simple viewer shell for the Next.js application.
 * No IPC, no database, no backend logic - just a window.
 */

const isDev = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;

// Single instance lock - prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Yasban - Easy Builder for AI Tools',
    backgroundColor: '#ffffff',
  });

  if (isDev) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL || 'http://localhost:3001');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../out/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Initialize application
 * - Extract MCP runtime on first run (production only)
 * - Future: Check for updates, migrate database, etc.
 */
async function initialize() {
  console.log('[Main] Initializing application...');

  // Extract MCP runtime if needed (production only)
  if (!isDev) {
    if (RuntimeExtractor.needsExtraction()) {
      console.log('[Main] First run detected, extracting MCP runtime...');
      try {
        await RuntimeExtractor.extract();
        console.log('[Main] ✓ MCP runtime extracted successfully');
      } catch (error: any) {
        console.error('[Main] ✗ Failed to extract MCP runtime:', error.message);
        // Show error dialog to user
        // For now, just log - app will fail when trying to start servers
      }
    } else {
      console.log('[Main] MCP runtime already extracted');
      const version = await RuntimeExtractor.getVersion();
      if (version) {
        console.log(`[Main] Runtime version: ${version}`);
      }
    }
  }

  console.log('[Main] ✓ Initialization complete');
}

app.whenReady().then(async () => {
  // Initialize app (extract runtime, check updates, etc.)
  await initialize();

  // Create main window
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

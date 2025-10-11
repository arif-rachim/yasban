# Bundling and Distribution Guide

**Status**: 📋 **PLANNED** - Implementation pending
**Priority**: Medium (required before Phase 1 release)
**Last Updated**: 2025-10-11

---

## 🎯 Overview

This document describes how to bundle the Yasban application for distribution as a standalone Electron application with the MCP runtime properly integrated.

## 🚨 Current Problem

### Development vs Production Architecture Mismatch

**Development Mode** (Works fine):
```
packages/web/
└── src/lib/process-manager.ts
    └── spawns: ../../packages/mcp-runtime/dist/index.js ✅
```

**Production Mode** (Won't work):
```
After electron-builder packaging:
Yasban.exe
└── resources/app.asar
    └── Tries to find: ../../packages/mcp-runtime/dist/index.js ❌
    Problem: Path doesn't exist in packaged app!
```

### Why This Won't Work

1. **Monorepo structure disappears**: After packaging, there's no `packages/` folder structure
2. **app.asar is read-only**: Can't spawn Node processes from inside asar files
3. **Relative paths break**: `../../packages/mcp-runtime` doesn't exist in production
4. **Service installation needs stable path**: Windows services need a fixed path that exists independently of Electron

---

## ✅ Solution: Hybrid Extraction Strategy

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ DEVELOPMENT MODE (Current - No Changes Needed)                  │
│                                                                 │
│  packages/web/src/lib/process-manager.ts                       │
│  └─> spawns: ../../packages/mcp-runtime/dist/index.js         │
│                                                                 │
│  ✅ Works perfectly with relative paths                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ PRODUCTION MODE (After Implementation)                          │
│                                                                 │
│  Step 1: electron-builder packages app                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Yasban.exe                                               │  │
│  │ └── resources/                                           │  │
│  │     ├── app.asar (Next.js app + process-manager)        │  │
│  │     ├── mcp-runtime/ (bundled but NOT extracted yet)    │  │
│  │     │   └── index.js, transports/, tools/, etc.         │  │
│  │     └── prisma/schema.prisma                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Step 2: First run - Auto-extraction                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ RuntimeExtractor.extract()                               │  │
│  │ Copies: resources/mcp-runtime/                           │  │
│  │ To: %APPDATA%/Yasban/mcp-runtime/                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Step 3: Process manager spawns from extracted location        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Windows: C:\Users\User\AppData\Roaming\Yasban\          │  │
│  │          mcp-runtime\index.js                            │  │
│  │                                                          │  │
│  │ macOS: ~/Library/Application Support/Yasban/            │  │
│  │        mcp-runtime/index.js                              │  │
│  │                                                          │  │
│  │ Linux: ~/.config/Yasban/mcp-runtime/index.js            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Step 4: Service installation uses stable path                 │
│  ✅ Path exists independently of Electron app                  │
│  ✅ Survives app updates                                       │
│  ✅ No admin rights needed                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 Implementation Checklist

### Phase 1: Create New Files

#### 1.1 Create `packages/web/electron-builder.yml`

```yaml
appId: com.yasban.app
productName: Yasban
copyright: Copyright © 2025 Yasban
directories:
  buildResources: build
  output: release
files:
  - out/**/*
  - dist/**/*
  - package.json
  - node_modules/**/*
extraResources:
  # Bundle MCP runtime outside of app.asar
  - from: ../mcp-runtime/dist
    to: mcp-runtime
    filter:
      - "**/*"
  # Bundle Prisma schema for migrations
  - from: ../../prisma
    to: prisma
    filter:
      - "schema.prisma"
win:
  target:
    - nsis
  icon: build/icon.ico
mac:
  target:
    - dmg
  icon: build/icon.icns
  category: public.app-category.developer-tools
linux:
  target:
    - AppImage
    - deb
  icon: build/icon.png
  category: Development
```

**Why this configuration:**
- `extraResources`: Copies files OUTSIDE of app.asar (required for Node spawning)
- `from: ../mcp-runtime/dist`: Relative to packages/web/
- `to: mcp-runtime`: Creates resources/mcp-runtime/ in packaged app
- `filter`: Include all files in the directory

---

#### 1.2 Create `packages/web/src/lib/runtime-extractor.ts`

```typescript
/**
 * Runtime Extractor - Extracts MCP runtime to user data folder
 *
 * In production, the MCP runtime is bundled in app resources but needs to be
 * extracted to a stable location for:
 * 1. Spawning Node processes (can't spawn from inside asar)
 * 2. Service installation (needs path that exists independently)
 * 3. User modifications (advanced users can customize)
 */

import fs from 'fs-extra';
import path from 'path';

/**
 * Get the path to the Electron app module
 * This works in both renderer and main process
 */
function getAppModule() {
  try {
    // In main process
    return require('electron').app;
  } catch {
    // In renderer process
    return require('@electron/remote').app;
  }
}

export class RuntimeExtractor {
  private static readonly RUNTIME_DIR_NAME = 'mcp-runtime';

  /**
   * Get the target directory where mcp-runtime should be extracted
   *
   * Returns:
   * - Windows: C:\Users\User\AppData\Roaming\Yasban\mcp-runtime
   * - macOS: ~/Library/Application Support/Yasban/mcp-runtime
   * - Linux: ~/.config/Yasban/mcp-runtime
   */
  static getRuntimePath(): string {
    const app = getAppModule();
    return path.join(app.getPath('userData'), this.RUNTIME_DIR_NAME);
  }

  /**
   * Get the path to the main runtime executable
   *
   * Returns:
   * - Windows: C:\Users\User\AppData\Roaming\Yasban\mcp-runtime\index.js
   * - macOS: ~/Library/Application Support/Yasban/mcp-runtime/index.js
   * - Linux: ~/.config/Yasban/mcp-runtime/index.js
   */
  static getRuntimeExecutable(): string {
    return path.join(this.getRuntimePath(), 'index.js');
  }

  /**
   * Check if runtime needs extraction
   *
   * Returns true if:
   * - Runtime directory doesn't exist
   * - Runtime executable doesn't exist
   * - Version mismatch (future: check version file)
   */
  static needsExtraction(): boolean {
    const targetPath = this.getRuntimePath();
    const executablePath = this.getRuntimeExecutable();

    // Extract if directory doesn't exist OR index.js doesn't exist
    return !fs.existsSync(targetPath) || !fs.existsSync(executablePath);
  }

  /**
   * Extract mcp-runtime from app resources to user data
   *
   * Steps:
   * 1. Check if app is packaged (skip in development)
   * 2. Get source path from app resources
   * 3. Ensure target directory exists
   * 4. Copy all files from resources to user data
   *
   * Throws: Error if extraction fails
   */
  static async extract(): Promise<void> {
    const app = getAppModule();

    if (!app.isPackaged) {
      // In development, no extraction needed
      console.log('[RuntimeExtractor] Running in development mode, skipping extraction');
      return;
    }

    // Source: app.asar.unpacked/resources/mcp-runtime/
    // Note: extraResources are placed in resources/, not inside app.asar
    const sourcePath = path.join(process.resourcesPath, this.RUNTIME_DIR_NAME);
    const targetPath = this.getRuntimePath();

    console.log('[RuntimeExtractor] Extracting MCP Runtime...');
    console.log(`  Source: ${sourcePath}`);
    console.log(`  Target: ${targetPath}`);

    // Verify source exists
    if (!fs.existsSync(sourcePath)) {
      throw new Error(
        `MCP runtime not found in app resources: ${sourcePath}\n` +
        `This is a packaging error. Please reinstall the application.`
      );
    }

    // Ensure target directory exists
    await fs.ensureDir(targetPath);

    // Copy all files from resources to user data
    await fs.copy(sourcePath, targetPath, {
      overwrite: true,
      errorOnExist: false,
      recursive: true,
    });

    console.log('[RuntimeExtractor] ✓ MCP Runtime extracted successfully');
    console.log(`  Location: ${targetPath}`);
  }

  /**
   * Get version of extracted runtime
   *
   * Future: Read from version.txt file in extracted runtime
   */
  static async getVersion(): Promise<string | null> {
    try {
      const versionPath = path.join(this.getRuntimePath(), 'version.txt');
      if (fs.existsSync(versionPath)) {
        return (await fs.readFile(versionPath, 'utf-8')).trim();
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Force re-extraction (for updates or corruption recovery)
   */
  static async forceExtract(): Promise<void> {
    const targetPath = this.getRuntimePath();

    // Remove existing runtime
    if (fs.existsSync(targetPath)) {
      console.log('[RuntimeExtractor] Removing existing runtime...');
      await fs.remove(targetPath);
    }

    // Extract fresh copy
    await this.extract();
  }
}
```

---

### Phase 2: Modify Existing Files

#### 2.1 Update `packages/web/electron/main.ts`

```typescript
import { app, BrowserWindow } from 'electron';
import path from 'path';
import { RuntimeExtractor } from '../src/lib/runtime-extractor';

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
```

**Key changes:**
- Added `initialize()` function
- Extract runtime before creating window
- Only in production (skip in development)
- Error handling for extraction failures

---

#### 2.2 Update `packages/web/src/lib/process-manager.ts`

**Changes at top of file:**

```typescript
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs'; // Add this import
import prisma from '@/lib/prisma';
import { createServerLogger, getServerLogPath } from '@/lib/logger';
import { RuntimeExtractor } from './runtime-extractor'; // Add this import
```

**Add new method to ProcessManager class:**

```typescript
class ProcessManager {
  private processes = new Map<string, ChildProcess>();

  /**
   * Get path to MCP runtime executable
   *
   * Returns different paths based on environment:
   * - Development: ../../packages/mcp-runtime/dist/index.js (relative workspace path)
   * - Production: %APPDATA%/Yasban/mcp-runtime/index.js (extracted path)
   */
  private getRuntimePath(): string {
    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
      // Development: Use relative path to workspace
      // process.cwd() is packages/web/, so go up to workspace root
      return path.join(
        process.cwd(),
        '..',  // Up to packages/
        '..',  // Up to yasban/ (workspace root)
        'packages',
        'mcp-runtime',
        'dist',
        'index.js'
      );
    } else {
      // Production: Use extracted runtime from user data
      return RuntimeExtractor.getRuntimeExecutable();
    }
  }

  /**
   * Start MCP server in GUI mode (as child process)
   */
  async startGUI(serverId: string, transport: string, port: number): Promise<void> {
    // Check if already running
    if (this.processes.has(serverId)) {
      throw new Error('Server is already running');
    }

    // Create winston logger for this server
    const logger = createServerLogger(serverId);

    // Get runtime path (environment-aware)
    const runtimePath = this.getRuntimePath();

    // Get log file path for unified logging
    const logFilePath = getServerLogPath(serverId);

    logger.info(`Starting MCP server with ${transport} transport on port ${port}`, {
      serverId,
      transport,
      port,
      runtimePath,
      logFilePath,
      environment: process.env.NODE_ENV || 'production',
    });

    // Verify runtime exists
    if (!fs.existsSync(runtimePath)) {
      const errorMsg = `MCP runtime not found at ${runtimePath}. ` +
        (process.env.NODE_ENV === 'development'
          ? `Run 'npm run build:mcp' to build the runtime.`
          : `Please reinstall the application.`);

      logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Rest of existing spawn logic remains the same...
    const proc = spawn(
      'node',
      [
        runtimePath,
        '--server',
        serverId,
        '--transport',
        transport,
        '--port',
        port.toString(),
        '--log-level',
        'info',
        '--log-file',
        logFilePath,
      ],
      {
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: process.cwd(),
      }
    );

    // ... rest of existing code (stdout, stderr, exit handlers) ...
  }

  // ... rest of existing methods remain unchanged ...
}
```

**Summary of changes:**
- Added `getRuntimePath()` private method
- Checks `NODE_ENV` to determine dev vs production
- Uses `RuntimeExtractor` in production
- Added runtime existence check with helpful error messages
- Logs which runtime path is being used

---

#### 2.3 Update `packages/web/package.json`

**Add dependencies:**

```json
{
  "dependencies": {
    "fs-extra": "^11.2.0"
  },
  "devDependencies": {
    "@types/fs-extra": "^11.0.4"
  }
}
```

**Update build scripts:**

```json
{
  "scripts": {
    "build": "npm run build:next && npm run build:electron && npm run build:mcp",
    "build:next": "next build",
    "build:electron": "tsc -p electron/tsconfig.json",
    "build:mcp": "npm run build --workspace=@yasban/mcp-runtime",
    "package": "npm run build && electron-builder --config electron-builder.yml",
    "package:win": "npm run build && electron-builder --win --config electron-builder.yml",
    "package:mac": "npm run build && electron-builder --mac --config electron-builder.yml",
    "package:linux": "npm run build && electron-builder --linux --config electron-builder.yml"
  }
}
```

**Key changes:**
- `build:mcp`: Builds MCP runtime before packaging
- `package` scripts: Reference `electron-builder.yml` config

---

### Phase 3: Create Build Resources

#### 3.1 Create Icons (Future)

```
packages/web/build/
├── icon.ico       # Windows (256x256)
├── icon.icns      # macOS (1024x1024)
└── icon.png       # Linux (512x512)
```

**Placeholder**: Can use default Electron icon initially

---

## 🔬 Testing Strategy

### Development Testing (Before Implementation)

1. **Verify current behavior:**
   ```bash
   cd packages/web
   npm run dev
   ```
   - Start a server in GUI mode
   - Verify it spawns correctly
   - Check logs show runtime path: `../../packages/mcp-runtime/dist/index.js`

2. **Build MCP runtime:**
   ```bash
   npm run build:mcp
   ```
   - Verify `packages/mcp-runtime/dist/index.js` exists

### Production Testing (After Implementation)

1. **Install dependencies:**
   ```bash
   cd packages/web
   npm install fs-extra
   npm install --save-dev @types/fs-extra
   ```

2. **Build all packages:**
   ```bash
   # From workspace root
   npm run build
   ```
   - Verify `packages/mcp-runtime/dist/` is built
   - Verify `packages/web/out/` is built
   - Verify `packages/web/dist/` is built

3. **Package Electron app:**
   ```bash
   cd packages/web
   npm run package:win
   ```
   - Check `release/` folder for installer
   - Verify installer size (should be ~150-200MB)

4. **Install and test:**
   - Run the installer
   - Install to `C:\Program Files\Yasban\` or `C:\Users\User\AppData\Local\Programs\Yasban\`
   - First run: Check for extraction logs in console (if dev tools enabled)
   - Verify extracted runtime:
     ```
     %APPDATA%\Yasban\mcp-runtime\index.js
     ```
   - Start a server in GUI mode
   - Verify logs show runtime path: `%APPDATA%\Yasban\mcp-runtime\index.js`

5. **Test service installation (Future):**
   - Install server as Windows service
   - Verify service points to: `%APPDATA%\Yasban\mcp-runtime\index.js`
   - Start service
   - Verify service runs independently

---

## 📦 Build Output Structure

### After `npm run package:win`

```
packages/web/release/
├── win-unpacked/                    # Unpacked folder (for testing)
│   ├── Yasban.exe
│   ├── resources/
│   │   ├── app.asar                 # Main app (Next.js + UI)
│   │   ├── mcp-runtime/             # Extracted MCP runtime (not in asar!)
│   │   │   ├── index.js
│   │   │   ├── transports/
│   │   │   │   ├── stdio.js
│   │   │   │   ├── sse.js
│   │   │   │   └── http.js
│   │   │   ├── tools/
│   │   │   │   └── registry.js
│   │   │   ├── config-loader.js
│   │   │   ├── config-cache.js
│   │   │   └── utils/
│   │   │       └── logger.js
│   │   └── prisma/
│   │       └── schema.prisma
│   └── ... (other Electron files)
│
└── Yasban-Setup-0.1.0.exe          # Windows installer (NSIS)
```

### After First Run (User Data)

```
Windows:
C:\Users\User\AppData\Roaming\Yasban\
├── mcp-runtime/                     # Extracted runtime (spawnable!)
│   ├── index.js
│   ├── transports/
│   ├── tools/
│   └── ... (same as resources)
├── logs/
│   └── server-xxx-2025-10-11.log
└── prisma/
    └── dev.db
```

---

## 🚀 Deployment Workflow

### For Developers

```bash
# 1. Make changes to code
git commit -m "feat: add new feature"

# 2. Build all packages
npm run build

# 3. Test locally with dev mode first
npm run dev

# 4. Package for your platform
cd packages/web
npm run package:win  # or package:mac, package:linux

# 5. Test the installer
# Install and run, verify everything works

# 6. Release (future: automate with GitHub Actions)
# Upload installer to releases page
```

### For Users (After Distribution)

```
1. Download Yasban-Setup-0.1.0.exe
2. Run installer
3. Launch Yasban
   - First run: Runtime auto-extracts to %APPDATA%
   - Creates desktop shortcut
4. Create servers, add tools
5. Start servers in GUI mode or install as service
```

---

## 🔄 Update Strategy (Future)

### App Updates

```
When releasing new version:
1. Build new version with updated runtime
2. User downloads new installer
3. Installer replaces app files
4. On first run of new version:
   - Detect runtime version mismatch
   - Re-extract runtime to user data
   - Preserve user database and logs
```

### Runtime-Only Updates (Advanced)

```
For hot-fixes to MCP runtime:
1. Release standalone runtime package
2. User downloads runtime.zip
3. User extracts to %APPDATA%\Yasban\mcp-runtime\
4. Restart Yasban
5. New runtime takes effect immediately
```

---

## 🐛 Troubleshooting

### Issue: "MCP runtime not found"

**Symptoms:**
- Server fails to start
- Error: `MCP runtime not found at ...`

**Solutions:**
1. Check extraction logs in Electron console
2. Manually verify `%APPDATA%\Yasban\mcp-runtime\index.js` exists
3. If missing, delete `%APPDATA%\Yasban\` and restart app (forces re-extraction)
4. If still fails, reinstall application

### Issue: "Permission denied" during extraction

**Symptoms:**
- Extraction fails on first run
- Error: `EACCES` or `EPERM`

**Solutions:**
1. Run Yasban as administrator (Windows)
2. Check antivirus isn't blocking file creation
3. Manually create `%APPDATA%\Yasban\` folder
4. Restart Yasban

### Issue: Service fails to start

**Symptoms:**
- Service installed but won't start
- Event log shows "Cannot find module"

**Solutions:**
1. Verify runtime extracted: `%APPDATA%\Yasban\mcp-runtime\index.js`
2. Check service configuration points to correct path
3. Reinstall service

---

## 📋 Implementation Checklist

Before implementing, ensure:

- [ ] All current features work in development mode
- [ ] HTTP transport is tested and working
- [ ] Build process succeeds (`npm run build`)
- [ ] No uncommitted changes
- [ ] Documentation is up to date

### Implementation Order:

1. [ ] Create `electron-builder.yml`
2. [ ] Install `fs-extra` dependency
3. [ ] Create `runtime-extractor.ts`
4. [ ] Update `electron/main.ts`
5. [ ] Update `process-manager.ts`
6. [ ] Update `package.json` build scripts
7. [ ] Test build process
8. [ ] Test packaging
9. [ ] Test installer
10. [ ] Test production runtime

---

## 🔗 Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture overview
- [ROADMAP.md](./ROADMAP.md) - Phase 1 completion requirements
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development workflow

---

**Status**: 📋 **READY FOR IMPLEMENTATION** when HTTP transport is tested
**Next Steps**: Test HTTP transport, then implement bundling strategy
**Estimated Time**: 4-6 hours (implementation + testing)

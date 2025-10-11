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

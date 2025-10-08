const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const isWindows = process.platform === 'win32';

console.log('🧹 Cleaning up development environment...\n');

/**
 * Kill processes using specific ports
 */
function killProcessesOnPorts() {
  const ports = [3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010];

  console.log('📡 Checking for processes using ports...');

  ports.forEach(port => {
    try {
      if (isWindows) {
        // Find process using port on Windows
        const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });

        if (result) {
          // Extract PIDs from netstat output
          const lines = result.split('\n').filter(line => line.trim());
          const pids = new Set();

          lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && !isNaN(pid)) {
              pids.add(pid);
            }
          });

          // Kill each PID
          pids.forEach(pid => {
            try {
              execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
              console.log(`  ✓ Killed process on port ${port} (PID: ${pid})`);
            } catch (err) {
              // Process might have already exited
            }
          });
        }
      } else {
        // Unix-like systems (macOS, Linux)
        const result = execSync(`lsof -ti:${port}`, { encoding: 'utf8', stdio: 'pipe' });

        if (result) {
          const pids = result.trim().split('\n');
          pids.forEach(pid => {
            try {
              execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
              console.log(`  ✓ Killed process on port ${port} (PID: ${pid})`);
            } catch (err) {
              // Process might have already exited
            }
          });
        }
      }
    } catch (err) {
      // No process using this port, that's fine
    }
  });
}

/**
 * Kill all Electron processes
 */
function killElectronProcesses() {
  console.log('\n⚡ Checking for Electron processes...');

  try {
    if (isWindows) {
      execSync('taskkill /F /IM electron.exe /T', { stdio: 'ignore' });
      console.log('  ✓ Killed all Electron processes');
    } else {
      execSync('pkill -9 electron', { stdio: 'ignore' });
      console.log('  ✓ Killed all Electron processes');
    }
  } catch (err) {
    // No Electron processes running, that's fine
    console.log('  ✓ No Electron processes found');
  }
}

/**
 * Clean .next directory
 */
function cleanNextDir() {
  console.log('\n🗑️  Cleaning .next directory...');

  const nextDir = path.join(__dirname, '..', '.next');

  try {
    if (fs.existsSync(nextDir)) {
      // On Windows, we need to be more careful with locked files
      if (isWindows) {
        try {
          execSync(`rmdir /s /q "${nextDir}"`, { stdio: 'ignore' });
          console.log('  ✓ Removed .next directory');
        } catch (err) {
          console.log('  ⚠️  Could not remove .next directory (might be locked)');
        }
      } else {
        execSync(`rm -rf "${nextDir}"`, { stdio: 'ignore' });
        console.log('  ✓ Removed .next directory');
      }
    } else {
      console.log('  ✓ .next directory already clean');
    }
  } catch (err) {
    console.log('  ⚠️  Could not clean .next directory:', err.message);
  }
}

/**
 * Main cleanup routine
 */
async function cleanup() {
  try {
    killProcessesOnPorts();
    killElectronProcesses();
    cleanNextDir();

    console.log('\n✨ Cleanup complete! Starting development server...\n');

    // Small delay to ensure all processes are fully terminated
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (err) {
    console.error('❌ Error during cleanup:', err.message);
    process.exit(1);
  }
}

cleanup();

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const isWindows = process.platform === 'win32';

/**
 * Parse command-line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    ports: [],
    next: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--ports' && args[i + 1]) {
      // Parse comma-separated port numbers
      options.ports = args[i + 1].split(',').map(p => parseInt(p.trim(), 10)).filter(p => !isNaN(p));
      i++;
    } else if (arg === '--next') {
      options.next = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    }
  }

  return options;
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
🧹 Yasban Development Cleanup Script

Usage:
  node scripts/cleanup-dev.js [options]

Options:
  --ports <port1,port2,...>   Kill processes on specific ports (comma-separated)
  --next                       Clean .next directory
  --help, -h                   Show this help message

Examples:
  # Clean for web dev (Next.js)
  node scripts/cleanup-dev.js --ports 3001 --next

  # Clean for MCP runtime dev
  node scripts/cleanup-dev.js --ports 3100

  # Clean multiple ports
  node scripts/cleanup-dev.js --ports 3001,3100,3200

  # Clean everything
  node scripts/cleanup-dev.js --ports 3001 --next
  `);
}

/**
 * Kill processes using specific ports
 */
function killProcessesOnPorts(ports) {
  if (!ports || ports.length === 0) {
    return;
  }

  console.log('📡 Checking for processes using ports:', ports.join(', '));

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
    const options = parseArgs();

    // Show help and exit if requested
    if (options.help) {
      showHelp();
      process.exit(0);
    }

    // Show help if no options provided
    if (!options.ports.length && !options.next) {
      console.log('⚠️  No cleanup options specified.\n');
      showHelp();
      process.exit(1);
    }

    console.log('🧹 Cleaning up development environment...\n');

    // Run only requested cleanup operations
    if (options.ports.length > 0) {
      killProcessesOnPorts(options.ports);
    }

    if (options.next) {
      cleanNextDir();
    }

    console.log('\n✨ Cleanup complete! Ready to start development server...\n');

    // Small delay to ensure all processes are fully terminated
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (err) {
    console.error('❌ Error during cleanup:', err.message);
    process.exit(1);
  }
}

cleanup();

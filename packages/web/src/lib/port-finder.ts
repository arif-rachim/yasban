/**
 * Port Finder - Utility to find available network ports
 *
 * Finds an available port by attempting to bind to it.
 * Used for dynamically allocating ports to MCP servers.
 */

import { createServer } from 'net';

/**
 * Check if a port is available
 */
async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();

    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false); // Port is in use
      } else {
        resolve(false); // Other error, consider unavailable
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(true); // Port is available
    });

    server.listen(port);
  });
}

/**
 * Find an available port starting from a given port number
 *
 * @param startPort - Port number to start searching from (default: 3100)
 * @param maxAttempts - Maximum number of ports to try (default: 100)
 * @returns Available port number
 * @throws Error if no available port is found
 */
export async function findAvailablePort(
  startPort: number = 3100,
  maxAttempts: number = 100
): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;

    if (await isPortAvailable(port)) {
      return port;
    }
  }

  throw new Error(
    `No available ports found in range ${startPort}-${startPort + maxAttempts - 1}`
  );
}

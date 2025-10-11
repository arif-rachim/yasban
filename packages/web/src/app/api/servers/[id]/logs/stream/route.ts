import { NextRequest } from 'next/server';
import { getServerLogPath } from '@/lib/logger';
import fs from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';

/**
 * SSE endpoint for streaming server logs in real-time
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: serverId } = await params;

  // Verify server exists
  const server = await prisma.server.findUnique({
    where: { id: serverId },
    select: { id: true },
  });

  if (!server) {
    return notFound();
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  let lastPosition = 0;
  let watcher: fs.FSWatcher | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Get log file path
      const logFilePath = getServerLogPath(serverId);

      // Send initial connection message
      const connectMsg = `data: ${JSON.stringify({ type: 'connected', serverId })}\n\n`;
      controller.enqueue(encoder.encode(connectMsg));

      // Read existing log content if file exists
      if (fs.existsSync(logFilePath)) {
        try {
          const initialContent = fs.readFileSync(logFilePath, 'utf-8');
          const lines = initialContent.split('\n').filter(line => line.trim());

          // Send initial logs
          const initialMsg = `data: ${JSON.stringify({ type: 'initial', lines })}\n\n`;
          controller.enqueue(encoder.encode(initialMsg));

          lastPosition = initialContent.length;
        } catch (error) {
          console.error('Error reading initial log file:', error);
        }
      } else {
        // Send empty initial state
        const initialMsg = `data: ${JSON.stringify({ type: 'initial', lines: [] })}\n\n`;
        controller.enqueue(encoder.encode(initialMsg));
      }

      // Watch log file for changes
      const watchCallback = () => {
        if (!fs.existsSync(logFilePath)) return;

        try {
          const stats = fs.statSync(logFilePath);
          if (stats.size > lastPosition) {
            // Read only the new content
            const stream = fs.createReadStream(logFilePath, {
              start: lastPosition,
              encoding: 'utf-8',
            });

            let buffer = '';
            stream.on('data', (chunk) => {
              buffer += chunk;
              const lines = buffer.split('\n');

              // Keep the last incomplete line in the buffer
              buffer = lines.pop() || '';

              // Send complete lines
              lines.forEach((line) => {
                if (line.trim()) {
                  const logMsg = `data: ${JSON.stringify({ type: 'log', line })}\n\n`;
                  controller.enqueue(encoder.encode(logMsg));
                }
              });
            });

            stream.on('end', () => {
              lastPosition = stats.size;
            });

            stream.on('error', (err) => {
              console.error('Error reading log stream:', err);
            });
          }
        } catch (error) {
          console.error('Error in watch callback:', error);
        }
      };

      // Start watching the log file
      try {
        // Watch parent directory since the file might not exist yet
        const logDir = path.dirname(logFilePath);
        watcher = fs.watch(logDir, (eventType, filename) => {
          if (filename && filename.includes(serverId)) {
            watchCallback();
          }
        });
      } catch (error) {
        console.error('Error setting up file watcher:', error);
      }

      // Send periodic ping to keep connection alive
      const pingInterval = setInterval(() => {
        try {
          const pingMsg = `data: ${JSON.stringify({ type: 'ping' })}\n\n`;
          controller.enqueue(encoder.encode(pingMsg));
        } catch (error) {
          console.error('Error sending ping:', error);
          clearInterval(pingInterval);
        }
      }, 30000); // Every 30 seconds

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(pingInterval);
        if (watcher) {
          watcher.close();
        }
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}

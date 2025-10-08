'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from './ui/button';

interface LogsViewerProps {
  serverId: string;
  serverStatus: string;
}

interface LogLine {
  timestamp: string;
  level: string;
  message: string;
  raw: string;
}

export function LogsViewer({ serverId, serverStatus }: LogsViewerProps) {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [connected, setConnected] = useState<boolean>(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Detect manual scroll to disable auto-scroll
  const handleScroll = () => {
    if (!logsContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = logsContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

    if (!isNearBottom && autoScroll) {
      setAutoScroll(false);
    } else if (isNearBottom && !autoScroll) {
      setAutoScroll(true);
    }
  };

  // Parse log line into structured format
  const parseLogLine = (raw: string): LogLine => {
    // Format: "2024-01-15 14:30:45 [INFO] Message here"
    const match = raw.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \[(\w+)\] (.+)$/);

    if (match) {
      return {
        timestamp: match[1],
        level: match[2],
        message: match[3],
        raw,
      };
    }

    // Fallback if parsing fails
    return {
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      level: 'INFO',
      message: raw,
      raw,
    };
  };

  // Connect to SSE endpoint
  useEffect(() => {
    const eventSource = new EventSource(`/api/servers/${serverId}/logs/stream`);

    eventSource.onopen = () => {
      console.log('✓ Connected to log stream');
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'connected':
            console.log('✓ Server confirmed connection');
            break;

          case 'initial':
            // Load initial logs
            const initialLogs = data.lines.map((line: string) => parseLogLine(line));
            setLogs(initialLogs);
            break;

          case 'log':
            // Append new log line
            const newLog = parseLogLine(data.line);
            setLogs((prev) => [...prev, newLog]);
            break;

          case 'ping':
            // Keep-alive, do nothing
            break;

          default:
            console.warn('Unknown SSE message type:', data.type);
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('✗ SSE connection error:', error);
      setConnected(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
      setConnected(false);
    };
  }, [serverId]);

  // Filter logs based on level and search
  const filteredLogs = logs.filter((log) => {
    // Filter by level
    if (filter !== 'all' && log.level.toLowerCase() !== filter.toLowerCase()) {
      return false;
    }

    // Filter by search term
    if (search && !log.raw.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }

    return true;
  });

  // Get log line color based on level
  const getLogColor = (level: string): string => {
    switch (level.toUpperCase()) {
      case 'ERROR':
        return 'text-red-400';
      case 'WARN':
        return 'text-yellow-400';
      case 'INFO':
        return 'text-blue-400';
      case 'DEBUG':
        return 'text-gray-400';
      default:
        return 'text-gray-300';
    }
  };

  // Download logs as text file
  const handleDownload = () => {
    const content = filteredLogs.map((log) => log.raw).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `server-${serverId}-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Clear logs
  const handleClear = () => {
    setLogs([]);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Server Logs</h3>
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${
                connected
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300'
              }`}
            >
              {connected ? '● Live' : '○ Disconnected'}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {filteredLogs.length} {filteredLogs.length === 1 ? 'line' : 'lines'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={logs.length === 0}>
              Download
            </Button>
            <Button variant="outline" size="sm" onClick={handleClear} disabled={logs.length === 0}>
              Clear
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          {/* Level filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Level:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All</option>
              <option value="error">Error</option>
              <option value="warn">Warn</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          {/* Auto-scroll toggle */}
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="w-4 h-4"
            />
            Auto-scroll
          </label>
        </div>
      </div>

      {/* Logs display */}
      <div
        ref={logsContainerRef}
        onScroll={handleScroll}
        className="bg-gray-900 dark:bg-black p-4 font-mono text-sm overflow-y-auto"
        style={{ height: '500px' }}
      >
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            {logs.length === 0 ? (
              <div className="text-center">
                <p className="mb-2">No logs yet</p>
                <p className="text-xs">Logs will appear here in real-time</p>
              </div>
            ) : (
              <div className="text-center">
                <p>No logs match the current filters</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-0.5">
            {filteredLogs.map((log, index) => (
              <div key={index} className="flex gap-3 hover:bg-gray-800/50 px-2 py-0.5 rounded">
                <span className="text-gray-500 flex-shrink-0">{log.timestamp}</span>
                <span className={`font-bold flex-shrink-0 w-16 ${getLogColor(log.level)}`}>
                  [{log.level}]
                </span>
                <span className="text-gray-300 flex-1 break-all">{log.message}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}

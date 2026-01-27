/**
 * Application logger with timing support
 * Logs to console in development, sends to server in production for Vercel Logs
 */

const isDev = process.env.NODE_ENV === 'development';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface TimingEntry {
  startTime: number;
  label: string;
}

const timings = new Map<string, TimingEntry>();

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

const getPrefix = (level: LogLevel, category?: string): string => {
  const timestamp = new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3
  });
  const categoryStr = category ? `[${category}]` : '';
  return `${timestamp} ${categoryStr}`;
};

/**
 * Send log to server (for Vercel Logs in production)
 * Uses fire-and-forget pattern to avoid blocking
 */
const sendToServer = (
  level: LogLevel,
  message: string,
  category?: string,
  data?: unknown,
  duration?: number
) => {
  // Only send timing and important logs to server to reduce noise
  if (level === 'debug') return;

  try {
    fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level,
        message,
        category,
        data: data ? JSON.stringify(data) : undefined,
        duration
      }),
    }).catch(() => {
      // Silently ignore errors - logging shouldn't break the app
    });
  } catch {
    // Silently ignore
  }
};

export const logger = {
  debug: (message: string, data?: unknown, category?: string) => {
    if (isDev) {
      const prefix = getPrefix('debug', category);
      if (data !== undefined) {
        console.debug(`${prefix} ${message}`, data);
      } else {
        console.debug(`${prefix} ${message}`);
      }
    }
    // Debug logs not sent to server (too noisy)
  },

  info: (message: string, data?: unknown, category?: string) => {
    if (isDev) {
      const prefix = getPrefix('info', category);
      if (data !== undefined) {
        console.info(`%c${prefix} ${message}`, 'color: #2196F3', data);
      } else {
        console.info(`%c${prefix} ${message}`, 'color: #2196F3');
      }
    }
    // Send to server for Vercel Logs
    sendToServer('info', message, category, data);
  },

  warn: (message: string, data?: unknown, category?: string) => {
    const prefix = getPrefix('warn', category);
    if (data !== undefined) {
      console.warn(`${prefix} ${message}`, data);
    } else {
      console.warn(`${prefix} ${message}`);
    }
    // Send to server for Vercel Logs
    sendToServer('warn', message, category, data);
  },

  error: (message: string, data?: unknown, category?: string) => {
    const prefix = getPrefix('error', category);
    if (data !== undefined) {
      console.error(`${prefix} ${message}`, data);
    } else {
      console.error(`${prefix} ${message}`);
    }
    // Send to server for Vercel Logs
    sendToServer('error', message, category, data);
  },

  /**
   * Start timing an operation
   */
  time: (id: string, label?: string) => {
    timings.set(id, {
      startTime: performance.now(),
      label: label || id
    });
    if (isDev) {
      logger.debug(`⏱️ Started: ${label || id}`, undefined, 'TIMING');
    }
  },

  /**
   * End timing and log the duration
   */
  timeEnd: (id: string, additionalInfo?: string) => {
    const entry = timings.get(id);
    if (!entry) {
      logger.warn(`No timing entry found for: ${id}`, undefined, 'TIMING');
      return 0;
    }

    const duration = performance.now() - entry.startTime;
    timings.delete(id);

    const durationStr = formatDuration(duration);
    const isSlowRequest = duration > 1000;
    const info = additionalInfo ? ` (${additionalInfo})` : '';

    if (isDev) {
      const emoji = isSlowRequest ? '🐢' : '✅';
      const color = isSlowRequest ? 'color: #ff9800; font-weight: bold' : 'color: #4caf50';
      console.info(`%c${getPrefix('info', 'TIMING')} ${emoji} ${entry.label}: ${durationStr}${info}`, color);
    }

    // Send timing to server for Vercel Logs
    const level = isSlowRequest ? 'warn' : 'info';
    sendToServer(level, `${entry.label}${info}`, 'TIMING', undefined, duration);

    return duration;
  },

  /**
   * Log a group of operations
   */
  group: (label: string, fn: () => void) => {
    if (isDev) {
      console.group(`📦 ${label}`);
      fn();
      console.groupEnd();
    } else {
      fn();
    }
  },

  /**
   * Log page/component mount
   */
  mount: (componentName: string) => {
    if (isDev) {
      logger.info(`🚀 Mounted: ${componentName}`, undefined, 'LIFECYCLE');
    }
  },

  /**
   * Log real-time subscription events
   */
  realtime: (event: string, table: string, payload?: unknown) => {
    if (isDev) {
      logger.debug(`📡 ${event} on ${table}`, payload, 'REALTIME');
    }
  }
};

export default logger;

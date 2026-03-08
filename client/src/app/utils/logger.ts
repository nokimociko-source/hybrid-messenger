/**
 * Centralized logging utility
 * Replaces console.log/error/warn with environment-aware logging
 */

const isDev = import.meta.env.DEV;
const isTest = import.meta.env.MODE === 'test';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: any;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 100;

  private log(level: LogLevel, message: string, ...args: any[]) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      data: args.length > 0 ? args : undefined,
    };

    // Store in memory (for debugging)
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output in development
    if (isDev || isTest) {
      const consoleMethod = level === 'debug' ? 'log' : level;
      console[consoleMethod](`[${level.toUpperCase()}]`, message, ...args);
    }

    // In production, send critical errors to monitoring service
    if (!isDev && level === 'error') {
      this.sendToMonitoring(entry);
    }
  }

  private sendToMonitoring(entry: LogEntry) {
    // TODO: Integrate with Sentry, LogRocket, or other monitoring service
    // Example:
    // Sentry.captureException(new Error(entry.message), {
    //   extra: entry.data,
    //   level: entry.level,
    // });
  }

  error(message: string, ...args: any[]) {
    this.log('error', message, ...args);
  }

  warn(message: string, ...args: any[]) {
    this.log('warn', message, ...args);
  }

  info(message: string, ...args: any[]) {
    this.log('info', message, ...args);
  }

  debug(message: string, ...args: any[]) {
    this.log('debug', message, ...args);
  }

  /**
   * Get recent logs (useful for debugging)
   */
  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * Clear all stored logs
   */
  clearLogs() {
    this.logs = [];
  }
}

export const logger = new Logger();

// Export for backward compatibility
export default logger;

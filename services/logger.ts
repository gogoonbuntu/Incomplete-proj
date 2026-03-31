import { format } from 'date-fns';

// In-memory logger (Vercel 서버리스 호환 - fs 사용 불가)
const LOG_MAX_ENTRIES = 200;
const logEntries: string[] = [];

export class Logger {
  // Format a message with timestamp
  private formatMessage(message: string): string {
    const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    return `[${timestamp}] ${message}`;
  }
  
  // Write to summary updater log
  logSummaryUpdate(message: string): void {
    const formattedMessage = this.formatMessage(message);
    console.log(formattedMessage);
    
    // In-memory log storage
    logEntries.push(formattedMessage);
    if (logEntries.length > LOG_MAX_ENTRIES) {
      logEntries.splice(0, logEntries.length - LOG_MAX_ENTRIES);
    }
  }
  
  // Get summary updater log contents
  getSummaryUpdateLog(lines: number = 50): string {
    if (logEntries.length === 0) {
      return 'No log entries yet.';
    }
    return logEntries.slice(-lines).join('\n');
  }
}

// Export a singleton logger instance
export const logger = new Logger();

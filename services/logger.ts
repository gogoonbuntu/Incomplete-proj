import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';

// Logger class to write logs to a file and console
export class Logger {
  private logDir: string;
  private summaryLogPath: string;
  
  constructor() {
    // Ensure logs directory exists
    this.logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
    
    // Log file paths
    this.summaryLogPath = path.join(this.logDir, 'summary-updater.log');
  }
  
  // Format a message with timestamp
  private formatMessage(message: string): string {
    const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    return `[${timestamp}] ${message}`;
  }
  
  // Write to summary updater log
  logSummaryUpdate(message: string): void {
    const formattedMessage = this.formatMessage(message);
    console.log(formattedMessage);
    
    // Append to log file
    fs.appendFileSync(this.summaryLogPath, formattedMessage + '\n');
  }
  
  // Get summary updater log contents
  getSummaryUpdateLog(lines: number = 50): string {
    if (!fs.existsSync(this.summaryLogPath)) {
      return 'No log entries yet.';
    }
    
    try {
      const logContent = fs.readFileSync(this.summaryLogPath, 'utf-8');
      const logLines = logContent.split('\n').filter(Boolean);
      
      // Return the last X lines
      return logLines.slice(-lines).join('\n');
    } catch (error) {
      console.error('Error reading log file:', error);
      return 'Error reading log file.';
    }
  }
}

// Export a singleton logger instance
export const logger = new Logger();

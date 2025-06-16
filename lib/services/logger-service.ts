export interface LogEntry {
  timestamp: string
  level: "info" | "warn" | "error" | "success"
  message: string
  details?: any
}

class LoggerService {
  private logs: LogEntry[] = []
  private maxLogs = 100
  private listeners: ((logs: LogEntry[]) => void)[] = []

  log(level: LogEntry["level"], message: string, details?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details,
    }

    this.logs.unshift(entry) // 최신 로그를 앞에 추가

    // 최대 로그 수 제한
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs)
    }

    // 콘솔에도 출력
    const timestamp = new Date().toLocaleTimeString()
    const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`

    switch (level) {
      case "error":
        console.error(logMessage, details)
        break
      case "warn":
        console.warn(logMessage, details)
        break
      case "success":
        console.log(`✅ ${logMessage}`, details)
        break
      default:
        console.log(logMessage, details)
    }

    // 리스너들에게 알림
    this.listeners.forEach((listener) => listener([...this.logs]))
  }

  info(message: string, details?: any) {
    this.log("info", message, details)
  }

  warn(message: string, details?: any) {
    this.log("warn", message, details)
  }

  error(message: string, details?: any) {
    this.log("error", message, details)
  }

  success(message: string, details?: any) {
    this.log("success", message, details)
  }

  getLogs(): LogEntry[] {
    return [...this.logs]
  }

  getRecentLogs(count = 5): LogEntry[] {
    return this.logs.slice(0, count)
  }

  subscribe(listener: (logs: LogEntry[]) => void) {
    this.listeners.push(listener)

    // 구독 해제 함수 반환
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  clear() {
    this.logs = []
    this.listeners.forEach((listener) => listener([]))
  }
}

export const logger = new LoggerService()

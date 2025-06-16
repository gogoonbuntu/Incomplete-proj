"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { logger, type LogEntry } from "@/lib/services/logger-service"
import { FileText, Trash2, Download } from "lucide-react"

export function CrawlingLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    // 초기 로그 로드
    setLogs(logger.getLogs())

    // 로그 업데이트 구독
    const unsubscribe = logger.subscribe((newLogs) => {
      setLogs(newLogs)
    })

    return unsubscribe
  }, [])

  const recentLogs = logs.slice(0, 5)
  const allLogs = logs

  const getLevelColor = (level: LogEntry["level"]) => {
    switch (level) {
      case "error":
        return "bg-red-100 text-red-800 border-red-200"
      case "warn":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "success":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-blue-100 text-blue-800 border-blue-200"
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("ko-KR")
  }

  const exportLogs = () => {
    const logText = allLogs
      .map((log) => `[${formatTime(log.timestamp)}] ${log.level.toUpperCase()}: ${log.message}`)
      .join("\n")

    const blob = new Blob([logText], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `crawling-logs-${new Date().toISOString().split("T")[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const clearLogs = () => {
    logger.clear()
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>실행 로그</span>
            {logs.length > 0 && <Badge variant="secondary">{logs.length}</Badge>}
          </CardTitle>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? "접기" : "전체 보기"}
            </Button>
            {logs.length > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={exportLogs}>
                  <Download className="h-4 w-4 mr-1" />
                  내보내기
                </Button>
                <Button variant="outline" size="sm" onClick={clearLogs}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  지우기
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-gray-500 text-center py-4">아직 로그가 없습니다.</p>
        ) : (
          <ScrollArea className={isExpanded ? "h-96" : "h-32"}>
            <div className="space-y-2">
              {(isExpanded ? allLogs : recentLogs).map((log, index) => (
                <div key={`${log.timestamp}-${index}`} className="flex items-start space-x-3 p-2 rounded-lg bg-gray-50">
                  <Badge className={`text-xs ${getLevelColor(log.level)}`}>{log.level}</Badge>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">{formatTime(log.timestamp)}</span>
                    </div>
                    <p className="text-sm text-gray-900 mt-1">{log.message}</p>
                    {log.details && (
                      <pre className="text-xs text-gray-600 mt-1 bg-gray-100 p-2 rounded overflow-x-auto">
                        {typeof log.details === "string" ? log.details : JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        {!isExpanded && logs.length > 5 && (
          <div className="text-center mt-2">
            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(true)}>
              +{logs.length - 5}개 더 보기
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

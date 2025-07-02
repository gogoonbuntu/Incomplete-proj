"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle, Play, Square, RefreshCw, Trash2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"

export default function DescriptionUpdaterPage() {
  const [status, setStatus] = useState<"idle" | "running" | "error">("idle")
  const [message, setMessage] = useState<string>("")
  const [lastRun, setLastRun] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isCacheClearing, setIsCacheClearing] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // 로그인 체크 비활성화 - 모든 사용자에게 관리자 권한 부여
    setIsAdmin(true);
    
    // 서비스 상태 확인
    checkServiceStatus()
  }, [user, router])

  const startService = async () => {
    try {
      const response = await fetch("/api/admin/description-updater/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid: user?.uid || "anonymous"
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setStatus("running")
        setMessage(data.message || "서비스가 시작되었습니다.")
      } else {
        throw new Error(data.message || "서비스 시작 실패")
      }
    } catch (error) {
      console.error("서비스 시작 실패:", error)
      setStatus("error")
      setMessage("서비스 시작 중 오류가 발생했습니다.")
    }
  }

  const stopService = async () => {
    try {
      const response = await fetch("/api/admin/description-updater/stop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid: user?.uid || "anonymous"
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setStatus("idle")
        setMessage(data.message || "서비스가 중지되었습니다.")
      } else {
        throw new Error(data.message || "서비스 중지 실패")
      }
    } catch (error) {
      console.error("서비스 중지 실패:", error)
      setStatus("error")
      setMessage("서비스 중지 중 오류가 발생했습니다.")
    }
  }

  const refreshPage = () => {
    setIsRefreshing(true)
    router.refresh()
    
    // 상태 다시 가져오기
    setTimeout(() => {
      checkServiceStatus()
      setIsRefreshing(false)
    }, 1000)
  }

  const clearServerCache = async () => {
    setIsCacheClearing(true)
    
    try {
      // 서버 API를 통해 서버 캐시 삭제
      const response = await fetch('/api/admin/description-updater/clear-cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: user?.uid || 'anonymous'
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setMessage("서버 캐시가 성공적으로 삭제되었습니다.")
        // 상태 다시 가져오기
        setTimeout(() => {
          checkServiceStatus()
        }, 1000)
      } else {
        throw new Error(result.message || '서버 캐시 삭제 실패')
      }
    } catch (error) {
      console.error("서버 캐시 삭제 실패:", error)
      setMessage("서버 캐시 삭제 중 오류가 발생했습니다.")
    } finally {
      setIsCacheClearing(false)
    }
  }

  const checkServiceStatus = async () => {
    try {
      const response = await fetch("/api/admin/description-updater/status")
      const data = await response.json()
      
      setStatus(data.isRunning ? "running" : "idle")
      setMessage(data.message || "")
      setLastRun(data.lastRun || null)
    } catch (error) {
      console.error("서비스 상태 확인 실패:", error)
      setStatus("error")
      setMessage("서비스 상태 확인 중 오류가 발생했습니다.")
    }
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>접근 권한 없음</AlertTitle>
          <AlertDescription>
            이 페이지에 접근할 권한이 없습니다.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>프로젝트 설명 업데이터</CardTitle>
          <CardDescription>
            Gemini API를 사용하여 프로젝트 설명을 자동으로 생성하고 업데이트합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Badge variant={status === "running" ? "default" : status === "error" ? "destructive" : "outline"}>
                {status === "running" ? "실행 중" : status === "error" ? "오류" : "중지됨"}
              </Badge>
              {status === "running" && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              {status === "error" && (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
            
            {message && (
              <Alert>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}
            
            {lastRun && (
              <div>
                <p className="text-sm font-medium">마지막 실행 시간:</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(lastRun).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          <div className="flex space-x-4">
            {status === "idle" ? (
              <Button onClick={startService}>
                <Play className="mr-2 h-4 w-4" /> 서비스 시작
              </Button>
            ) : (
              <Button onClick={stopService} variant="destructive">
                <Square className="mr-2 h-4 w-4" /> 서비스 중지
              </Button>
            )}
            
            <Button 
              onClick={refreshPage} 
              variant="outline" 
              disabled={isRefreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} /> 
              {isRefreshing ? '새로고침 중...' : '새로고침'}
            </Button>
          </div>
        </CardFooter>
      </Card>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>캐시 관리</CardTitle>
            <CardDescription>
              서버 캐시를 관리합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              <Button onClick={clearServerCache} disabled={isCacheClearing || isRefreshing} className="w-full">
                <Trash2 className="mr-2 h-4 w-4" />
                서버 캐시 삭제
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>서비스 정보</CardTitle>
            <CardDescription>
              프로젝트 설명 자동 업데이트 서비스에 대한 정보입니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">
                이 서비스는 Gemini API를 사용하여 프로젝트 설명을 자동으로 생성하고 업데이트합니다.
              </p>
              <p className="text-sm">
                API 사용량 제한을 고려하여 주기적으로 업데이트되지 않은 프로젝트를 하나씩 처리합니다.
              </p>
              <p className="text-sm">
                서비스를 시작하면 백그라운드에서 자동으로 실행됩니다.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

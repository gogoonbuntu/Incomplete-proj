"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useAuth } from "@/hooks/use-auth"
import { RefreshCw, Play, AlertCircle } from "lucide-react"

interface StatusData {
  isRunning: boolean;
  lastRun: string | null;
  processedToday: number;
  apiCallsToday: number;
  status: string;
}

export default function SummaryUpdaterPage() {
  const { isAdmin } = useAuth();
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch status from API
  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/admin/summary-updater", {
        cache: "no-cache",
      });
      
      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }
      
      const data = await res.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(`오류: ${err instanceof Error ? err.message : "알 수 없는 오류"}`);
      console.error("Status fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Start processing a single project
  const processProject = async () => {
    try {
      setProcessing(true);
      
      const res = await fetch("/api/admin/summary-updater", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "process" }),
      });
      
      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }
      
      const data = await res.json();
      
      if (data.success) {
        await fetchStatus();
      } else {
        setError(`처리 실패: ${data.message}`);
      }
    } catch (err) {
      setError(`오류: ${err instanceof Error ? err.message : "알 수 없는 오류"}`);
      console.error("Processing error:", err);
    } finally {
      setProcessing(false);
    }
  };

  // Initial load and refresh every 30 seconds
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Status badge color
  const getStatusColor = (status: string | undefined) => {
    if (!status) return "default";
    switch (status) {
      case "processing": return "secondary";
      case "error": return "destructive";
      case "idle": return "outline";
      default: return "default";
    }
  };

  return (
    <div className="container py-10">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">프로젝트 요약 자동 생성기</CardTitle>
          <CardDescription>
            Gemini API를 사용하여 프로젝트 설명과 README를 분석하고, 영어로 된 요약을 자동 생성합니다.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Status Section */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>오류 발생</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="font-medium mb-2">현재 상태</h3>
              {loading ? (
                <div className="flex items-center space-x-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>로딩 중...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-muted-foreground">상태:</span>
                    <Badge variant={getStatusColor(status?.status)}>
                      {status?.status === "processing" ? "처리 중" : 
                       status?.status === "error" ? "오류" : 
                       status?.status === "idle" ? "대기 중" : "알 수 없음"}
                    </Badge>
                  </div>
                  
                  <div>
                    <span className="text-muted-foreground">최근 실행:</span>{" "}
                    {status?.lastRun ? new Date(status.lastRun).toLocaleString() : "없음"}
                  </div>
                  
                  <div>
                    <span className="text-muted-foreground">오늘 처리된 프로젝트:</span>{" "}
                    {status?.processedToday || 0}개
                  </div>
                  
                  <div>
                    <span className="text-muted-foreground">오늘 API 호출 횟수:</span>{" "}
                    {status?.apiCallsToday || 0}회
                  </div>
                </div>
              )}
            </div>
            
            <div>
              <h3 className="font-medium mb-4">서비스 정보</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm">
                <li>README 파일을 분석하고 핵심 코드를 읽어 프로젝트 요약을 생성합니다.</li>
                <li>비영어 README는 영어로 요약하여 변환합니다.</li>
                <li>API 사용량 제한을 고려하여 스케줄링됩니다.</li>
                <li>프로젝트당 7일에 한 번씩만 업데이트됩니다.</li>
                <li>가장 오래된 업데이트 순으로 처리합니다.</li>
              </ul>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={fetchStatus} 
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            상태 새로고침
          </Button>
          
          <Button 
            onClick={processProject} 
            disabled={processing || status?.isRunning}
          >
            {processing || status?.isRunning ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                처리 중...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                프로젝트 하나 처리
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useAuth } from "@/hooks/use-auth"
import { RefreshCw, Play, AlertCircle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

interface StatusData {
  isRunning: boolean;
  lastRun: string | null;
  processedToday: number;
  apiCallsToday: number;
  status: string;
}

interface ServiceStatus {
  isRunning: boolean;
  lastRun: string;
  processedToday: number;
  apiCallsToday: number;
  status: string;
  logs: string;
}

export default function SummaryUpdaterPage() {
  const { isAdmin } = useAuth();
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>({
    isRunning: false,
    lastRun: "",
    processedToday: 0,
    apiCallsToday: 0,
    status: "idle",
    logs: ""
  });
  
  const { toast } = useToast();

  // Fetch status from API
  const fetchStatus = async (includeLog = false) => {
    try {
      setLoading(true);
      const url = includeLog
        ? "/api/admin/summary-updater?logs=true&lines=50"
        : "/api/admin/summary-updater";
      
      const response = await fetch(url);
      const data = await response.json();
      setServiceStatus(data);
    } catch (error) {
      console.error("Error fetching summary updater status:", error);
      toast({
        title: "오류",
        description: "상태 정보를 가져오는데 실패했습니다.",
        variant: "destructive",
      });
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
    // Initial fetch with logs
    fetchStatus(true);
    
    // Regular status updates (without logs to reduce bandwidth)
    const interval = setInterval(() => fetchStatus(), 5000);
    
    // Get logs every 30 seconds
    const logInterval = setInterval(() => fetchStatus(true), 30000);
    
    return () => {
      clearInterval(interval);
      clearInterval(logInterval);
    };
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

  const getStatusText = (status: string) => {
    switch (status) {
      case "processing": return "처리 중";
      case "error": return "오류";
      case "idle": return "대기 중";
      default: return "알 수 없음";
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
                <Tabs defaultValue="status" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="status">상태 정보</TabsTrigger>
                    <TabsTrigger value="logs">실행 로그</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="status">
                    <Card>
                      <CardHeader>
                        <CardTitle>프로젝트 요약 생성 상태</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">상태:</span>
                            <Badge variant={getStatusColor(serviceStatus.status)}>
                              {getStatusText(serviceStatus.status)}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">마지막 실행:</span>
                            <span className="text-sm">
                              {serviceStatus.lastRun
                                ? new Date(serviceStatus.lastRun).toLocaleString("ko-KR")
                                : "실행된 적 없음"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">오늘 처리된 프로젝트:</span>
                            <span className="text-sm">{serviceStatus.processedToday}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">오늘 API 호출 수:</span>
                            <span className="text-sm">{serviceStatus.apiCallsToday}</span>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="border-t px-6 py-4">
                        <div className="flex items-center justify-between w-full">
                          <Button disabled={loading} onClick={processProject}>
                            프로젝트 하나 처리
                          </Button>
                          <Button disabled={loading} onClick={(e) => { e.preventDefault(); fetchStatus(true); }}>
                            상태 새로고침
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="logs">
                    <Card>
                      <CardHeader>
                        <CardTitle>프로젝트 요약 생성 로그</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Textarea 
                          value={serviceStatus.logs || "로그가 없습니다."} 
                          readOnly 
                          className="font-mono text-xs h-[400px] overflow-y-auto" 
                        />
                      </CardContent>
                      <CardFooter className="border-t px-6 py-4">
                        <Button 
                          onClick={(e) => { e.preventDefault(); fetchStatus(true); }}
                          disabled={loading}
                        >
                          로그 새로고침
                        </Button>
                      </CardFooter>
                    </Card>
                  </TabsContent>
                </Tabs>
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

"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import {
  RefreshCw, Satellite, Brain, Clock, CheckCircle2,
  XCircle, ChevronDown, ChevronUp, Globe, Zap,
} from "lucide-react"
import Link from "next/link"

interface LogEntry {
  timestamp: string
  type: "crawl" | "summary"
  success: boolean
  message: string
  details?: any
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [crawlLoading, setCrawlLoading] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  const runCrawl = async () => {
    setCrawlLoading(true)
    const ts = new Date().toISOString()
    try {
      const res = await fetch("/api/crawl")
      const data = await res.json()
      setLogs((prev) => [
        {
          timestamp: ts,
          type: "crawl",
          success: data.success,
          message: data.message || data.error || "Unknown",
          details: data.stats || data,
        },
        ...prev,
      ])
    } catch (err: any) {
      setLogs((prev) => [
        { timestamp: ts, type: "crawl", success: false, message: err.message },
        ...prev,
      ])
    } finally {
      setCrawlLoading(false)
    }
  }

  const runSummary = async () => {
    setSummaryLoading(true)
    const ts = new Date().toISOString()
    try {
      const res = await fetch("/api/cron/summary-updater")
      const data = await res.json()
      setLogs((prev) => [
        {
          timestamp: ts,
          type: "summary",
          success: data.success,
          message: data.message || data.error || "Unknown",
          details: data,
        },
        ...prev,
      ])
    } catch (err: any) {
      setLogs((prev) => [
        { timestamp: ts, type: "summary", success: false, message: err.message },
        ...prev,
      ])
    } finally {
      setSummaryLoading(false)
    }
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  }

  return (
    <div className="min-h-screen bg-transparent text-white">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 상단 타이틀 */}
        <div className="mb-8">
          <Link href="/" className="text-cyan-400/60 hover:text-cyan-400 text-sm font-mono mb-2 inline-block transition-colors">
            ← 메인으로 돌아가기
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            <Zap className="inline w-8 h-8 text-cyan-400 mr-2" />
            Activity Log
          </h1>
          <p className="text-gray-400 text-sm">크롤링 및 AI 요약 작업을 실행하고 결과를 실시간으로 확인하세요.</p>
        </div>

        {/* 액션 버튼 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* 크롤링 실행 */}
          <div className="glass-panel rounded-xl p-5 border border-cyan-500/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Satellite className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">프로젝트 크롤링</h3>
                <p className="text-gray-500 text-xs">GitHub에서 새 프로젝트 수집</p>
              </div>
            </div>
            <p className="text-gray-400 text-xs mb-4 leading-relaxed">
              8개 이상의 프로그래밍 언어에서 트렌디한 미완성 프로젝트를 검색하고, 품질 스코어링을 거쳐 DB에 저장합니다.
              실행 시간: 약 30~60초.
            </p>
            <Button
              onClick={runCrawl}
              disabled={crawlLoading}
              className="w-full bg-cyan-950/50 hover:bg-cyan-900/50 border border-cyan-500/30 text-cyan-300"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${crawlLoading ? "animate-spin" : ""}`} />
              {crawlLoading ? "크롤링 중..." : "크롤링 실행"}
            </Button>
          </div>

          {/* AI 요약 실행 */}
          <div className="glass-panel rounded-xl p-5 border border-purple-500/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Brain className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">AI 요약 업데이트</h3>
                <p className="text-gray-500 text-xs">Gemini로 프로젝트 분석</p>
              </div>
            </div>
            <p className="text-gray-400 text-xs mb-4 leading-relaxed">
              아직 AI 요약이 없는 프로젝트 1개를 선택하여 Gemini API로 분석하고, 요약·카테고리·TODO를 생성합니다.
              실행 시간: 약 5~15초.
            </p>
            <Button
              onClick={runSummary}
              disabled={summaryLoading}
              className="w-full bg-purple-950/50 hover:bg-purple-900/50 border border-purple-500/30 text-purple-300"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${summaryLoading ? "animate-spin" : ""}`} />
              {summaryLoading ? "분석 중..." : "AI 요약 실행"}
            </Button>
          </div>
        </div>

        {/* 로그 목록 */}
        <div className="glass-panel rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm text-gray-300 font-mono tracking-wider uppercase">
              <Clock className="inline w-4 h-4 mr-1.5 text-gray-500" />
              실행 로그 ({logs.length})
            </h2>
            {logs.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLogs([])}
                className="text-gray-500 hover:text-gray-300 text-xs"
              >
                로그 초기화
              </Button>
            )}
          </div>

          {logs.length === 0 ? (
            <div className="text-center py-16">
              <Globe className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-600 text-sm">아직 실행된 작업이 없습니다.</p>
              <p className="text-gray-700 text-xs mt-1">위의 버튼을 눌러 크롤링이나 AI 요약을 실행해보세요.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg border transition-all ${
                    log.success
                      ? "border-green-500/10 bg-green-950/10"
                      : "border-red-500/10 bg-red-950/10"
                  }`}
                >
                  {/* 로그 헤더 */}
                  <button
                    onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                    className="w-full flex items-center gap-3 p-3 text-left"
                  >
                    {/* 아이콘 */}
                    {log.success ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                    )}

                    {/* 타입 뱃지 */}
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full shrink-0 ${
                        log.type === "crawl"
                          ? "bg-cyan-500/15 text-cyan-400"
                          : "bg-purple-500/15 text-purple-400"
                      }`}
                    >
                      {log.type === "crawl" ? "CRAWL" : "AI SUMMARY"}
                    </span>

                    {/* 메시지 */}
                    <span className="text-gray-300 text-sm truncate flex-1">{log.message}</span>

                    {/* 시간 */}
                    <span className="text-gray-600 text-xs font-mono shrink-0">{formatTime(log.timestamp)}</span>

                    {/* 확장 아이콘 */}
                    {log.details && (
                      expandedIdx === idx ? (
                        <ChevronUp className="w-4 h-4 text-gray-600 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-600 shrink-0" />
                      )
                    )}
                  </button>

                  {/* 확장된 상세 정보 */}
                  {expandedIdx === idx && log.details && (
                    <div className="px-4 pb-4">
                      <div className="bg-black/40 rounded-lg p-3 overflow-x-auto">
                        <pre className="text-gray-400 text-xs font-mono whitespace-pre-wrap leading-relaxed">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"

interface ServerStatus {
  id: string
  name: string
  cwd: string
  port: number
  startCommand: string
  description?: string
  running: boolean
  pid?: string
  lastRestart?: string
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  restartedAt?: string
}

export default function DevServersAdminPage() {
  const [servers, setServers] = useState<ServerStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string>("")
  const [busyId, setBusyId] = useState<string | null>(null)

  const fetchServers = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/dev-servers")
      const json = (await response.json()) as ApiResponse<ServerStatus[]>
      if (!json.success || !json.data) {
        throw new Error(json.error || "서버 목록을 가져오지 못했습니다")
      }
      setServers(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchServers()
    const interval = setInterval(fetchServers, 10_000)
    return () => clearInterval(interval)
  }, [])

  const restartServer = async (id: string) => {
    setBusyId(id)
    setActionMessage("")
    try {
      const response = await fetch("/api/admin/dev-servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "restart" }),
      })
      const json = (await response.json()) as ApiResponse<ServerStatus>
      if (!json.success || !json.data) {
        throw new Error(json.error || "재기동에 실패했습니다")
      }
      setActionMessage(`${json.data.name} 재기동 완료 (${json.restartedAt})`)
      setServers((prev) => prev.map((srv) => (srv.id === id ? json.data! : srv)))
    } catch (err) {
      setError(err instanceof Error ? err.message : "재기동 중 알 수 없는 오류")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-gray-900">Dev 서버 관리</h1>
          <p className="text-gray-600 mt-2">/dev 하위 로컬 프로젝트 서버 상태 확인 및 재기동</p>
        </header>

        <div className="flex items-center gap-3">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            onClick={fetchServers}
            disabled={loading}
          >
            {loading ? "새로고침 중..." : "새로고침"}
          </button>
          {actionMessage && <p className="text-green-600 text-sm">{actionMessage}</p>}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <div className="grid gap-4">
          {servers.map((server) => (
            <div key={server.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{server.name}</h2>
                  <p className="text-sm text-gray-500">{server.description}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${server.running ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                >
                  {server.running ? `Running (PID ${server.pid})` : "Stopped"}
                </span>
              </div>

              <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-sm text-gray-600">
                <div>
                  <dt className="font-medium text-gray-700">경로</dt>
                  <dd className="font-mono text-xs break-all">{server.cwd}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-700">시작 명령어</dt>
                  <dd className="font-mono text-xs break-all">{server.startCommand}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-700">포트</dt>
                  <dd>{server.port}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-700">마지막 재시작</dt>
                  <dd>{server.lastRestart ? new Date(server.lastRestart).toLocaleString("ko-KR") : "-"}</dd>
                </div>
              </dl>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => restartServer(server.id)}
                  disabled={busyId === server.id}
                  className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
                >
                  {busyId === server.id ? "재기동 중..." : "재기동"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {!servers.length && !loading && (
          <p className="text-center text-gray-500">등록된 서버가 없습니다.</p>
        )}
      </div>
    </div>
  )
}

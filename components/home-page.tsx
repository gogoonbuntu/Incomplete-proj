"use client"

import { useState, useEffect, useCallback } from "react"
import { ProjectCard } from "@/components/project-card"
import { ProjectFilter } from "@/components/project-filter"
import { SearchBar } from "@/components/search-bar"
import { Header } from "@/components/header"
import { LoadingSpinner } from "@/components/loading-spinner"
import { CrawlingLogs } from "@/components/crawling-logs"
import { useAuth } from "@/hooks/use-auth"
import { projectService, type CrawlingProgress } from "@/lib/services/project-service"
import { isFirebaseInitialized } from "@/lib/utils/firebase-client"
import { logger } from "@/lib/services/logger-service"
import type { Project, FilterOptions, SortOption } from "@/types/project"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { RefreshCw, AlertCircle, Activity } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AdBanner } from "@/components/ad-banner"
import { TrendBanner } from "@/components/trend-banner"
import { useLanguage } from "@/hooks/use-language"

export function HomePage() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [projects, setProjects] = useState<Project[]>([])
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(true)
  const [crawling, setCrawling] = useState(false)
  const [crawlingProgress, setCrawlingProgress] = useState<CrawlingProgress | null>(null)
  const [crawlingError, setCrawlingError] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState<FilterOptions>({
    language: "all",
    stars: "all",
    lastUpdate: "all",
    score: "all",
  })
  const [sortBy, setSortBy] = useState<SortOption>("score")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 12

  const [firebaseReady, setFirebaseReady] = useState<boolean>(false)
  const [loadingRetries, setLoadingRetries] = useState<number>(0)
  const [loadingError, setLoadingError] = useState<string>("")
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)
  const [lastLoadTime, setLastLoadTime] = useState<number>(0)
  const [dataLoadSuccess, setDataLoadSuccess] = useState<boolean>(false)

  useEffect(() => {
    setTimeout(() => setLoading(false), 500)

    const checkFirebaseInit = async () => {
      if (isFirebaseInitialized()) {
        setFirebaseReady(true)
        startDataPolling()
        return true
      }
      return false
    }

    checkFirebaseInit().then(initialized => {
      if (!initialized) {
        const interval = setInterval(async () => {
          const success = await checkFirebaseInit()
          if (success) {
            clearInterval(interval)
          }
        }, 1000)
      }
    })

    const retryInterval = setInterval(() => {
      if (!dataLoadSuccess && projects.length === 0) {
        setLoadingRetries(prev => prev + 1)
      } else if (dataLoadSuccess || projects.length > 0) {
        clearInterval(retryInterval)
      }
    }, 2000)

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
      clearInterval(retryInterval)
    }
  }, [dataLoadSuccess, projects.length])

  const startDataPolling = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval)
      setPollingInterval(null)
    }

    const fiveMinutesInMs = 5 * 60 * 1000

    if (dataLoadSuccess && projects.length > 0) {
      logger.info("이미 데이터가 로드되었습니다. 5분 주기 새로고침 설정")
      const interval = setInterval(() => {
        loadProjects(true)
      }, fiveMinutesInMs)
      setPollingInterval(interval)
      return
    }

    loadProjects(false)

    const interval = setInterval(() => {
      if (projects.length > 0 || loadingRetries > 15) {
        clearInterval(interval)
        setPollingInterval(null)
        setDataLoading(false)

        if (projects.length > 0) {
          logger.info("초기 데이터 로드 성공! 2초 폴링 중지, 5분 주기로 전환")
          setDataLoadSuccess(true)
          setLastLoadTime(Date.now())

          setTimeout(() => {
            const refreshInterval = setInterval(() => {
              loadProjects(true)
            }, fiveMinutesInMs)
            setPollingInterval(refreshInterval)
          }, 1000)
        }
      } else {
        loadProjects(false)
      }
    }, 2000)

    setPollingInterval(interval)
  }, [projects.length, dataLoading, loadingRetries, lastLoadTime, dataLoadSuccess])

  useEffect(() => {
    applyFiltersAndSearch()
  }, [projects, filters, searchQuery, sortBy])

  const loadProjects = useCallback(async (silent: boolean = false) => {
    try {
      if (!silent) {
        setDataLoading(true)
      }

      if (!isFirebaseInitialized()) {
        if (!silent) {
          logger.warn("Firebase가 아직 초기화되지 않았습니다. 재시도 예정...")
        }
        return
      }

      if (!silent && !dataLoadSuccess) {
        logger.info("프로젝트 목록 로드 시도 중...")
      }

      const data = await projectService.getProjects()

      if (data.length === 0) {
        if (!silent) {
          logger.warn(`데이터가 없습니다. (시도: ${loadingRetries + 1}번째)`)
          if (loadingRetries >= 15) {
            setLoadingError("데이터를 불러오는데 시간이 오래 걸립니다. 새로고침하거나 다시 시도해주세요.")
          }
        }
      } else {
        setProjects(data)
        setLoadingError("")

        if (!silent) {
          logger.success(`${data.length}개 프로젝트 로드 완료`)
          setDataLoading(false)
        }

        if (!dataLoadSuccess) {
          setDataLoadSuccess(true)
          setLastLoadTime(Date.now())

          if (!silent) {
            logger.info("초기 데이터 로드 성공, 2초 폴링 중단, 5분 폴링으로 전환")
          }
        } else {
          setLastLoadTime(Date.now())
          if (!silent) {
            logger.info("5분 주기 데이터 새로고침 성공")
          }
        }
      }
    } catch (error) {
      if (!silent) {
        logger.error("프로젝트 목록 로드 실패", error)
        if (loadingRetries >= 15) {
          setLoadingError("데이터를 불러오는데 문제가 발생했습니다. 다시 시도해주세요.")
        }
      }
    } finally {
      if (!silent) {
        setLoading(false)
        setLoadingRetries(prev => prev + 1)
      }
    }
  }, [loadingRetries, dataLoadSuccess])

  const triggerCrawling = async () => {
    try {
      setCrawling(true)
      setCrawlingError("")
      setCrawlingProgress(null)

      logger.info("사용자가 크롤링을 시작했습니다")

      projectService.setProgressCallback((progress) => {
        setCrawlingProgress(progress)
      })

      await projectService.triggerCrawling()
      await loadProjects()

      setTimeout(() => {
        setCrawlingProgress(null)
      }, 3000)
    } catch (error: any) {
      logger.error("크롤링 실패", error)
      setCrawlingError("크롤링 중 오류가 발생했습니다. 자세한 내용은 로그를 확인해주세요.")
      setCrawlingProgress(null)
    } finally {
      setCrawling(false)
    }
  }

  const applyFiltersAndSearch = () => {
    let filtered = projects

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (project) =>
          project.title.toLowerCase().includes(query) ||
          project.description.toLowerCase().includes(query) ||
          project.language.toLowerCase().includes(query) ||
          project.topics?.some((topic) => topic.toLowerCase().includes(query)),
      )
    }

    if (filters.language !== "all") {
      filtered = filtered.filter((project) => project.language === filters.language)
    }

    if (filters.stars !== "all") {
      const [min, max] = filters.stars.split("-").map(Number)
      filtered = filtered.filter((project) => {
        if (max) return project.stars >= min && project.stars <= max
        return project.stars >= min
      })
    }

    if (filters.lastUpdate !== "all") {
      const now = new Date()
      filtered = filtered.filter((project) => {
        const updateDate = new Date(project.lastUpdate)
        const diffMonths = (now.getTime() - updateDate.getTime()) / (1000 * 60 * 60 * 24 * 30)

        switch (filters.lastUpdate) {
          case "1m":
            return diffMonths <= 1
          case "3m":
            return diffMonths <= 3
          case "6m":
            return diffMonths <= 6
          case "1y":
            return diffMonths <= 12
          default:
            return true
        }
      })
    }

    if (filters.score !== "all") {
      const minScore = Number.parseInt(filters.score)
      filtered = filtered.filter((project) => project.score >= minScore)
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "score":
          return b.score - a.score
        case "stars":
          return b.stars - a.stars
        case "updated":
          return new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime()
        case "created":
          return new Date(b.createdAt || b.lastUpdate).getTime() - new Date(a.createdAt || a.lastUpdate).getTime()
        default:
          return 0
      }
    })

    const total = Math.ceil(filtered.length / itemsPerPage)
    setTotalPages(total)

    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedProjects = filtered.slice(startIndex, endIndex)

    setFilteredProjects(paginatedProjects)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center space-y-4 h-[50vh]">
            <LoadingSpinner size="lg" className="text-cyan-400" />
            <p className="text-cyan-200 animate-pulse">Initializing Hyperdrive...</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent text-white">
      {/* Header component is already included in layout, but kept here if layout structure differs */}
      {/* <Header /> */} 
      <main className="container mx-auto px-4 py-8">
        <div className="mb-12 relative">
          <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
            <div className="relative z-10">
              <h1 className="text-5xl md:text-6xl font-black mb-4 animate-float title-gradient text-glow">
                {t('title')}
              </h1>
              <p className="text-cyan-100/80 text-lg max-w-2xl backdrop-blur-sm bg-black/20 p-2 rounded-lg border-l-2 border-cyan-500 font-light tracking-wide">
                {t('subtitle')}
              </p>
            </div>
            <Button 
              onClick={triggerCrawling} 
              disabled={crawling} 
              className="relative overflow-hidden group bg-cyan-950/50 hover:bg-cyan-900/50 border border-cyan-500/50 text-cyan-300 transition-all hover:shadow-[0_0_20px_rgba(0,243,255,0.3)] h-14 px-8"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              <RefreshCw className={`h-5 w-5 mr-3 ${crawling ? "animate-spin" : ""}`} />
              <span className="font-mono tracking-widest text-base">{crawling ? t('scanning') : t('scanButton')}</span>
            </Button>
          </div>



          {/* 트렌드 통계 배너 */}
          {projects.length > 0 && <TrendBanner projects={projects} />}

          {crawlingProgress && (
            <Alert className="mb-6 border-cyan-500/30 bg-cyan-950/40 backdrop-blur-md">
              <Activity className="h-4 w-4 text-cyan-400 animate-pulse" />
              <AlertDescription className="text-cyan-100">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-cyan-300 uppercase tracking-tighter">System Scan: {crawlingProgress.step}</span>
                    <span className="font-mono text-cyan-300">{Math.round(crawlingProgress.current)}%</span>
                  </div>
                  <Progress value={crawlingProgress.current} className="w-full h-1.5 bg-black/50" indicatorClassName="bg-cyan-400" />
                </div>
              </AlertDescription>
            </Alert>
          )}

          {crawlingError && (
            <Alert className="mb-6 border-red-500/30 bg-red-950/40 backdrop-blur-md">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-200 font-mono text-xs">{crawlingError}</AlertDescription>
            </Alert>
          )}

          <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder={t('searchPlaceholder')} className="bg-black/30 border-white/10 text-white placeholder:text-gray-500 focus:border-cyan-500/50 transition-all py-6 text-lg" />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl mb-8 border-white/5">
          <ProjectFilter filters={filters} onFiltersChange={setFilters} sortBy={sortBy} onSortChange={setSortBy} />
        </div>

        {/* ... (Error, Loading, List logic remains same) ... */}

        {dataLoading && projects.length === 0 ? (
          /* (Loading logic) */
          <div className="text-center py-24 space-y-6">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-cyan-500 blur-xl opacity-20 animate-pulse" />
              <LoadingSpinner size="lg" className="text-cyan-400 relative z-10" />
            </div>
            <p className="text-cyan-200 text-xl font-light tracking-widest font-mono uppercase">Syncing Galaxy Data...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-24 glass-panel rounded-2xl border-dashed border-2 border-white/10">
            <p className="text-gray-400 text-xl font-light tracking-widest font-mono uppercase">0 {t('signalsDetected')}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProjects.slice(0, Math.ceil(filteredProjects.length / 2)).map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>

            {filteredProjects.length > 3 && <AdBanner adSlot="2345678901" className="my-12 glass-panel rounded-xl overflow-hidden border-none" format="horizontal" />}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8">
              {filteredProjects.slice(Math.ceil(filteredProjects.length / 2)).map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>

            <AdBanner adSlot="3456789012" className="mt-12 glass-panel rounded-xl overflow-hidden border-none" />
          </>
        )}

        {/* 하단: 엔진 로그 + Activity 버튼 */}
        <div className="mt-24 opacity-30 hover:opacity-100 transition-opacity duration-500 border-t border-white/5 pt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-mono text-gray-500 tracking-[0.3em] uppercase">Engine Execution Logs</h3>
            <a
              href="/activity"
              className="text-[11px] font-mono text-gray-600 hover:text-cyan-400 border border-gray-800 hover:border-cyan-500/30 px-3 py-1.5 rounded-lg transition-all"
            >
              ⚡ Activity Log →
            </a>
          </div>
          <CrawlingLogs />
        </div>
      </main>
    </div>
  )
}


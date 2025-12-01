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

export function HomePage() {
  const { user } = useAuth()
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
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            <LoadingSpinner size="lg" />
            <p className="text-gray-600">페이지를 불러오는 중입니다...</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">미완성 프로젝트 게시판</h1>
              <p className="text-gray-600">GitHub의 미완성 프로젝트들을 발견하고 이어서 개발해보세요</p>
            </div>
            <Button onClick={triggerCrawling} disabled={crawling} className="flex items-center space-x-2">
              <RefreshCw className={`h-4 w-4 ${crawling ? "animate-spin" : ""}`} />
              <span>{crawling ? "크롤링 중..." : "새 프로젝트 수집"}</span>
            </Button>
          </div>

          <AdBanner adSlot="1234567890" className="mb-6" />

          {crawlingProgress && (
            <Alert className="mb-4 border-blue-200 bg-blue-50">
              <Activity className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{crawlingProgress.step}</span>
                    <span className="text-sm">{Math.round(crawlingProgress.current)}%</span>
                  </div>
                  <Progress value={crawlingProgress.current} className="w-full" />
                  <p className="text-sm">{crawlingProgress.details}</p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {crawlingError && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{crawlingError}</AlertDescription>
            </Alert>
          )}

          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="프로젝트 제목, 설명, 언어로 검색..." />
        </div>

        <CrawlingLogs />

        <ProjectFilter filters={filters} onFiltersChange={setFilters} sortBy={sortBy} onSortChange={setSortBy} />

        {loadingError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 my-4">
            <p className="text-red-600">{loadingError}</p>
            <div className="flex space-x-2 mt-2">
              <Button variant="outline" onClick={() => {
                setLoadingRetries(0)
                setLoadingError("")
                startDataPolling()
              }}>
                다시 시도
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                페이지 새로고침
              </Button>
            </div>
          </div>
        )}

        <div className="mb-4 flex justify-between items-center">
          {dataLoading && projects.length === 0 ? (
            <div className="flex items-center space-x-2">
              <LoadingSpinner size="sm" className="my-0 py-0" />
              <p className="text-gray-600">
                프로젝트 목록을 불러오는 중... {loadingRetries > 1 ? `(시도: ${loadingRetries}번째)` : ""}
              </p>
            </div>
          ) : (
            <p className="text-gray-600">
              총 {projects.length}개 프로젝트 중 {filteredProjects.length}개 표시
            </p>
          )}
          {totalPages > 1 && (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                이전
              </Button>
              <span className="text-sm text-gray-600">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                다음
              </Button>
            </div>
          )}
        </div>

        {dataLoading && projects.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <LoadingSpinner size="lg" />
            <p className="text-gray-500 text-lg">프로젝트 데이터를 불러오는 중입니다...</p>
            <p className="text-gray-400 text-sm">첫 로딩은 시간이 조금 걸릴 수 있습니다.</p>
            {loadingRetries > 10 && (
              <Button variant="outline" onClick={() => {
                setLoadingRetries(0)
                setLoadingError("")
                startDataPolling()
              }} className="mt-2">
                다시 시도
              </Button>
            )}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">조건에 맞는 프로젝트가 없습니다.</p>
            {searchQuery && (
              <Button variant="outline" onClick={() => setSearchQuery("")} className="mt-4">
                검색 초기화
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg-grid-cols-3 gap-6">
              {filteredProjects.slice(0, Math.ceil(filteredProjects.length / 2)).map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>

            {filteredProjects.length > 3 && <AdBanner adSlot="2345678901" className="my-8" format="horizontal" />}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
              {filteredProjects.slice(Math.ceil(filteredProjects.length / 2)).map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>

            <AdBanner adSlot="3456789012" className="mt-8" />
          </>
        )}
      </main>
    </div>
  )
}


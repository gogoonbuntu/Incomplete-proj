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
import { firebaseServicePromise } from '@/lib/services/firebase-service';
import { isFirebaseInitialized } from '@/lib/utils/firebase-client';
import { logger } from "@/lib/services/logger-service"
import type { Project, FilterOptions, SortOption } from "@/types/project"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { RefreshCw, AlertCircle, Activity, Info } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AdBanner } from "@/components/ad-banner"

export default function HomePage() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true) // 페이지 전체 로딩 상태
  const [dataLoading, setDataLoading] = useState(true) // 프로젝트 데이터만의 로딩 상태
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
  
  // Firebase 초기화 및 데이터 로딩 관련 상태
  const [firebaseReady, setFirebaseReady] = useState<boolean>(false)
  const [loadingRetries, setLoadingRetries] = useState<number>(0)
  const [loadingError, setLoadingError] = useState<string>("") 
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)
  const [lastLoadTime, setLastLoadTime] = useState<number>(0) // 마지막 데이터 로딩 시간 기록
  const [dataLoadSuccess, setDataLoadSuccess] = useState<boolean>(false) // 데이터 로드 성공 표시

  // Firebase 초기화 및 초기 데이터 로딩 설정
  useEffect(() => {
    // 페이지 로딩은 빠르게 완료
    setTimeout(() => setLoading(false), 500);

    // Firebase 초기화 확인 함수
    const checkFirebaseInit = async () => {
      if (isFirebaseInitialized()) {
        setFirebaseReady(true)
        // 폴링 시작
        startDataPolling()
        return true
      } 
      return false
    }

    // 처음에 한 번 확인
    checkFirebaseInit().then(initialized => {
      if (!initialized) {
        // 초기화가 안되어 있으면 폴링 시작
        const interval = setInterval(async () => {
          const success = await checkFirebaseInit()
          if (success) {
            clearInterval(interval) // 초기화가 완료되면 이 폴링 중지
          }
        }, 1000)
      }
    })

    // 로딩 시도 횟수 카운터 - 초기 로딩에만 사용
    const retryInterval = setInterval(() => {
      // 이미 데이터가 로드되거나, 성공 플래그가 설정된 경우에는 더 이상 증가시키지 않음
      if (!dataLoadSuccess && projects.length === 0) {
        setLoadingRetries(prev => prev + 1)
      } else if (dataLoadSuccess || projects.length > 0) {
        // 데이터 로드 성공 시 이 인터벌 중지
        clearInterval(retryInterval)
      }
    }, 2000)

    // 컴포넌트 언마운트 시 정리
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
      clearInterval(retryInterval)
    }
  }, [dataLoadSuccess, projects.length]) // 마운트 시 및 데이터 상태 변화 시 실행
  
  // 데이터 폴링 시작 함수
  const startDataPolling = useCallback(() => {
    // 기존 폴링이 있으면 정리
    if (pollingInterval) {
      clearInterval(pollingInterval)
      setPollingInterval(null)
    }
    
    const fiveMinutesInMs = 5 * 60 * 1000 // 5분을 밀리초로 변환
    
    // 이미 데이터 로드에 성공한 적이 있는지 확인
    if (dataLoadSuccess && projects.length > 0) {
      // 이미 성공했다면 5분 주기 폴링 설정
      logger.info("이미 데이터가 로드되었습니다. 5분 주기 새로고침 설정")
      
      // 5분 주기 새로고침 폴링
      const interval = setInterval(() => {
        // 조용한 모드로 로드 (로그 및 UI 로딩 표시 없음)
        loadProjects(true)
      }, fiveMinutesInMs)
      
      setPollingInterval(interval)
      return
    }

    // 초기 로드 한 번 시도
    loadProjects(false)
    
    // 2초마다 폴링하여 초기 데이터 로드 확인
    const interval = setInterval(() => {
      // 데이터가 있거나 시도가 너무 많으면 중지
      if (projects.length > 0 || loadingRetries > 15) {
        // 폴링 중지
        clearInterval(interval)
        setPollingInterval(null)
        setDataLoading(false)
        
        // 데이터가 성공적으로 로드된 경우
        if (projects.length > 0) {
          // 초기 데이터 로드 성공 처리
          logger.info("초기 데이터 로드 성공! 2초 폴링 중지, 5분 주기로 전환")
          
          // 성공 표시 및 마지막 시간 기록
          setDataLoadSuccess(true)
          setLastLoadTime(Date.now())
          
          // 1초 후에 5분 주기 폴링 시작
          setTimeout(() => {
            const refreshInterval = setInterval(() => {
              loadProjects(true) // 조용한 모드
            }, fiveMinutesInMs)
            setPollingInterval(refreshInterval)
          }, 1000)
        }
      } else {
        // 데이터가 없으면 계속 시도
        loadProjects(false)
      }
    }, 2000) // 2초마다 폴링
    
    setPollingInterval(interval)
  }, [projects.length, dataLoading, loadingRetries, lastLoadTime, dataLoadSuccess])

  useEffect(() => {
    applyFiltersAndSearch()
  }, [projects, filters, searchQuery, sortBy])

  const loadProjects = useCallback(async (silent: boolean = false) => {
    try {
      // 데이터 로딩 상태 처리 - silent 모드에서는 UI 상태 변경 없음
      if (!silent) {
        setDataLoading(true)
      }
      
      // Firebase 초기화 확인
      if (!isFirebaseInitialized()) {
        if (!silent) {
          logger.warn("Firebase가 아직 초기화되지 않았습니다. 재시도 예정...")
        }
        return
      }
      
      // 초기 로드일 때만 로그 메시지 표시
      if (!silent && !dataLoadSuccess) {
        logger.info("프로젝트 목록 로드 시도 중...")
      }
      
      // 프로젝트 데이터 가져오기
      const data = await projectService.getProjects()
      
      if (data.length === 0) {
        // 데이터가 없는 경우
        if (!silent) {
          logger.warn(`데이터가 없습니다. (시도: ${loadingRetries + 1}번째)`)
          
          // 15회 이상 시도했으면 오류 메시지 표시
          if (loadingRetries >= 15) {
            setLoadingError("데이터를 불러오는데 시간이 오래 걸립니다. 새로고침하거나 다시 시도해주세요.")
          }
        }
      } else {
        // 데이터 로드 성공
        setProjects(data)
        setLoadingError("") // 이전 오류 메시지 제거
        
        // 성공 로그는 조용한 모드일 때는 출력하지 않음
        if (!silent) {
          logger.success(`${data.length}개 프로젝트 로드 완료`)
          setDataLoading(false) // UI 로드 상태 해제
        }
        
        // 초기 데이터 로드였는지 확인
        if (!dataLoadSuccess) {
          // 성공 플래그 설정 및 로드 시간 기록
          setDataLoadSuccess(true)
          setLastLoadTime(Date.now())
          
          if (!silent) {
            // 2초 폴링 중단, 5분 폴링으로 전환 로그
            logger.info("초기 데이터 로드 성공, 2초 폴링 중단, 5분 폴링으로 전환")
          }
        } else {
          // 이미 성공한 경우는 마지막 로드 시간만 갱신
          setLastLoadTime(Date.now())
          
          // 조용한 모드가 아닐 경우에만 갱신 로그 출력
          if (!silent) {
            logger.info("5분 주기 데이터 새로고침 성공")
          }
        }
      }
    } catch (error) {
      // 오류 로그는 조용한 모드일 때 출력하지 않음
      if (!silent) {
        logger.error("프로젝트 목록 로드 실패", error)
        
        // 오류 때도 횟수가 많으면 오류 메시지 표시
        if (loadingRetries >= 15) {
          setLoadingError("데이터를 불러오는데 문제가 발생했습니다. 다시 시도해주세요.")
        }
      }
    } finally {
      // 페이지 전체 로딩은 별도로 처리
      if (!silent) {
        setLoading(false)
        
        // 초기 로딩일 때만 시도 횟수 증가 (백그라운드 새로고침에서는 증가시키지 않음)
        setLoadingRetries(prev => prev + 1)
      }
    }
  }, [loadingRetries, dataLoadSuccess]);

  const triggerCrawling = async () => {
    try {
      setCrawling(true)
      setCrawlingError("")
      setCrawlingProgress(null)

      logger.info("사용자가 크롤링을 시작했습니다")

      // 진행 상황 콜백 설정
      projectService.setProgressCallback((progress) => {
        setCrawlingProgress(progress)
      })

      await projectService.triggerCrawling()

      // 성공 후 프로젝트 목록 새로고침
      await loadProjects()

      // 성공 메시지를 3초 후 제거
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

    // Search filter
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

    // Language filter
    if (filters.language !== "all") {
      filtered = filtered.filter((project) => project.language === filters.language)
    }

    // Stars filter
    if (filters.stars !== "all") {
      const [min, max] = filters.stars.split("-").map(Number)
      filtered = filtered.filter((project) => {
        if (max) return project.stars >= min && project.stars <= max
        return project.stars >= min
      })
    }

    // Last update filter
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

    // Score filter
    if (filters.score !== "all") {
      const minScore = Number.parseInt(filters.score)
      filtered = filtered.filter((project) => project.score >= minScore)
    }

    // Sort
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

    // Pagination
    const total = Math.ceil(filtered.length / itemsPerPage)
    setTotalPages(total)

    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedProjects = filtered.slice(startIndex, endIndex)

    setFilteredProjects(paginatedProjects)
  }

  // 페이지 전체 로딩 중일 때
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            <LoadingSpinner size="lg" />
            <p className="text-gray-600">
              페이지를 불러오는 중입니다...
            </p>
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

          {/* 상단 광고 배너 추가 */}
          <AdBanner adSlot="1234567890" className="mb-6" />

          {/* 크롤링 진행 상황 */}
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

        {/* 실행 로그 컴포넌트 */}
        <CrawlingLogs />
        
        <ProjectFilter filters={filters} onFiltersChange={setFilters} sortBy={sortBy} onSortChange={setSortBy} />
        
        {loadingError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 my-4">
            <p className="text-red-600">{loadingError}</p>
            <div className="flex space-x-2 mt-2">
              <Button variant="outline" onClick={() => {
                setLoadingRetries(0);
                setLoadingError("");
                startDataPolling();
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.slice(0, Math.ceil(filteredProjects.length / 2)).map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>

            {/* 중간 광고 배너 */}
            {filteredProjects.length > 3 && <AdBanner adSlot="2345678901" className="my-8" format="horizontal" />}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
              {filteredProjects.slice(Math.ceil(filteredProjects.length / 2)).map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>

            {/* 하단 광고 배너 */}
            <AdBanner adSlot="3456789012" className="mt-8" />
          </>
        )}
      </main>
    </div>
  )
}

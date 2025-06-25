"use client"

import { useState, useEffect } from "react"
import { ProjectCard } from "@/components/project-card"
import { ProjectFilter } from "@/components/project-filter"
import { SearchBar } from "@/components/search-bar"
import { Header } from "@/components/header"
import { LoadingSpinner } from "@/components/loading-spinner"
import { CrawlingLogs } from "@/components/crawling-logs"
import { useAuth } from "@/hooks/use-auth"
import { projectService, type CrawlingProgress } from "@/lib/services/project-service"
import { firebaseServicePromise } from '@/lib/services/firebase-service';
import { logger } from "@/lib/services/logger-service"
import type { Project, FilterOptions, SortOption } from "@/types/project"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { RefreshCw, AlertCircle, Activity } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AdBanner } from "@/components/ad-banner"

export default function HomePage() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
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

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    applyFiltersAndSearch()
  }, [projects, filters, searchQuery, sortBy])

  const loadProjects = async () => {
    try {
      setLoading(true)
      logger.info("프로젝트 목록 로드 시작")
      const data = await projectService.getProjects()
      setProjects(data)
      logger.success(`${data.length}개 프로젝트 로드 완료`)
    } catch (error) {
      logger.error("프로젝트 목록 로드 실패", error)
    } finally {
      setLoading(false)
    }
  }

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <LoadingSpinner />
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

        <div className="mb-4 flex justify-between items-center">
          <p className="text-gray-600">
            총 {projects.length}개 프로젝트 중 {filteredProjects.length}개 표시
          </p>
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

        {filteredProjects.length === 0 ? (
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

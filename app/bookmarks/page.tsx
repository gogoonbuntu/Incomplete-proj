"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { ProjectCard } from "@/components/project-card"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { projectService } from "@/lib/services/project-service"
import type { Project } from "@/types/project"
import { Bookmark, Heart } from "lucide-react"
import { AdBanner } from "@/components/ad-banner"

export default function BookmarksPage() {
  const { user, loading: authLoading } = useAuth()
  const [bookmarkedProjects, setBookmarkedProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadBookmarkedProjects()
    } else if (!authLoading) {
      setLoading(false)
    }
  }, [user, authLoading])

  const loadBookmarkedProjects = async () => {
    if (!user) return

    try {
      setLoading(true)
      const projects = await projectService.getBookmarkedProjects(user.uid)
      setBookmarkedProjects(projects)
    } catch (error) {
      console.error("Failed to load bookmarked projects:", error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <LoadingSpinner />
        </main>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">로그인이 필요합니다</h1>
            <p className="text-gray-500 mb-6">북마크 기능을 사용하려면 로그인해주세요</p>
            <Button onClick={() => (window.location.href = "/")}>홈으로 돌아가기</Button>
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
          <div className="flex items-center space-x-2 mb-2">
            <Bookmark className="h-6 w-6 text-yellow-500" />
            <h1 className="text-3xl font-bold text-gray-900">북마크한 프로젝트</h1>
          </div>
          <p className="text-gray-600">관심있는 프로젝트들을 모아보세요</p>
        </div>

        {/* 북마크 페이지 상단 광고 */}
        <AdBanner adSlot="6789012345" className="mb-8" />

        {bookmarkedProjects.length === 0 ? (
          <div className="text-center py-12">
            <Bookmark className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">북마크한 프로젝트가 없습니다</h2>
            <p className="text-gray-500 mb-6">관심있는 프로젝트를 북마크하여 나중에 쉽게 찾아보세요</p>
            <Button asChild>
              <a href="/">프로젝트 둘러보기</a>
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex justify-between items-center">
              <p className="text-gray-600">총 {bookmarkedProjects.length}개의 북마크된 프로젝트</p>
              <Button variant="outline" onClick={loadBookmarkedProjects}>
                새로고침
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bookmarkedProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

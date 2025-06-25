"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import {
  ArrowLeft,
  Star,
  GitFork,
  Calendar,
  ExternalLink,
  Code,
  FileText,
  CheckSquare,
  Bookmark,
  Eye,
  Users,
  GitCommit,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useBookmarks } from "@/hooks/use-bookmarks"
import { projectService } from "@/lib/services/project-service"
import { firebaseServicePromise } from '@/lib/services/firebase-service';
import type { Project } from "@/types/project"
import { AdBanner } from "@/components/ad-banner"

export default function ProjectDetailPage() {
  const params = useParams()
  const { user } = useAuth()
  const { isBookmarked, addBookmark, removeBookmark } = useBookmarks()
  const [project, setProject] = useState<Project | null>(null)
  const [recommendedProjects, setRecommendedProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [bookmarkLoading, setBookmarkLoading] = useState(false)

  useEffect(() => {
    loadProject()
  }, [params.id])

  useEffect(() => {
    if (project && user) {
      loadRecommendations()
    }
  }, [project, user])

  const loadProject = async () => {
    try {
      setLoading(true)
      const projectId = params.id as string
      const projectData = await projectService.getProject(projectId)
      setProject(projectData)
    } catch (error) {
      console.error("Failed to load project:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadRecommendations = async () => {
    if (!user || !project) return

    try {
      const recommendations = await projectService.getRecommendedProjects(user.uid, project.id)
      setRecommendedProjects(recommendations)
    } catch (error) {
      console.error("Failed to load recommendations:", error)
    }
  }

  const handleBookmark = async () => {
    if (!user || !project) return

    try {
      setBookmarkLoading(true)
      if (isBookmarked(project.id)) {
        await removeBookmark(project.id)
      } else {
        await addBookmark(project.id)
      }
    } catch (error) {
      console.error("Failed to toggle bookmark:", error)
    } finally {
      setBookmarkLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getScoreColor = (score: number) => {
    if (score >= 9) return "bg-green-100 text-green-800"
    if (score >= 7) return "bg-yellow-100 text-yellow-800"
    return "bg-red-100 text-red-800"
  }

  const getScoreProgress = (score: number) => {
    return (score / 12) * 100 // Assuming max score is 12
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

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">프로젝트를 찾을 수 없습니다</h1>
            <Button asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                홈으로 돌아가기
              </Link>
            </Button>
          </div>
        </main>
      </div>
    )
  }

  const bookmarked = user ? isBookmarked(project.id) : false

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button asChild variant="ghost" className="mb-4">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              프로젝트 목록으로
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 메인 콘텐츠 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 프로젝트 헤더 */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-2xl font-bold mb-2">{project.title}</CardTitle>
                    <div className="flex items-center space-x-2 mb-4 flex-wrap gap-2">
                      <Badge variant="secondary">{project.language}</Badge>
                      <Badge className={getScoreColor(project.score)}>점수 {project.score}</Badge>
                      {project.categories?.map((category) => (
                        <Badge key={category} variant="outline">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {user && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBookmark}
                      disabled={bookmarkLoading}
                      className={bookmarked ? "text-yellow-500 border-yellow-500" : ""}
                    >
                      <Bookmark className="h-4 w-4 mr-1" fill={bookmarked ? "currentColor" : "none"} />
                      북마크
                    </Button>
                  )}
                </div>

                <p className="text-gray-600 leading-relaxed mb-4">{project.description}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4" />
                    <span>{project.stars} stars</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <GitFork className="h-4 w-4" />
                    <span>{project.forks} forks</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Eye className="h-4 w-4" />
                    <span>{project.views || 0} views</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(project.lastUpdate)}</span>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* 점수 상세 분석 */}
            {project.scoreBreakdown && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckSquare className="mr-2 h-5 w-5" />
                    점수 분석
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">전체 점수</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={getScoreProgress(project.score)} className="w-24" />
                        <span className="text-sm font-bold">{project.score}/12</span>
                      </div>
                    </div>

                    {Object.entries(project.scoreBreakdown).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 capitalize">
                          {key === "commits"
                            ? "커밋"
                            : key === "popularity"
                              ? "인기도"
                              : key === "documentation"
                                ? "문서화"
                                : key === "structure"
                                  ? "구조"
                                  : key === "activity"
                                    ? "활동성"
                                    : key === "potential"
                                      ? "잠재력"
                                      : key}
                        </span>
                        <div className="flex items-center space-x-2">
                          <Progress value={(value / 3) * 100} className="w-16" />
                          <span className="text-sm">{value}/3</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {project.scoreReasoning && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="text-sm font-medium mb-2">분석 근거</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {project.scoreReasoning.map((reason, index) => (
                          <li key={index} className="flex items-start space-x-1">
                            <span className="text-gray-400 mt-0.5">•</span>
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* README 요약 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="mr-2 h-5 w-5" />
                  AI 요약
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-600 leading-relaxed">
                    {project.readmeSummary ||
                      (!process.env.NEXT_PUBLIC_GEMINI_API_KEY
                        ? "Gemini API 키가 설정되지 않아 AI 요약을 생성할 수 없습니다."
                        : "AI 요약을 생성하는 중입니다...")}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* TODO 리스트 */}
            {project.todos && project.todos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckSquare className="mr-2 h-5 w-5" />
                    완성을 위한 TODO 리스트
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {project.todos.map((todo, index) => (
                      <li key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                          {index + 1}
                        </div>
                        <span className="text-gray-700 leading-relaxed">{todo}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* 프로젝트 구조 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Code className="mr-2 h-5 w-5" />
                  예상 프로젝트 구조
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                  <div className="space-y-1">
                    <div className="text-blue-400">📁 {project.repo}/</div>
                    <div className="ml-4 text-green-400">📁 src/</div>
                    <div className="ml-8 text-gray-300">
                      📄 index.
                      {project.language === "JavaScript"
                        ? "js"
                        : project.language === "TypeScript"
                          ? "ts"
                          : project.language === "Python"
                            ? "py"
                            : project.language === "Java"
                              ? "java"
                              : project.language === "Go"
                                ? "go"
                                : project.language === "Rust"
                                  ? "rs"
                                  : "js"}
                    </div>
                    <div className="ml-8 text-green-400">📁 components/</div>
                    <div className="ml-8 text-green-400">📁 utils/</div>
                    {project.language === "JavaScript" || project.language === "TypeScript" ? (
                      <>
                        <div className="ml-8 text-green-400">📁 hooks/</div>
                        <div className="ml-8 text-green-400">📁 pages/</div>
                      </>
                    ) : null}
                    <div className="ml-4 text-gray-300">📄 README.md</div>
                    {project.language === "JavaScript" || project.language === "TypeScript" ? (
                      <div className="ml-4 text-gray-300">📄 package.json</div>
                    ) : project.language === "Python" ? (
                      <div className="ml-4 text-gray-300">📄 requirements.txt</div>
                    ) : project.language === "Rust" ? (
                      <div className="ml-4 text-gray-300">📄 Cargo.toml</div>
                    ) : project.language === "Go" ? (
                      <div className="ml-4 text-gray-300">📄 go.mod</div>
                    ) : (
                      <div className="ml-4 text-gray-300">📄 config</div>
                    )}
                    <div className="ml-4 text-gray-300">📄 .gitignore</div>
                    {project.license && <div className="ml-4 text-gray-300">📄 LICENSE</div>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 하단 광고 배너 */}
            <AdBanner adSlot="5678901234" format="horizontal" />
          </div>

          {/* 사이드바 */}
          <div className="space-y-6">
            {/* 사이드바 광고 배너 */}
            <AdBanner adSlot="4567890123" format="vertical" className="hidden lg:block" />

            {/* 액션 버튼들 */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <Button asChild className="w-full">
                    <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      GitHub에서 보기
                    </a>
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <a href={`${project.githubUrl}/fork`} target="_blank" rel="noopener noreferrer">
                      <GitFork className="mr-2 h-4 w-4" />
                      Fork하여 이어서 개발
                    </a>
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <a href={`${project.githubUrl}/issues`} target="_blank" rel="noopener noreferrer">
                      <Users className="mr-2 h-4 w-4" />
                      이슈 및 토론 참여
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 프로젝트 정보 */}
            <Card>
              <CardHeader>
                <CardTitle>프로젝트 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">언어</h4>
                  <p className="text-gray-600">{project.language}</p>
                </div>
                <Separator />
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">라이선스</h4>
                  <p className="text-gray-600">{project.license || "명시되지 않음"}</p>
                </div>
                <Separator />
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">커밋 수</h4>
                  <div className="flex items-center space-x-1">
                    <GitCommit className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-600">{project.commits || "알 수 없음"}개</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">예상 코드 라인 수</h4>
                  <p className="text-gray-600">약 {project.linesOfCode || "500"}줄</p>
                </div>
                <Separator />
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">생성일</h4>
                  <p className="text-gray-600">{formatDate(project.createdAt || project.lastUpdate)}</p>
                </div>
              </CardContent>
            </Card>

            {/* 추천 프로젝트 */}
            {recommendedProjects.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>추천 프로젝트</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recommendedProjects.slice(0, 3).map((recommendedProject) => (
                      <Link
                        key={recommendedProject.id}
                        href={`/project/${recommendedProject.id}`}
                        className="block p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                      >
                        <h4 className="font-medium text-sm line-clamp-1">{recommendedProject.title}</h4>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{recommendedProject.description}</p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary" className="text-xs">
                              {recommendedProject.language}
                            </Badge>
                            <span className="text-xs text-gray-400">⭐ {recommendedProject.stars}</span>
                          </div>
                          <Badge className={`text-xs ${getScoreColor(recommendedProject.score)}`}>
                            {recommendedProject.score}
                          </Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

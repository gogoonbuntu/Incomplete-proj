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
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <LoadingSpinner className="text-cyan-400" />
          <p className="text-cyan-200 mt-4 animate-pulse font-mono">ESTABLISHING DATA LINK...</p>
        </main>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-transparent">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-24 glass-panel rounded-2xl">
            <h1 className="text-2xl font-bold text-white mb-4">COORDINATES LOST: PROJECT NOT FOUND</h1>
            <Button asChild className="bg-cyan-600 hover:bg-cyan-500">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                RETURN TO SECTOR MAP
              </Link>
            </Button>
          </div>
        </main>
      </div>
    )
  }

  const bookmarked = user ? isBookmarked(project.id) : false

  return (
    <div className="min-h-screen bg-transparent text-white">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button asChild variant="ghost" className="mb-4 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/30">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              BACK TO GALAXY MAP
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 메인 콘텐츠 */}
          <div className="lg:col-span-2 space-y-8">
            {/* 프로젝트 헤더 */}
            <Card className="glass-panel border-none overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 pointer-events-none" />
              <CardHeader className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <CardTitle className="text-4xl font-black mb-4 title-gradient text-glow uppercase tracking-tight">{project.title}</CardTitle>
                    <div className="flex items-center space-x-3 mb-4 flex-wrap gap-2">
                      <Badge variant="outline" className="border-cyan-500/50 text-cyan-300 bg-cyan-950/30">{project.language}</Badge>
                      <Badge className={`border-none shadow-[0_0_10px_rgba(188,19,254,0.5)] bg-purple-600 text-white`}>RANK SCORE {project.score}</Badge>
                      {project.categories?.map((category) => (
                        <Badge key={category} variant="outline" className="border-white/10 text-gray-400 bg-white/5">
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
                      className={`border-cyan-500/30 bg-cyan-950/20 ${bookmarked ? "text-yellow-400 border-yellow-500/50 shadow-[0_0_10px_rgba(250,204,21,0.2)]" : "text-cyan-400 hover:text-white"}`}
                    >
                      <Bookmark className="h-4 w-4 mr-2" fill={bookmarked ? "currentColor" : "none"} />
                      {bookmarked ? "STATIONED" : "BOOKMARK"}
                    </Button>
                  )}
                </div>

                <p className="text-gray-300 text-lg leading-relaxed mb-8 font-light italic border-l-4 border-cyan-500/30 pl-6">
                  {project.description}
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                  <div className="flex flex-col items-center p-3 rounded-lg bg-black/20 border border-white/5">
                    <Star className="h-5 w-5 text-yellow-400 mb-1" />
                    <span className="font-mono text-gray-400">STARS</span>
                    <span className="font-bold text-white text-lg">{project.stars}</span>
                  </div>
                  <div className="flex flex-col items-center p-3 rounded-lg bg-black/20 border border-white/5">
                    <GitFork className="h-5 w-5 text-blue-400 mb-1" />
                    <span className="font-mono text-gray-400">FORKS</span>
                    <span className="font-bold text-white text-lg">{project.forks}</span>
                  </div>
                  <div className="flex flex-col items-center p-3 rounded-lg bg-black/20 border border-white/5">
                    <Eye className="h-5 w-5 text-green-400 mb-1" />
                    <span className="font-mono text-gray-400">VIEWS</span>
                    <span className="font-bold text-white text-lg">{project.views || 0}</span>
                  </div>
                  <div className="flex flex-col items-center p-3 rounded-lg bg-black/20 border border-white/5">
                    <Calendar className="h-5 w-5 text-pink-400 mb-1" />
                    <span className="font-mono text-gray-400">SYNCED</span>
                    <span className="font-bold text-white text-sm">{formatDate(project.lastUpdate)}</span>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* AI 요약 & 기술 리포트 (통합) */}
            <Card className="glass-panel border-none overflow-hidden">
              <CardHeader className="border-b border-white/5 bg-white/5">
                <CardTitle className="flex items-center text-cyan-400 font-mono tracking-widest text-sm uppercase">
                  <FileText className="mr-2 h-5 w-5 animate-pulse" />
                  Principal Architect Engineering Report
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-8 space-y-8">
                {project.enhancedDescription ? (
                  <div className="space-y-10">
                    {/* Summary Section */}
                    <section>
                      <h3 className="text-xs font-bold text-purple-400 mb-4 tracking-[0.2em] uppercase border-b border-purple-500/20 pb-2">I. Executive Summary</h3>
                      <div className="text-gray-200 leading-relaxed text-lg font-light bg-purple-500/5 p-6 rounded-xl border border-purple-500/10">
                        {project.enhancedDescription.match(/KOREAN SUMMARY:\s*([\s\S]*?)(?=\n\n|ENGLISH SUMMARY:|FEATURES:|TECHNICAL:|$)/)?.[1]?.trim() || project.enhancedDescription}
                      </div>
                    </section>

                    {/* Features Section */}
                    <section>
                      <h3 className="text-xs font-bold text-cyan-400 mb-4 tracking-[0.2em] uppercase border-b border-cyan-500/20 pb-2">II. Technical Features</h3>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {project.enhancedDescription.match(/FEATURES:\s*([\s\S]*?)(?=\n\n|TECHNICAL:|CATEGORIES:|$)/)?.[1]?.split('\n').filter(line => line.trim().startsWith('-')).map((feature, i) => (
                          <li key={i} className="flex items-start space-x-3 bg-white/5 p-4 rounded-lg border border-white/5 hover:border-cyan-500/30 transition-all group">
                            <span className="text-cyan-500 group-hover:scale-125 transition-transform">✦</span>
                            <span className="text-gray-300 text-sm">{feature.replace(/^- /, '').trim()}</span>
                          </li>
                        ))}
                      </ul>
                    </section>

                    {/* Technical Roadmap Section */}
                    <section>
                      <h3 className="text-xs font-bold text-pink-400 mb-4 tracking-[0.2em] uppercase border-b border-pink-500/20 pb-2">III. Architectural Roadmap</h3>
                      <div className="text-gray-300 text-sm leading-relaxed bg-black/30 p-6 rounded-xl border border-pink-500/10 font-mono">
                        {project.enhancedDescription.match(/TECHNICAL:\s*([\s\S]*?)(?=\n\n|CATEGORIES:|$)/)?.[1]?.trim().split('\n').map((para, i) => (
                          <p key={i} className="mb-4 last:mb-0 opacity-80 hover:opacity-100 transition-opacity">
                            {para}
                          </p>
                        ))}
                      </div>
                    </section>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <LoadingSpinner className="mx-auto mb-4 text-cyan-500" />
                    <p className="text-gray-500 font-mono italic">GENERATING ARCHITECTURAL AUDIT...</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* TODO 리스트 */}
            {project.todos && project.todos.length > 0 && (
              <Card className="glass-panel border-none overflow-hidden">
                <CardHeader className="bg-white/5">
                  <CardTitle className="flex items-center text-yellow-400 font-mono tracking-widest text-sm uppercase">
                    <CheckSquare className="mr-2 h-5 w-5" />
                    Pending Mission Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {project.todos.map((todo, index) => (
                      <div key={index} className="flex items-center space-x-4 p-4 bg-black/40 rounded-xl border border-white/5 hover:bg-black/60 transition-all">
                        <div className="w-8 h-8 bg-cyan-900/50 text-cyan-400 rounded-lg flex items-center justify-center text-xs font-bold border border-cyan-500/30">
                          {index + 1}
                        </div>
                        <span className="text-gray-200 text-sm font-light">{todo}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <AdBanner adSlot="5678901234" className="glass-panel rounded-xl overflow-hidden" format="horizontal" />
          </div>

          {/* 사이드바 */}
          <div className="space-y-8">
            {/* 액션 버튼들 */}
            <Card className="glass-panel border-none overflow-hidden bg-gradient-to-b from-cyan-950/20 to-purple-950/20">
              <CardContent className="pt-8">
                <div className="space-y-4">
                  <Button asChild className="w-full h-14 text-lg font-bold bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 border-none shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02]">
                    <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-5 w-5" />
                      BOARD SPACESHIP
                    </a>
                  </Button>
                  <Button variant="outline" className="w-full h-12 border-purple-500/30 bg-purple-950/10 text-purple-300 hover:bg-purple-900/20 hover:text-purple-200 transition-all" asChild>
                    <a href={`${project.githubUrl}/fork`} target="_blank" rel="noopener noreferrer">
                      <GitFork className="mr-2 h-4 w-4" />
                      FORK TECHNOLOGY
                    </a>
                  </Button>
                  <Button variant="outline" className="w-full h-12 border-gray-700 bg-black/20 text-gray-400 hover:text-white transition-all" asChild>
                    <a href={`${project.githubUrl}/issues`} target="_blank" rel="noopener noreferrer">
                      <Users className="mr-2 h-4 w-4" />
                      CREW DISCUSSION
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 프로젝트 세부 정보 */}
            <Card className="glass-panel border-none">
              <CardHeader className="border-b border-white/5">
                <CardTitle className="text-sm font-mono tracking-widest text-gray-400 uppercase">System Specifications</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-cyan-500 mb-2 uppercase tracking-tighter">Core Engine</h4>
                  <p className="text-white text-lg font-light">{project.language}</p>
                </div>
                <Separator className="bg-white/5" />
                <div>
                  <h4 className="text-xs font-bold text-purple-500 mb-2 uppercase tracking-tighter">Protocol License</h4>
                  <p className="text-white font-light">{project.license || "UNKNOWN"}</p>
                </div>
                <Separator className="bg-white/5" />
                <div>
                  <h4 className="text-xs font-bold text-pink-500 mb-2 uppercase tracking-tighter">Iteration Count</h4>
                  <div className="flex items-center space-x-2">
                    <GitCommit className="h-4 w-4 text-pink-400" />
                    <p className="text-white font-light">{project.commits || "????"} Commits</p>
                  </div>
                </div>
                <Separator className="bg-white/5" />
                <div>
                  <h4 className="text-xs font-bold text-blue-500 mb-2 uppercase tracking-tighter">Code Payload</h4>
                  <p className="text-white font-light">Approx. {project.linesOfCode || "500"}+ Lines</p>
                </div>
              </CardContent>
            </Card>

            {/* 추천 섹션 (우주 테마 적용) */}
            {recommendedProjects.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-gray-500 tracking-[0.3em] uppercase ml-2">Nearby Systems</h3>
                {recommendedProjects.slice(0, 3).map((recommendedProject) => (
                  <Link
                    key={recommendedProject.id}
                    href={`/project/${recommendedProject.id}`}
                    className="block p-4 rounded-xl glass-panel border-none hover:border-cyan-500/30 hover:bg-white/5 transition-all group"
                  >
                    <h4 className="font-bold text-white group-hover:text-cyan-400 transition-colors line-clamp-1">{recommendedProject.title}</h4>
                    <div className="flex items-center justify-between mt-3">
                      <Badge variant="outline" className="text-[10px] border-white/10 text-gray-400">{recommendedProject.language}</Badge>
                      <span className="text-xs text-yellow-500/70 font-mono">⭐ {recommendedProject.stars}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

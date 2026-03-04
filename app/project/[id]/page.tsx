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
import { useLanguage } from "@/hooks/use-language"
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
  Rocket,
  ShieldAlert
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useBookmarks } from "@/hooks/use-bookmarks"
import { projectService } from "@/lib/services/project-service"
import type { Project } from "@/types/project"
import { AdBanner } from "@/components/ad-banner"

export default function ProjectDetailPage() {
  const params = useParams()
  const { user } = useAuth()
  const { isBookmarked, addBookmark, removeBookmark } = useBookmarks()
  const { t, language } = useLanguage()
  const [project, setProject] = useState<Project | null>(null)
  const [recommendedProjects, setRecommendedProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [bookmarkLoading, setBookmarkLoading] = useState(false)

  // AI 리포트 섹션 추출을 위한 안전한 함수
  const extractSection = (text: string | undefined, sectionName: string) => {
    if (!text) return null;
    try {
      const regex = new RegExp(`${sectionName}:\\s*([\\s\\S]*?)(?=\\n\\n|KOREAN SUMMARY:|ENGLISH SUMMARY:|FEATURES:|TECHNICAL:|CATEGORIES:|$)`, 'i');
      const match = text.match(regex);
      return match ? match[1].trim() : null;
    } catch (e) {
      return null;
    }
  };

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
    if (!dateString) return "---";
    const date = new Date(dateString)
    return date.toLocaleDateString(language === 'ko' ? "ko-KR" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center">
        <Header />
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <LoadingSpinner className="text-cyan-400 h-12 w-12" />
          <p className="text-cyan-200 mt-6 animate-pulse font-mono tracking-[0.3em] uppercase text-sm">
            {language === 'ko' ? '데이터 링크 설정 중...' : 'Establishing Data Link...'}
          </p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-transparent text-white">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-24 glass-panel rounded-3xl border-red-500/20 border-2">
            <ShieldAlert className="h-16 w-16 text-red-500 mx-auto mb-6 opacity-50" />
            <h1 className="text-3xl font-black text-white mb-4 uppercase tracking-tighter">
              {language === 'ko' ? '데이터 유실: 프로젝트를 찾을 수 없습니다' : 'COORDINATES LOST: PROJECT NOT FOUND'}
            </h1>
            <Button asChild className="bg-white text-black hover:bg-cyan-400 transition-all font-bold px-8 py-6 rounded-none">
              <Link href="/">
                <ArrowLeft className="mr-2 h-5 w-5" />
                {language === 'ko' ? '섹터 맵으로 복귀' : 'RETURN TO SECTOR MAP'}
              </Link>
            </Button>
          </div>
        </main>
      </div>
    )
  }

  const bookmarked = user ? isBookmarked(project.id) : false

  // AI 섹션 추출
  // enhancedDescription이 없으면 readmeSummary를 사용 (일부 프로젝트는 readmeSummary에 AI 분석이 저장됨)
  const analysisSource = project.enhancedDescription || project.readmeSummary;
  const summaryKo = extractSection(analysisSource, "KOREAN SUMMARY");
  const summaryEn = extractSection(analysisSource, "ENGLISH SUMMARY");
  const technicalReport = extractSection(analysisSource, "TECHNICAL");
  const featuresRaw = extractSection(analysisSource, "FEATURES");
  const featuresList = featuresRaw ? featuresRaw.split('\n').filter(line => line.trim().startsWith('-')).map(line => line.replace(/^- /, '').trim()) : [];

  return (
    <div className="min-h-screen bg-transparent text-white pb-20">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Button asChild variant="ghost" className="text-cyan-400 hover:text-cyan-200 hover:bg-cyan-950/30 transition-all">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {language === 'ko' ? '은하계 항성 지도로 돌아가기' : 'BACK TO GALAXY MAP'}
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* LEFT: MAIN CONTENT */}
          <div className="lg:col-span-2 space-y-10">
            
            {/* HERO CARD */}
            <Card className="glass-panel border-none overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Rocket className="h-32 w-32 text-cyan-500" />
              </div>
              <CardHeader className="relative z-10 p-8 md:p-12">
                <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline" className="border-cyan-500/50 text-cyan-400 bg-cyan-950/30 px-3 py-1 font-mono text-[10px] tracking-widest">{project.language}</Badge>
                      <Badge className="bg-purple-600 text-white font-black border-none shadow-[0_0_15px_rgba(168,85,247,0.4)] px-3 py-1 text-[10px]">RANK {project.score}</Badge>
                    </div>
                    <CardTitle className="text-5xl md:text-6xl font-black title-gradient text-glow leading-tight tracking-tighter uppercase">
                      {project.title}
                    </CardTitle>
                  </div>
                  {user && (
                    <Button
                      onClick={handleBookmark}
                      disabled={bookmarkLoading}
                      className={`h-14 px-8 rounded-none font-bold transition-all ${bookmarked ? "bg-yellow-500 text-black hover:bg-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.3)]" : "bg-white/10 text-white hover:bg-white/20 border border-white/10"}`}
                    >
                      <Bookmark className="h-5 w-5 mr-2" fill={bookmarked ? "currentColor" : "none"} />
                      {bookmarked ? (language === 'ko' ? "정박 완료" : "STATIONED") : (language === 'ko' ? "북마크" : "BOOKMARK")}
                    </Button>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-500 to-purple-500 opacity-50" />
                  <p className="text-gray-300 text-xl leading-relaxed font-light italic pl-8 mb-10 max-w-3xl">
                    {project.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { icon: Star, label: 'STARS', value: project.stars, color: 'text-yellow-400' },
                    { icon: GitFork, label: 'FORKS', value: project.forks, color: 'text-blue-400' },
                    { icon: Eye, label: 'VIEWS', value: project.views || 0, color: 'text-green-400' },
                    { icon: Calendar, label: language === 'ko' ? '동기화' : 'SYNCED', value: formatDate(project.lastUpdate), color: 'text-pink-400', isDate: true }
                  ].map((stat, i) => (
                    <div key={i} className="bg-black/30 border border-white/5 p-4 rounded-2xl hover:bg-black/50 transition-colors group">
                      <stat.icon className={`h-5 w-5 ${stat.color} mb-2 group-hover:scale-110 transition-transform`} />
                      <div className="font-mono text-[9px] text-gray-500 tracking-widest mb-1">{stat.label}</div>
                      <div className={`font-black text-white ${stat.isDate ? 'text-xs' : 'text-2xl'}`}>{stat.value}</div>
                    </div>
                  ))}
                </div>
              </CardHeader>
            </Card>

            {/* AI AUDIT REPORT */}
            <Card className="glass-panel border-none overflow-hidden shadow-2xl">
              <CardHeader className="bg-white/[0.03] border-b border-white/5 py-6 px-8">
                <CardTitle className="flex items-center text-cyan-400 font-mono tracking-[0.4em] text-[10px] uppercase italic">
                  <FileText className="mr-3 h-5 w-5 animate-pulse text-cyan-500" />
                  Principal Architect Engineering Report
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 md:p-12 space-y-12">
                {analysisSource ? (
                  <>
                    {/* I. Summary */}
                    <section className="space-y-6">
                      <div className="flex items-center space-x-4">
                        <span className="text-purple-500 font-mono text-lg font-bold">01</span>
                        <h3 className="text-xs font-black text-white uppercase tracking-[0.3em]">Executive Summary</h3>
                        <div className="flex-1 h-px bg-gradient-to-r from-purple-500/30 to-transparent" />
                      </div>
                      <div className="text-gray-200 leading-relaxed text-xl font-light bg-purple-500/[0.03] p-8 rounded-3xl border border-purple-500/10 shadow-inner">
                        {language === 'ko' ? (summaryKo || summaryEn || analysisSource) : (summaryEn || summaryKo || analysisSource)}
                      </div>
                    </section>

                    {/* II. Features */}
                    {featuresList.length > 0 && (
                      <section className="space-y-6">
                        <div className="flex items-center space-x-4">
                          <span className="text-cyan-500 font-mono text-lg font-bold">02</span>
                          <h3 className="text-xs font-black text-white uppercase tracking-[0.3em]">Core Specifications</h3>
                          <div className="flex-1 h-px bg-gradient-to-r from-cyan-500/30 to-transparent" />
                        </div>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {featuresList.map((feature, i) => (
                            <li key={i} className="flex items-center space-x-4 bg-white/5 p-5 rounded-2xl border border-white/5 hover:border-cyan-500/40 transition-all group cursor-default">
                              <div className="h-2 w-2 bg-cyan-500 rounded-full shadow-[0_0_10px_#06b6d4] group-hover:scale-150 transition-transform" />
                              <span className="text-gray-300 text-sm font-medium tracking-tight leading-snug">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}

                    {/* III. Technical Roadmap */}
                    {technicalReport && (
                      <section className="space-y-6">
                        <div className="flex items-center space-x-4">
                          <span className="text-pink-500 font-mono text-lg font-bold">03</span>
                          <h3 className="text-xs font-black text-white uppercase tracking-[0.3em]">Architectural Roadmap</h3>
                          <div className="flex-1 h-px bg-gradient-to-r from-pink-500/30 to-transparent" />
                        </div>
                        <div className="text-gray-300 text-sm leading-relaxed bg-black/40 p-8 rounded-3xl border border-pink-500/10 font-mono opacity-90 hover:opacity-100 transition-opacity whitespace-pre-wrap">
                          {technicalReport}
                        </div>
                      </section>
                    )}
                  </>
                ) : (
                  <div className="text-center py-20">
                    <LoadingSpinner className="mx-auto mb-6 text-cyan-500 h-10 w-10" />
                    <p className="text-gray-500 font-mono text-xs tracking-[0.5em] uppercase animate-pulse">
                      PROCESSING NEURAL ANALYSIS...
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <AdBanner adSlot="5678901234" className="glass-panel rounded-3xl overflow-hidden border-none" format="horizontal" />
          </div>

          {/* RIGHT: SIDEBAR */}
          <div className="space-y-10">
            
            {/* ACTION CARD */}
            <Card className="glass-panel border-none overflow-hidden bg-gradient-to-br from-cyan-900/20 via-black/40 to-purple-900/20 shadow-2xl p-2">
              <CardContent className="pt-10 pb-8 space-y-4 px-6">
                <Button asChild className="w-full h-16 text-xs font-black tracking-[0.2em] bg-white text-black hover:bg-cyan-400 transition-all hover:scale-[1.03] uppercase">
                  <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-3 h-5 w-5" />
                    {language === 'ko' ? 'GitHub 저장소 탐사' : 'EXPLORE REPOSITORY'}
                  </a>
                </Button>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="h-14 border-white/10 bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 transition-all font-bold text-[10px] uppercase" asChild>
                    <a href={`${project.githubUrl}/fork`} target="_blank" rel="noopener noreferrer">
                      <GitFork className="mr-2 h-4 w-4 text-purple-400" />
                      FORK
                    </a>
                  </Button>
                  <Button variant="outline" className="h-14 border-white/10 bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 transition-all font-bold text-[10px] uppercase" asChild>
                    <a href={`${project.githubUrl}/issues`} target="_blank" rel="noopener noreferrer">
                      <Users className="mr-2 h-4 w-4 text-cyan-400" />
                      CREW
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* MISSION LOG (TODO) */}
            {project.todos && project.todos.length > 0 && (
              <Card className="glass-panel border-none shadow-xl">
                <CardHeader className="border-b border-white/5 bg-white/5 py-4 px-6">
                  <CardTitle className="text-[10px] font-black text-yellow-500 tracking-[0.3em] uppercase flex items-center italic">
                    <CheckSquare className="mr-2 h-4 w-4" />
                    {language === 'ko' ? '미해결 미션' : 'Pending Missions'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-3">
                  {project.todos.map((todo, index) => (
                    <div key={index} className="flex items-center space-x-4 p-4 bg-black/40 rounded-2xl border border-white/5 hover:bg-white/5 transition-all group">
                      <div className="w-6 h-6 bg-yellow-500/10 text-yellow-500 rounded flex items-center justify-center text-[10px] font-bold border border-yellow-500/20">
                        {index + 1}
                      </div>
                      <span className="text-gray-300 text-xs font-light leading-tight">{todo}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* SPECS CARD */}
            <Card className="glass-panel border-none">
              <CardHeader className="border-b border-white/5 bg-white/5 py-4 px-6">
                <CardTitle className="text-[9px] font-mono tracking-[0.4em] text-gray-500 uppercase">{language === 'ko' ? '시스템 제원' : 'System Specifications'}</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                {[
                  { label: language === 'ko' ? '코어 엔진' : 'CORE ENGINE', value: project.language, color: 'text-cyan-400' },
                  { label: language === 'ko' ? '라이선스' : 'LICENSE', value: (project.license || "UNKNOWN").toUpperCase(), color: 'text-purple-400' },
                  { label: language === 'ko' ? '반복 주기' : 'ITERATIONS', value: `${project.commits || "?"} COMMITS`, color: 'text-pink-400', icon: GitCommit },
                  { label: language === 'ko' ? '데이터 크기' : 'PAYLOAD', value: `~${project.linesOfCode || "500"}+ LINES`, color: 'text-blue-400' }
                ].map((spec, i) => (
                  <div key={i} className="space-y-2">
                    <h4 className={`text-[9px] font-black ${spec.color} tracking-widest`}>{spec.label}</h4>
                    <div className="flex items-center space-x-2">
                      {spec.icon && <spec.icon className={`h-4 w-4 ${spec.color} opacity-50`} />}
                      <p className="text-white text-lg font-light tracking-tight">{spec.value}</p>
                    </div>
                    {i < 3 && <Separator className="bg-white/5 mt-4" />}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* NEARBY SYSTEMS */}
            {recommendedProjects.length > 0 && (
              <div className="space-y-5">
                <h3 className="text-[10px] font-black text-gray-600 tracking-[0.5em] uppercase ml-4">{language === 'ko' ? '인접 항성계' : 'Nearby Systems'}</h3>
                <div className="space-y-4">
                  {recommendedProjects.slice(0, 3).map((rp) => (
                    <Link
                      key={rp.id}
                      href={`/project/${rp.id}`}
                      className="block p-5 rounded-3xl glass-panel border-none hover:bg-white/[0.07] transition-all group relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <h4 className="font-bold text-white group-hover:text-cyan-400 transition-colors line-clamp-1 text-sm uppercase tracking-tight mb-3 relative z-10">{rp.title}</h4>
                      <div className="flex items-center justify-between relative z-10">
                        <Badge variant="outline" className="text-[8px] border-white/10 text-gray-500 bg-white/5 font-mono px-2 py-0">{rp.language}</Badge>
                        <span className="text-[10px] text-yellow-500/50 font-mono font-bold">⭐ {rp.stars}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

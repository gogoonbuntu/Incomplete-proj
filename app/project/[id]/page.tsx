"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header"
import { ShareButtons } from "@/components/share-buttons"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useLanguage } from "@/hooks/use-language"
import {
  ArrowLeft, Star, GitFork, Calendar, ExternalLink, FileText,
  CheckSquare, Bookmark, Eye, GitCommit, Rocket, ShieldAlert,
  Code, Users, TrendingUp, Zap, Target, BookOpen, ChevronDown, ChevronUp
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
  const { language } = useLanguage()
  const [project, setProject] = useState<Project | null>(null)
  const [recommendedProjects, setRecommendedProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [bookmarkLoading, setBookmarkLoading] = useState(false)
  const [showFullReport, setShowFullReport] = useState(false)

  const extractSection = (text: string | undefined, sectionName: string) => {
    if (!text) return null
    try {
      const regex = new RegExp(`${sectionName}:\\s*([\\s\\S]*?)(?=\\n\\n|KOREAN SUMMARY:|ENGLISH SUMMARY:|FEATURES:|TECHNICAL:|CATEGORIES:|$)`, 'i')
      const match = text.match(regex)
      return match ? match[1].trim() : null
    } catch { return null }
  }

  useEffect(() => { loadProject() }, [params.id])
  useEffect(() => { if (project) loadRecommendations() }, [project])

  const loadProject = async () => {
    try {
      setLoading(true)
      const data = await projectService.getProject(params.id as string)
      setProject(data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const loadRecommendations = async () => {
    try {
      const all = await projectService.getProjects()
      if (!project) return
      const related = all
        .filter(p => p.id !== project.id && p.language === project.language)
        .sort((a, b) => b.score - a.score)
        .slice(0, 4)
      setRecommendedProjects(related)
    } catch (e) { console.error(e) }
  }

  const handleBookmark = async () => {
    if (!user || !project) return
    try {
      setBookmarkLoading(true)
      if (isBookmarked(project.id)) await removeBookmark(project.id)
      else await addBookmark(project.id)
    } catch (e) { console.error(e) }
    finally { setBookmarkLoading(false) }
  }

  const formatDate = (d: string) => {
    if (!d) return "---"
    return new Date(d).toLocaleDateString(language === 'ko' ? "ko-KR" : "en-US", { year: "numeric", month: "long", day: "numeric" })
  }

  const getDaysAgo = (d: string) => {
    if (!d) return 999
    return Math.ceil((Date.now() - new Date(d).getTime()) / (1000*60*60*24))
  }

  const getHealthLabel = (days: number) => {
    if (days <= 30) return { text: "활발", color: "text-green-400 bg-green-500/10 border-green-500/30" }
    if (days <= 90) return { text: "보통", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30" }
    if (days <= 365) return { text: "느림", color: "text-orange-400 bg-orange-500/10 border-orange-500/30" }
    return { text: "비활성", color: "text-red-400 bg-red-500/10 border-red-500/30" }
  }

  if (loading) return (
    <div className="min-h-screen bg-transparent flex flex-col">
      <Header />
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <LoadingSpinner className="text-cyan-400 h-12 w-12" />
        <p className="text-cyan-200 mt-6 animate-pulse font-mono tracking-[0.3em] uppercase text-sm">데이터 로딩 중...</p>
      </div>
    </div>
  )

  if (!project) return (
    <div className="min-h-screen bg-transparent text-white">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="text-center py-24 glass-panel rounded-3xl border-red-500/20 border-2">
          <ShieldAlert className="h-16 w-16 text-red-500 mx-auto mb-6 opacity-50" />
          <h1 className="text-3xl font-black mb-4">프로젝트를 찾을 수 없습니다</h1>
          <Button asChild className="bg-white text-black hover:bg-cyan-400"><Link href="/"><ArrowLeft className="mr-2 h-5 w-5" />홈으로 돌아가기</Link></Button>
        </div>
      </main>
    </div>
  )

  const bookmarked = user ? isBookmarked(project.id) : false
  const analysisSource = project.enhancedDescription || project.readmeSummary
  const summaryKo = extractSection(analysisSource, "KOREAN SUMMARY")
  const summaryEn = extractSection(analysisSource, "ENGLISH SUMMARY")
  const technicalReport = extractSection(analysisSource, "TECHNICAL")
  const featuresRaw = extractSection(analysisSource, "FEATURES")
  const featuresList = featuresRaw ? featuresRaw.split('\n').filter(l => l.trim().startsWith('-')).map(l => l.replace(/^- /, '').trim()) : []
  const daysAgo = getDaysAgo(project.lastUpdate)
  const health = getHealthLabel(daysAgo)
  const displaySummary = language === 'ko' ? (summaryKo || summaryEn || analysisSource) : (summaryEn || summaryKo || analysisSource)

  // 스코어 breakdown 시각화 데이터
  const scoreItems = project.scoreBreakdown ? [
    { label: "커밋 활동", value: project.scoreBreakdown.commits, max: 2, icon: GitCommit, color: "from-cyan-500 to-cyan-600" },
    { label: "인기도", value: project.scoreBreakdown.popularity, max: 2, icon: Star, color: "from-yellow-500 to-yellow-600" },
    { label: "문서화", value: project.scoreBreakdown.documentation, max: 1.5, icon: FileText, color: "from-purple-500 to-purple-600" },
    { label: "코드 구조", value: project.scoreBreakdown.structure, max: 2, icon: Code, color: "from-pink-500 to-pink-600" },
    { label: "최근 활동", value: project.scoreBreakdown.activity, max: 1.5, icon: TrendingUp, color: "from-green-500 to-green-600" },
    { label: "성장 잠재력", value: project.scoreBreakdown.potential, max: 1.5, icon: Zap, color: "from-orange-500 to-orange-600" },
  ] : []

  return (
    <div className="min-h-screen bg-transparent text-white pb-20">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* 뒤로가기 + 공유 */}
        <div className="flex items-center justify-between mb-8">
          <Button asChild variant="ghost" className="text-cyan-400 hover:text-cyan-200 hover:bg-cyan-950/30">
            <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" />홈으로</Link>
          </Button>
          <ShareButtons title={`${project.title} - AI 프로젝트 분석`} url={`https://incomplete-proj.vercel.app/project/${project.id}`} />
        </div>

        {/* ===== HERO ===== */}
        <Card className="glass-panel border-none overflow-hidden relative mb-10">
          <div className="absolute top-0 right-0 p-8 opacity-5"><Rocket className="h-40 w-40 text-cyan-500" /></div>
          <CardHeader className="relative z-10 p-8 md:p-12">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant="outline" className="border-cyan-500/50 text-cyan-400 bg-cyan-950/30 px-3 py-1 font-mono text-xs">{project.language}</Badge>
                  <Badge className="bg-purple-600 text-white font-black border-none shadow-[0_0_15px_rgba(168,85,247,0.4)] px-3 py-1 text-xs">SCORE {project.score}</Badge>
                  <Badge variant="outline" className={`text-xs border px-3 py-1 font-mono ${health.color}`}>{health.text}</Badge>
                </div>
                <CardTitle className="text-4xl md:text-5xl font-black title-gradient text-glow leading-tight tracking-tight">
                  {project.title}
                </CardTitle>
                <p className="text-gray-400 text-sm font-mono">{project.owner}/{project.repo}</p>
              </div>
              <div className="flex gap-3">
                {user && (
                  <Button onClick={handleBookmark} disabled={bookmarkLoading}
                    className={`h-12 px-6 font-bold ${bookmarked ? "bg-yellow-500 text-black hover:bg-yellow-400" : "bg-white/10 text-white hover:bg-white/20 border border-white/10"}`}>
                    <Bookmark className="h-4 w-4 mr-2" fill={bookmarked ? "currentColor" : "none"} />
                    {bookmarked ? "저장됨" : "북마크"}
                  </Button>
                )}
              </div>
            </div>

            {/* 설명 */}
            <div className="border-l-2 border-cyan-500/30 pl-6 mb-8">
              <p className="text-gray-300 text-lg leading-relaxed font-light">{project.description}</p>
            </div>

            {/* 통계 그리드 */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { icon: Star, label: "Stars", value: project.stars.toLocaleString(), color: "text-yellow-400" },
                { icon: GitFork, label: "Forks", value: project.forks.toLocaleString(), color: "text-blue-400" },
                { icon: Eye, label: "Views", value: (project.views || 0).toLocaleString(), color: "text-green-400" },
                { icon: GitCommit, label: "Commits", value: project.commits || "?", color: "text-pink-400" },
                { icon: Calendar, label: `${daysAgo}일 전`, value: formatDate(project.lastUpdate), color: "text-cyan-400", small: true }
              ].map((s, i) => (
                <div key={i} className="bg-black/30 border border-white/5 p-4 rounded-xl text-center hover:bg-black/50 transition-colors">
                  <s.icon className={`h-4 w-4 ${s.color} mx-auto mb-1`} />
                  <div className="font-mono text-[9px] text-gray-500 uppercase">{s.label}</div>
                  <div className={`font-bold text-white ${s.small ? 'text-xs mt-1' : 'text-xl'}`}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* 토픽/카테고리 */}
            {(project.topics?.length || project.categories?.length) && (
              <div className="flex flex-wrap gap-2 mt-6">
                {project.categories?.map((c, i) => (
                  <Badge key={`c-${i}`} variant="outline" className="text-[10px] border-purple-500/30 text-purple-300 bg-purple-950/20">{c}</Badge>
                ))}
                {project.topics?.map((t, i) => (
                  <Badge key={`t-${i}`} variant="outline" className="text-[10px] border-gray-700 text-gray-400">#{t}</Badge>
                ))}
              </div>
            )}
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT: MAIN */}
          <div className="lg:col-span-2 space-y-8">

            {/* AI 분석 리포트 */}
            <Card className="glass-panel border-none overflow-hidden">
              <CardHeader className="bg-white/[0.03] border-b border-white/5 py-5 px-8">
                <CardTitle className="flex items-center text-cyan-400 font-mono tracking-widest text-xs uppercase">
                  <FileText className="mr-3 h-5 w-5 text-cyan-500" />
                  AI 엔지니어링 리포트
                  <span className="ml-auto text-[10px] text-gray-600 font-normal">Powered by Gemini 2.5 Flash-Lite</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-10">
                {analysisSource ? (
                  <>
                    {/* 요약 */}
                    <section>
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-purple-500 font-mono font-bold">01</span>
                        <h3 className="text-xs font-black text-white uppercase tracking-widest">Executive Summary</h3>
                        <div className="flex-1 h-px bg-gradient-to-r from-purple-500/30 to-transparent" />
                      </div>
                      <div className="text-gray-200 leading-relaxed text-lg font-light bg-purple-500/[0.03] p-6 rounded-2xl border border-purple-500/10">
                        {displaySummary}
                      </div>
                    </section>

                    {/* 주요 기능 */}
                    {featuresList.length > 0 && (
                      <section>
                        <div className="flex items-center gap-3 mb-4">
                          <span className="text-cyan-500 font-mono font-bold">02</span>
                          <h3 className="text-xs font-black text-white uppercase tracking-widest">핵심 기능 분석</h3>
                          <div className="flex-1 h-px bg-gradient-to-r from-cyan-500/30 to-transparent" />
                        </div>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {featuresList.map((f, i) => (
                            <li key={i} className="flex items-start gap-3 bg-white/5 p-4 rounded-xl border border-white/5 hover:border-cyan-500/30 transition-all">
                              <div className="h-2 w-2 mt-2 bg-cyan-500 rounded-full shadow-[0_0_8px_#06b6d4] shrink-0" />
                              <span className="text-gray-300 text-sm leading-relaxed">{f}</span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}

                    {/* 기술 분석 (접기/펼치기) */}
                    {technicalReport && (
                      <section>
                        <button onClick={() => setShowFullReport(!showFullReport)} className="flex items-center gap-3 mb-4 w-full group">
                          <span className="text-pink-500 font-mono font-bold">03</span>
                          <h3 className="text-xs font-black text-white uppercase tracking-widest">기술 심층 분석</h3>
                          <div className="flex-1 h-px bg-gradient-to-r from-pink-500/30 to-transparent" />
                          {showFullReport ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                        </button>
                        {showFullReport && (
                          <div className="text-gray-300 text-sm leading-relaxed bg-black/40 p-6 rounded-2xl border border-pink-500/10 font-mono whitespace-pre-wrap animate-in fade-in duration-300">
                            {technicalReport}
                          </div>
                        )}
                      </section>
                    )}
                  </>
                ) : (
                  <div className="text-center py-16">
                    <LoadingSpinner className="mx-auto mb-4 text-cyan-500 h-8 w-8" />
                    <p className="text-gray-500 font-mono text-xs uppercase">AI 분석 대기 중...</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 스코어 breakdown */}
            {scoreItems.length > 0 && (
              <Card className="glass-panel border-none">
                <CardHeader className="bg-white/[0.03] border-b border-white/5 py-5 px-8">
                  <CardTitle className="flex items-center text-xs font-mono uppercase tracking-widest text-gray-400">
                    <Target className="mr-3 h-5 w-5 text-purple-500" />
                    스코어 상세 분석 ({project.score}/10.5)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-5">
                  {scoreItems.map((item, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <item.icon className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-300">{item.label}</span>
                        </div>
                        <span className="text-xs font-mono text-gray-500">{item.value}/{item.max}</span>
                      </div>
                      <div className="h-2 bg-black/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${item.color} rounded-full transition-all duration-700`}
                          style={{ width: `${Math.min((item.value / item.max) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* 기여 가이드 */}
            <Card className="glass-panel border-none bg-gradient-to-br from-green-950/20 to-transparent">
              <CardHeader className="border-b border-white/5 py-5 px-8">
                <CardTitle className="flex items-center text-xs font-mono uppercase tracking-widest text-green-400">
                  <BookOpen className="mr-3 h-5 w-5" />
                  이 프로젝트에 기여하는 방법
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <ol className="space-y-4">
                  {[
                    { step: "Fork", desc: `GitHub에서 ${project.owner}/${project.repo}를 Fork합니다.` },
                    { step: "Clone", desc: "Fork한 저장소를 로컬에 Clone합니다." },
                    { step: "Branch", desc: "기능별 브랜치를 생성합니다. (예: feature/fix-bug)" },
                    { step: "Develop", desc: project.todos?.[0] ? `예시: "${project.todos[0]}" 작업을 수행합니다.` : "코드를 수정하고 테스트합니다." },
                    { step: "PR", desc: "Pull Request를 생성하여 기여를 제출합니다." },
                  ].map((s, i) => (
                    <li key={i} className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center justify-center text-green-400 font-mono font-bold text-sm shrink-0">{i + 1}</div>
                      <div>
                        <span className="font-bold text-white text-sm">{s.step}</span>
                        <p className="text-gray-400 text-sm mt-0.5">{s.desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            <AdBanner adSlot="5678901234" className="glass-panel rounded-2xl overflow-hidden border-none" format="horizontal" />
          </div>

          {/* RIGHT: SIDEBAR */}
          <div className="space-y-8">
            {/* 액션 */}
            <Card className="glass-panel border-none bg-gradient-to-br from-cyan-900/20 via-black/40 to-purple-900/20 p-2">
              <CardContent className="pt-8 pb-6 space-y-3 px-5">
                <Button asChild className="w-full h-14 text-xs font-black tracking-widest bg-white text-black hover:bg-cyan-400 uppercase">
                  <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />GitHub 저장소
                  </a>
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="h-12 border-white/10 bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 text-[10px] uppercase font-bold" asChild>
                    <a href={`${project.githubUrl}/fork`} target="_blank" rel="noopener noreferrer"><GitFork className="mr-1 h-3 w-3 text-purple-400" />Fork</a>
                  </Button>
                  <Button variant="outline" className="h-12 border-white/10 bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 text-[10px] uppercase font-bold" asChild>
                    <a href={`${project.githubUrl}/issues`} target="_blank" rel="noopener noreferrer"><Users className="mr-1 h-3 w-3 text-cyan-400" />Issues</a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 미해결 미션 */}
            {project.todos && project.todos.length > 0 && (
              <Card className="glass-panel border-none">
                <CardHeader className="border-b border-white/5 bg-white/5 py-4 px-6">
                  <CardTitle className="text-[10px] font-black text-yellow-500 tracking-widest uppercase flex items-center">
                    <CheckSquare className="mr-2 h-4 w-4" />미해결 미션 ({project.todos.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-2">
                  {project.todos.map((todo, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-black/40 rounded-xl border border-white/5 hover:bg-white/5 transition-all">
                      <div className="w-5 h-5 bg-yellow-500/10 text-yellow-500 rounded flex items-center justify-center text-[10px] font-bold border border-yellow-500/20 shrink-0">{i + 1}</div>
                      <span className="text-gray-300 text-xs leading-relaxed">{todo}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* 시스템 제원 */}
            <Card className="glass-panel border-none">
              <CardHeader className="border-b border-white/5 bg-white/5 py-4 px-6">
                <CardTitle className="text-[9px] font-mono tracking-widest text-gray-500 uppercase">시스템 제원</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {[
                  { label: "언어", value: project.language, color: "text-cyan-400" },
                  { label: "라이선스", value: (project.license || "UNKNOWN").toUpperCase(), color: "text-purple-400" },
                  { label: "커밋 수", value: `${project.commits || "?"} commits`, color: "text-pink-400" },
                  { label: "코드 라인", value: `~${project.linesOfCode || "500"}+ lines`, color: "text-blue-400" },
                ].map((spec, i) => (
                  <div key={i} className="space-y-1">
                    <h4 className={`text-[9px] font-bold ${spec.color} tracking-widest uppercase`}>{spec.label}</h4>
                    <p className="text-white text-sm font-light">{spec.value}</p>
                    {i < 3 && <Separator className="bg-white/5 mt-3" />}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* 유사 프로젝트 */}
            {recommendedProjects.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-gray-600 tracking-widest uppercase ml-2">같은 언어의 프로젝트</h3>
                {recommendedProjects.map(rp => (
                  <Link key={rp.id} href={`/project/${rp.id}`} className="block p-4 rounded-xl glass-panel border-none hover:bg-white/[0.07] transition-all group">
                    <h4 className="font-bold text-white group-hover:text-cyan-400 transition-colors text-sm line-clamp-1 mb-2">{rp.title}</h4>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[8px] border-white/10 text-gray-500 bg-white/5 font-mono">{rp.language}</Badge>
                      <span className="text-[10px] text-yellow-500/50 font-mono font-bold">⭐ {rp.stars}</span>
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

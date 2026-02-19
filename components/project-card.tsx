"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, GitFork, Calendar, Bookmark, ExternalLink, Eye, Code, Rocket } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useBookmarks } from "@/hooks/use-bookmarks"
import { useLanguage } from "@/hooks/use-language"
import type { Project } from "@/types/project"

interface ProjectCardProps {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
  const { user } = useAuth()
  const { isBookmarked, addBookmark, removeBookmark } = useBookmarks()
  const { t } = useLanguage()
  const [bookmarkLoading, setBookmarkLoading] = useState(false)

  const handleBookmark = async () => {
    if (!user) return

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

  const getScoreColor = (score: number) => {
    // Neon colors for scores
    if (score >= 9) return "border-[#00f3ff] text-[#00f3ff] shadow-[0_0_10px_#00f3ff]"
    if (score >= 7) return "border-[#bc13fe] text-[#bc13fe] shadow-[0_0_10px_#bc13fe]"
    if (score >= 5) return "border-[#7a04eb] text-[#7a04eb]"
    return "border-gray-500 text-gray-400"
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return "1d ago"
    if (diffDays < 30) return `${diffDays}d ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
    return `${Math.floor(diffDays / 365)}y ago`
  }

  const bookmarked = user ? isBookmarked(project.id) : false

  return (
    <div className="perspective-container h-full">
      <Card className="card-3d glass-panel h-full flex flex-col border-none text-white overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        
        <CardHeader className="relative z-10">
          <div className="flex justify-between items-start">
            <CardTitle className="text-xl font-bold line-clamp-2 flex-1 mr-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 group-hover:from-[#00f3ff] group-hover:to-[#bc13fe] transition-all duration-300">
              {project.title}
            </CardTitle>
            {user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBookmark}
                disabled={bookmarkLoading}
                className={`flex-shrink-0 ${bookmarked ? "text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" : "text-gray-500 hover:text-white"}`}
              >
                <Bookmark className="h-5 w-5" fill={bookmarked ? "currentColor" : "none"} />
              </Button>
            )}
          </div>

          <div className="flex items-center space-x-2 flex-wrap gap-2 mt-2">
            <Badge variant="outline" className="text-xs border-cyan-500/50 text-cyan-300 bg-cyan-950/30 backdrop-blur-sm">
              {project.language}
            </Badge>
            <Badge variant="outline" className={`text-xs bg-black/40 backdrop-blur-sm ${getScoreColor(project.score)}`}>
              Score {project.score}
            </Badge>
            {project.categories?.slice(0, 2).map((category, index) => (
              <Badge key={`${category}-${index}`} variant="outline" className="text-xs border-purple-500/50 text-purple-300 bg-purple-950/30">
                {category}
              </Badge>
            ))}
          </div>
        </CardHeader>

        <CardContent className="flex-1 relative z-10 card-content-3d">
          {(() => {
            // AI 요약 파싱 로직: KOREAN SUMMARY 섹션 추출
            let displayDescription = project.description || "No description available.";
            
            try {
              if (project && project.enhancedDescription) {
                const koMatch = project.enhancedDescription.match(/KOREAN SUMMARY:\s*([\s\S]*?)(?=\n\n|ENGLISH SUMMARY:|FEATURES:|TECHNICAL:|$)/i);
                if (koMatch && koMatch[1] && koMatch[1].trim()) {
                  displayDescription = koMatch[1].trim();
                } else if (project.enhancedDescription.length > 10) {
                  // If marker not found, but content exists, show beginning
                  displayDescription = project.enhancedDescription.split('\n')[0].substring(0, 200);
                }
              }
            } catch (e) {
              console.error("Error parsing AI summary:", e);
            }
            
            return (
              <p className="text-gray-200 text-sm line-clamp-4 mb-6 leading-relaxed group-hover:text-white transition-colors duration-300 font-light border-l-2 border-purple-500/30 pl-3">
                {displayDescription}
              </p>
            );
          })()}

          <div className="space-y-3 text-sm text-gray-400">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1 text-yellow-300">
                  <Star className="h-4 w-4" />
                  <span>{project.stars}</span>
                </div>
                <div className="flex items-center space-x-1 text-blue-300">
                  <GitFork className="h-4 w-4" />
                  <span>{project.forks}</span>
                </div>
                {project.views !== undefined && (
                  <div className="flex items-center space-x-1 text-green-300">
                    <Eye className="h-4 w-4" />
                    <span>{project.views}</span>
                  </div>
                )}
              </div>
              {project.linesOfCode && (
                <div className="flex items-center space-x-1 text-pink-300">
                  <Code className="h-4 w-4" />
                  <span>{project.linesOfCode}L</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-1 text-xs">
              <Calendar className="h-3 w-3" />
              <span>Updated: {formatDate(project.lastUpdate)}</span>
            </div>
          </div>

          {project.todos && project.todos.length > 0 && (
            <div className="mt-6 p-3 rounded-lg bg-black/40 border border-white/5 backdrop-blur-sm">
              <h4 className="text-xs font-bold text-cyan-400 mb-2 flex items-center uppercase">
                <Rocket className="h-3 w-3 mr-1" />
                {t('missionLog')}
              </h4>
              <ul className="text-xs text-gray-400 space-y-1">
                {project.todos.slice(0, 2).map((todo, index) => (
                  <li key={index} className="flex items-start space-x-1">
                    <span className="text-purple-500 mt-0.5">›</span>
                    <span className="line-clamp-1">{todo}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between relative z-10 pt-4">
          <Button asChild variant="ghost" size="sm" className="hover:bg-white/10 hover:text-cyan-300 text-gray-400 transition-all">
            <Link href={`/project/${project.id}`}>{t('analyze')}</Link>
          </Button>
          <Button asChild size="sm" className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 border-none text-white shadow-lg shadow-purple-500/30 transition-all hover:scale-105">
            <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-1" />
              {t('deploy')}
            </a>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

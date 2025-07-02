"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, GitFork, Calendar, Bookmark, ExternalLink, Eye, Code } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useBookmarks } from "@/hooks/use-bookmarks"
import type { Project } from "@/types/project"

interface ProjectCardProps {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
  const { user } = useAuth()
  const { isBookmarked, addBookmark, removeBookmark } = useBookmarks()
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
    if (score >= 9) return "bg-green-100 text-green-800 border-green-200"
    if (score >= 7) return "bg-yellow-100 text-yellow-800 border-yellow-200"
    if (score >= 5) return "bg-orange-100 text-orange-800 border-orange-200"
    return "bg-red-100 text-red-800 border-red-200"
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return "1일 전"
    if (diffDays < 30) return `${diffDays}일 전`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}개월 전`
    return `${Math.floor(diffDays / 365)}년 전`
  }

  const bookmarked = user ? isBookmarked(project.id) : false

  return (
    <Card className="h-full flex flex-col hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold line-clamp-2 flex-1 mr-2">{project.title}</CardTitle>
          {user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBookmark}
              disabled={bookmarkLoading}
              className={`flex-shrink-0 ${bookmarked ? "text-yellow-500 hover:text-yellow-600" : "text-gray-400 hover:text-gray-600"}`}
            >
              <Bookmark className="h-4 w-4" fill={bookmarked ? "currentColor" : "none"} />
            </Button>
          )}
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-1">
          <Badge variant="secondary" className="text-xs">
            {project.language}
          </Badge>
          <Badge className={`text-xs border ${getScoreColor(project.score)}`}>점수 {project.score}</Badge>
          {project.categories?.slice(0, 2).map((category, index) => (
            <Badge key={`${category}-${index}`} variant="outline" className="text-xs">
              {category}
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        <p className="text-gray-600 text-sm line-clamp-3 mb-4 leading-relaxed">{project.description}</p>

        <div className="space-y-3 text-sm text-gray-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Star className="h-4 w-4" />
                <span>{project.stars}</span>
              </div>
              <div className="flex items-center space-x-1">
                <GitFork className="h-4 w-4" />
                <span>{project.forks}</span>
              </div>
              {project.views !== undefined && (
                <div className="flex items-center space-x-1">
                  <Eye className="h-4 w-4" />
                  <span>{project.views}</span>
                </div>
              )}
            </div>
            {project.linesOfCode && (
              <div className="flex items-center space-x-1">
                <Code className="h-4 w-4" />
                <span>{project.linesOfCode}줄</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-1">
            <Calendar className="h-4 w-4" />
            <span>업데이트: {formatDate(project.lastUpdate)}</span>
          </div>
        </div>

        {project.todos && project.todos.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">주요 TODO</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              {project.todos.slice(0, 2).map((todo, index) => (
                <li key={index} className="flex items-start space-x-1">
                  <span className="text-gray-400 mt-0.5">•</span>
                  <span className="line-clamp-1">{todo}</span>
                </li>
              ))}
              {project.todos.length > 2 && <li className="text-gray-400 text-xs">+{project.todos.length - 2}개 더</li>}
            </ul>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button asChild variant="outline" size="sm">
          <Link href={`/project/${project.id}`}>자세히 보기</Link>
        </Button>
        <Button asChild size="sm">
          <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-1" />
            GitHub
          </a>
        </Button>
      </CardFooter>
    </Card>
  )
}

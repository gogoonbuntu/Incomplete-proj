"use client"

import { useState, useEffect } from "react"
import { useAuth } from "./use-auth"
import { projectService } from "@/lib/services/project-service"

export function useBookmarks() {
  const { user } = useAuth()
  const [bookmarks, setBookmarks] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      loadBookmarks()
    } else {
      setBookmarks([])
    }
  }, [user])

  const loadBookmarks = async () => {
    if (!user) return

    try {
      setLoading(true)
      const userBookmarks = await projectService.getUserBookmarks(user.uid)
      setBookmarks(userBookmarks)
    } catch (error) {
      console.error("Failed to load bookmarks:", error)
    } finally {
      setLoading(false)
    }
  }

  const addBookmark = async (projectId: string) => {
    if (!user) return

    try {
      await projectService.addBookmark(user.uid, projectId)
      setBookmarks((prev) => [...prev, projectId])
    } catch (error) {
      console.error("Failed to add bookmark:", error)
      throw error
    }
  }

  const removeBookmark = async (projectId: string) => {
    if (!user) return

    try {
      await projectService.removeBookmark(user.uid, projectId)
      setBookmarks((prev) => prev.filter((id) => id !== projectId))
    } catch (error) {
      console.error("Failed to remove bookmark:", error)
      throw error
    }
  }

  const isBookmarked = (projectId: string) => {
    return bookmarks.includes(projectId)
  }

  return {
    bookmarks,
    loading,
    addBookmark,
    removeBookmark,
    isBookmarked,
    refetch: loadBookmarks,
  }
}

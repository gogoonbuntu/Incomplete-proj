"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { blogPosts } from "@/lib/blog-data"
import { Calendar, Clock, ChevronRight, Tag } from "lucide-react"

export function BlogList() {
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  // 모든 태그 추출 (빈도순 정렬)
  const allTags = useMemo(() => {
    const tagCount: Record<string, number> = {}
    blogPosts.forEach((post) => {
      post.tags.forEach((tag) => {
        tagCount[tag] = (tagCount[tag] || 0) + 1
      })
    })
    return Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag)
  }, [])

  const filteredPosts = selectedTag
    ? blogPosts.filter((post) => post.tags.includes(selectedTag))
    : blogPosts

  return (
    <>
      {/* 태그 필터 */}
      <div className="flex flex-wrap gap-2 mb-10">
        <button
          onClick={() => setSelectedTag(null)}
          className={`text-xs font-mono px-3 py-1.5 rounded-full border transition-all ${
            !selectedTag
              ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
              : "bg-transparent text-gray-500 border-gray-700 hover:border-gray-500 hover:text-gray-300"
          }`}
        >
          전체 ({blogPosts.length})
        </button>
        {allTags.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
            className={`text-xs font-mono px-3 py-1.5 rounded-full border transition-all ${
              selectedTag === tag
                ? "bg-purple-500/20 text-purple-300 border-purple-500/50"
                : "bg-transparent text-gray-500 border-gray-700 hover:border-gray-500 hover:text-gray-300"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* 필터 결과 안내 */}
      {selectedTag && (
        <div className="flex items-center gap-2 mb-6 text-sm text-gray-400">
          <Tag className="w-4 h-4 text-purple-400" />
          <span>
            <strong className="text-purple-300">{selectedTag}</strong> 태그 ·{" "}
            {filteredPosts.length}개의 글
          </span>
        </div>
      )}

      {/* 블로그 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredPosts.map((post) => (
          <Link
            href={`/blog/${post.slug}`}
            key={post.slug}
            className="glass-panel rounded-2xl p-6 group transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(0,243,255,0.2)] border border-white/10 hover:border-cyan-500/50 flex flex-col h-full bg-slate-900/50"
          >
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs font-mono px-2 py-1 rounded bg-cyan-950/50 text-cyan-300 border border-cyan-800/50 uppercase tracking-widest"
                >
                  {tag}
                </span>
              ))}
            </div>

            <h2 className="text-2xl font-bold mb-3 text-white group-hover:text-cyan-400 transition-colors line-clamp-2 leading-snug">
              {post.title}
            </h2>

            <p className="text-gray-400 mb-6 line-clamp-3 font-light leading-relaxed flex-grow">
              {post.excerpt}
            </p>

            <div className="flex items-center justify-between text-xs text-gray-500 mt-auto pt-4 border-t border-white/5">
              <div className="flex items-center space-x-4">
                <span className="flex items-center">
                  <Calendar className="w-3 h-3 mr-1 opacity-70" />
                  {post.date}
                </span>
                <span className="flex items-center">
                  <Clock className="w-3 h-3 mr-1 opacity-70" />
                  {post.readTime}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-cyan-500 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}

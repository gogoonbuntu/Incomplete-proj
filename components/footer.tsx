import Link from "next/link"
import { blogPosts } from "@/lib/blog-data"

export function Footer() {
  const recentPosts = [...blogPosts].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  ).slice(0, 3)

  return (
    <footer className="relative z-10 border-t border-white/5 bg-black/20 backdrop-blur-sm mt-16">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* 서비스 소개 */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Incomplete Projects Discovery</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              GitHub에서 방치된 유망한 오픈소스 프로젝트를 AI로 발굴하고 분석합니다.
              미완성 프로젝트에 새 생명을 불어넣어보세요.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <span className="text-[10px] font-mono text-gray-600 bg-gray-900/50 px-2 py-1 rounded">Powered by Gemini AI</span>
            </div>
          </div>

          {/* 최근 글 */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">최근 블로그</h3>
            <ul className="space-y-2.5">
              {recentPosts.map(post => (
                <li key={post.slug}>
                  <Link href={`/blog/${post.slug}`} className="text-xs text-gray-500 hover:text-cyan-400 transition-colors line-clamp-1 block">
                    {post.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 바로가기 */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">바로가기</h3>
            <ul className="space-y-2">
              <li><Link href="/" className="text-xs text-gray-500 hover:text-cyan-400 transition-colors">홈</Link></li>
              <li><Link href="/blog" className="text-xs text-gray-500 hover:text-cyan-400 transition-colors">블로그</Link></li>
              <li><Link href="/about" className="text-xs text-gray-500 hover:text-cyan-400 transition-colors">서비스 소개</Link></li>
              <li><Link href="/activity" className="text-xs text-gray-500 hover:text-cyan-400 transition-colors">Activity Log</Link></li>
            </ul>
          </div>

          {/* 정책 */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">정책</h3>
            <ul className="space-y-2">
              <li><Link href="/privacy" className="text-xs text-gray-500 hover:text-cyan-400 transition-colors">개인정보처리방침</Link></li>
              <li><Link href="/terms" className="text-xs text-gray-500 hover:text-cyan-400 transition-colors">이용약관</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 mt-8 pt-6 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} Incomplete Projects Discovery. All rights reserved.
          </p>
          <p className="text-[10px] text-gray-700 font-mono">
            362+ projects analyzed · 20+ languages · AI-powered insights
          </p>
        </div>
      </div>
    </footer>
  )
}


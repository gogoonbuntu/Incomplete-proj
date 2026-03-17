import Link from "next/link"
import { Header } from "@/components/header"
import { blogPosts } from "@/lib/blog-data"
import { Calendar, Clock, ChevronRight } from "lucide-react"

export const metadata = {
    title: "Blog | Incomplete Projects Discovery",
    description: "사이드 프로젝트, 오픈소스 기여, 개발 생산성 향상을 위한 인사이트 랩. 버려진 코드에서 반짝이는 아이디어를 찾습니다.",
}

export default function BlogPage() {
    return (
        <div className="min-h-screen bg-transparent text-white">
            <Header />
            <main className="container mx-auto px-4 py-12">
                <div className="mb-16 relative z-10">
                    <h1 className="text-5xl md:text-6xl font-black mb-6 animate-float title-gradient text-glow tracking-tight">
                        ENGINEER'S LOG
                    </h1>
                    <p className="text-cyan-100/80 text-lg md:text-xl max-w-3xl backdrop-blur-sm bg-black/20 p-4 rounded-lg border-l-4 border-cyan-500 font-light tracking-wide leading-relaxed">
                        방치된 코드를 예술로 승화시키는 통찰력. 오픈소스 생태계와 사이드 프로젝트의 성공 비결을 탐구합니다.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {blogPosts.map((post, index) => (
                        <Link
                            href={`/blog/${post.slug}`}
                            key={post.slug}
                            className="glass-panel rounded-2xl p-6 group transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(0,243,255,0.2)] border border-white/10 hover:border-cyan-500/50 flex flex-col h-full bg-slate-900/50"
                        >
                            <div className="flex flex-wrap gap-2 mb-4">
                                {post.tags.map(tag => (
                                    <span key={tag} className="text-xs font-mono px-2 py-1 rounded bg-cyan-950/50 text-cyan-300 border border-cyan-800/50 uppercase tracking-widest">
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
            </main>
        </div>
    )
}

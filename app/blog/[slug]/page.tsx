import { notFound } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header"
import { blogPosts } from "@/lib/blog-data"
import { Calendar, Clock, ArrowLeft, ArrowRight, Share2, BookOpen } from "lucide-react"

interface Props {
    params: Promise<{ slug: string }>
}

export async function generateMetadata(props: Props) {
    const params = await props.params;
    const post = blogPosts.find((p) => p.slug === params.slug)
    if (!post) return { title: 'Post Not Found' }

    return {
        title: `${post.title} | Incomplete Projects Blog`,
        description: post.excerpt,
        openGraph: {
            title: post.title,
            description: post.excerpt,
            type: 'article',
            publishedTime: post.date,
            tags: post.tags,
        },
    }
}

export default async function BlogPostPage(props: Props) {
    const params = await props.params;
    const currentIndex = blogPosts.findIndex((p) => p.slug === params.slug)
    const post = blogPosts[currentIndex]

    if (!post) {
        notFound()
    }

    const prevPost = currentIndex > 0 ? blogPosts[currentIndex - 1] : null
    const nextPost = currentIndex < blogPosts.length - 1 ? blogPosts[currentIndex + 1] : null

    // 태그 기반 관련 글 추천 (현재 글 제외, 최대 3개)
    const relatedPosts = blogPosts
        .filter((p) => p.slug !== post.slug)
        .map((p) => ({
            ...p,
            relevance: p.tags.filter((t) => post.tags.includes(t)).length,
        }))
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 3)

    // 간단한 마크다운 파싱 처리 
    const renderContent = (content: string) => {
        return content.split('\n').map((line, index) => {
            if (line.startsWith('# ')) return <h1 key={index} className="text-4xl font-black mt-12 mb-6 text-white">{line.replace('# ', '')}</h1>;
            if (line.startsWith('## ')) return <h2 key={index} className="text-2xl font-bold border-b border-cyan-900/50 pb-2 mt-10 mb-5 text-cyan-50">{line.replace('## ', '')}</h2>;
            if (line.startsWith('### ')) return <h3 key={index} className="text-xl font-semibold mt-8 mb-4 text-cyan-100">{line.replace('### ', '')}</h3>;
            if (line.startsWith('> ')) return <blockquote key={index} className="border-l-4 border-cyan-500 pl-4 py-2 my-6 bg-cyan-950/20 italic text-cyan-200/80">{line.replace('> ', '')}</blockquote>;
            if (line.startsWith('---')) return <hr key={index} className="my-8 border-white/10" />;
            if (line.match(/^[-*] /)) return <li key={index} className="ml-6 list-disc mb-2 text-gray-300 leading-relaxed">{line.replace(/^[-*] /, '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')}</li>;
            if (line.match(/^[0-9]+\\. /)) return <li key={index} className="ml-6 list-decimal mb-2 text-gray-300 leading-relaxed">{line.replace(/^[0-9]+\\. /, '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')}</li>;
            if (line.trim() === '') return <br key={index} />;

            let formattedLine = line
                .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
                .replace(/`([^`]+)`/g, '<code class="bg-slate-800 text-cyan-300 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');

            if (line === '```text' || line === '```') return null;

            return <p key={index} className="mb-5 text-gray-300 leading-relaxed font-light text-lg" dangerouslySetInnerHTML={{ __html: formattedLine }} />;
        });
    }

    return (
        <div className="min-h-screen bg-transparent text-white">
            <Header />

            <main className="container mx-auto px-4 py-12 max-w-4xl relative z-10">
                <Link
                    href="/blog"
                    className="inline-flex items-center text-cyan-500 hover:text-cyan-300 transition-colors font-mono tracking-widest text-sm mb-12 uppercase"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Archives
                </Link>

                <article className="glass-panel p-8 md:p-12 rounded-3xl border border-white/5 bg-black/40 backdrop-blur-xl">
                    <header className="mb-12">
                        <div className="flex flex-wrap gap-2 mb-6">
                            {post.tags.map(tag => (
                                <span key={tag} className="text-xs font-mono px-3 py-1.5 rounded-full bg-slate-800/80 text-cyan-400 border border-cyan-800/30">
                                    {tag}
                                </span>
                            ))}
                        </div>

                        <h1 className="text-4xl md:text-5xl font-black mb-6 leading-tight tracking-tight text-glow">
                            {post.title}
                        </h1>

                        <div className="flex items-center justify-between text-sm text-gray-400 font-mono mt-8 border-y border-white/10 py-4">
                            <div className="flex items-center space-x-6">
                                <span className="flex items-center">
                                    <Calendar className="w-4 h-4 mr-2 text-cyan-500" />
                                    {post.date}
                                </span>
                                <span className="flex items-center">
                                    <Clock className="w-4 h-4 mr-2 text-cyan-500" />
                                    {post.readTime}
                                </span>
                            </div>
                            <a
                                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(`https://incomplete-proj.vercel.app/blog/${post.slug}`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-gray-500 hover:text-cyan-400 transition-colors"
                                title="트위터에 공유"
                            >
                                <Share2 className="w-4 h-4" />
                                <span className="text-xs">공유</span>
                            </a>
                        </div>
                    </header>

                    <div className="prose prose-invert max-w-none">
                        {renderContent(post.content)}
                    </div>
                </article>

                {/* 이전/다음 글 네비게이션 */}
                <nav className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                    {prevPost ? (
                        <Link
                            href={`/blog/${prevPost.slug}`}
                            className="glass-panel p-5 rounded-xl border border-white/5 hover:border-cyan-500/30 transition-all group"
                        >
                            <span className="text-xs font-mono text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                <ArrowLeft className="w-3 h-3" /> 이전 글
                            </span>
                            <p className="text-sm text-gray-300 group-hover:text-cyan-300 mt-1 line-clamp-1 transition-colors">{prevPost.title}</p>
                        </Link>
                    ) : <div />}
                    {nextPost && (
                        <Link
                            href={`/blog/${nextPost.slug}`}
                            className="glass-panel p-5 rounded-xl border border-white/5 hover:border-cyan-500/30 transition-all group text-right"
                        >
                            <span className="text-xs font-mono text-gray-500 uppercase tracking-wider flex items-center gap-1 justify-end">
                                다음 글 <ArrowRight className="w-3 h-3" />
                            </span>
                            <p className="text-sm text-gray-300 group-hover:text-cyan-300 mt-1 line-clamp-1 transition-colors">{nextPost.title}</p>
                        </Link>
                    )}
                </nav>

                {/* 관련 글 추천 */}
                <section className="mt-16">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-cyan-400" />
                        <span className="title-gradient">관련 글 추천</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {relatedPosts.map((rp) => (
                            <Link
                                key={rp.slug}
                                href={`/blog/${rp.slug}`}
                                className="glass-panel p-5 rounded-xl border border-white/5 hover:border-purple-500/30 transition-all group hover:-translate-y-1"
                            >
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                    {rp.tags.slice(0, 2).map(tag => (
                                        <span key={tag} className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/50 text-purple-300 border border-purple-800/30">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                                <h3 className="text-sm font-semibold text-gray-300 group-hover:text-purple-300 line-clamp-2 transition-colors leading-snug">
                                    {rp.title}
                                </h3>
                                <p className="text-xs text-gray-500 mt-2">{rp.readTime}</p>
                            </Link>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    )
}


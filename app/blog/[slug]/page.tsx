import { notFound } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header"
import { blogPosts } from "@/lib/blog-data"
import { Calendar, Clock, ArrowLeft } from "lucide-react"

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
    }
}

export default async function BlogPostPage(props: Props) {
    const params = await props.params;
    const post = blogPosts.find((p) => p.slug === params.slug)

    if (!post) {
        notFound()
    }

    // 간단한 마크다운 파싱 처리 
    // 실제 프로덕션에서는 remark, react-markdown 등의 라이브러리를 쓰는 것을 권장합니다.
    const renderContent = (content: string) => {
        return content.split('\n').map((line, index) => {
            // Headers
            if (line.startsWith('# ')) return <h1 key={index} className="text-4xl font-black mt-12 mb-6 text-white">{line.replace('# ', '')}</h1>;
            if (line.startsWith('## ')) return <h2 key={index} className="text-2xl font-bold border-b border-cyan-900/50 pb-2 mt-10 mb-5 text-cyan-50">{line.replace('## ', '')}</h2>;
            if (line.startsWith('### ')) return <h3 key={index} className="text-xl font-semibold mt-8 mb-4 text-cyan-100">{line.replace('### ', '')}</h3>;

            // Quotes
            if (line.startsWith('> ')) return <blockquote key={index} className="border-l-4 border-cyan-500 pl-4 py-2 my-6 bg-cyan-950/20 italic text-cyan-200/80">{line.replace('> ', '')}</blockquote>;

            // Horizontal Rule
            if (line.startsWith('---')) return <hr key={index} className="my-8 border-white/10" />;

            // Unordered lists
            if (line.match(/^[-*] /)) return <li key={index} className="ml-6 list-disc mb-2 text-gray-300 leading-relaxed">{line.replace(/^[-*] /, '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')}</li>;

            // Ordered lists (simple)
            if (line.match(/^[0-9]+\\. /)) return <li key={index} className="ml-6 list-decimal mb-2 text-gray-300 leading-relaxed">{line.replace(/^[0-9]+\\. /, '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')}</li>;

            // Empty lines
            if (line.trim() === '') return <br key={index} />;

            // Bold text handling & Code blocks handling (inline)
            let formattedLine = line
                .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
                .replace(/`([^`]+)`/g, '<code class="bg-slate-800 text-cyan-300 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');

            if (line === '```text' || line === '```') return null; // Very basic block code skip, assuming only single language blocks

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

                        <div className="flex items-center space-x-6 text-sm text-gray-400 font-mono mt-8 border-y border-white/10 py-4">
                            <span className="flex items-center">
                                <Calendar className="w-4 h-4 mr-2 text-cyan-500" />
                                {post.date}
                            </span>
                            <span className="flex items-center">
                                <Clock className="w-4 h-4 mr-2 text-cyan-500" />
                                {post.readTime}
                            </span>
                        </div>
                    </header>

                    <div className="prose prose-invert max-w-none">
                        {renderContent(post.content)}
                    </div>
                </article>
            </main>
        </div>
    )
}

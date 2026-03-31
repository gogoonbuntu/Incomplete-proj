import { Header } from "@/components/header"
import { BlogList } from "@/components/blog-list"

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
                        ENGINEER&apos;S LOG
                    </h1>
                    <p className="text-cyan-100/80 text-lg md:text-xl max-w-3xl backdrop-blur-sm bg-black/20 p-4 rounded-lg border-l-4 border-cyan-500 font-light tracking-wide leading-relaxed">
                        방치된 코드를 예술로 승화시키는 통찰력. 오픈소스 생태계와 사이드 프로젝트의 성공 비결을 탐구합니다.
                    </p>
                </div>

                <BlogList />
            </main>
        </div>
    )
}

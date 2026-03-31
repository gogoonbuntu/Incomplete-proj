import { Header } from "@/components/header"
import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "About | Incomplete Projects Discovery",
  description: "GitHub에서 방치된 유망한 오픈소스 프로젝트를 AI로 발굴하고 분석하는 서비스입니다. 미완성 프로젝트에 새 생명을 불어넣어보세요.",
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-transparent text-white">
      <Header />
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <Link href="/" className="text-cyan-400/60 hover:text-cyan-400 text-sm font-mono mb-6 inline-block transition-colors">
          ← 메인으로 돌아가기
        </Link>

        <article className="prose prose-invert prose-lg max-w-none">
          <h1 className="text-4xl font-bold mb-4 title-gradient">About Us</h1>
          <p className="text-gray-400 text-sm mb-8">Incomplete Projects Discovery 소개</p>

          <section className="glass-panel rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-semibold text-cyan-300 mb-4">🚀 우리가 하는 일</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              <strong>Incomplete Projects Discovery</strong>는 GitHub에 흩어져 있는 수많은 <strong>미완성 오픈소스 프로젝트</strong>를 
              자동으로 발굴하고, AI를 활용하여 각 프로젝트의 잠재력과 기술적 특성을 분석하는 서비스입니다.
            </p>
            <p className="text-gray-300 leading-relaxed mb-4">
              전 세계 개발자들이 열정적으로 시작했지만 완성하지 못한 프로젝트들 속에는 놀라운 아이디어와 가치 있는 코드가 숨겨져 있습니다. 
              우리는 이런 프로젝트들을 체계적으로 수집하고 분석하여, 새로운 기여자(Contributor)와 연결해줍니다.
            </p>
          </section>

          <section className="glass-panel rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-semibold text-purple-300 mb-4">🎯 왜 이 서비스를 만들었을까?</h2>
            <div className="space-y-4 text-gray-300 leading-relaxed">
              <p>
                GitHub에는 매일 수천 개의 새로운 저장소가 생성됩니다. 그중 대부분은 초기 열정이 식으면서 방치되지만, 
                이 프로젝트들 중에는 충분한 잠재력을 가진 것들이 많습니다.
              </p>
              <p>
                한편, 오픈소스에 기여하고 싶지만 어디서부터 시작해야 할지 모르는 개발자들도 많습니다. 
                거대한 프로젝트(React, Linux 등)에 기여하려면 높은 진입 장벽을 넘어야 하지만, 
                작고 미완성인 프로젝트에서는 누구나 의미 있는 기여를 할 수 있습니다.
              </p>
              <p>
                <strong>Incomplete Projects Discovery</strong>는 이 두 문제를 동시에 해결합니다:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>방치된 프로젝트에 새 생명을 불어넣고</li>
                <li>오픈소스 초보자에게 실전 경험의 기회를 제공하며</li>
                <li>개발 커뮤니티 전체의 생태계를 더 건강하게 만듭니다</li>
              </ul>
            </div>
          </section>

          <section className="glass-panel rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-semibold text-green-300 mb-4">🔧 어떻게 동작하나요?</h2>
            <div className="space-y-4 text-gray-300 leading-relaxed">
              <div className="flex gap-4 items-start">
                <span className="text-2xl">1️⃣</span>
                <div>
                  <h3 className="font-semibold text-white mb-1">자동 크롤링</h3>
                  <p>GitHub Search API를 활용하여 20개 이상의 프로그래밍 언어에서 잠재력 있는 미완성 프로젝트를 매일 자동으로 검색합니다. 
                  스타 수, 활동 이력, 코드 크기 등 다차원 기준으로 필터링합니다.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <span className="text-2xl">2️⃣</span>
                <div>
                  <h3 className="font-semibold text-white mb-1">AI 분석</h3>
                  <p>Google Gemini AI를 활용하여 각 프로젝트의 코드 구조, 기술 스택, 아키텍처 특성을 심층 분석합니다. 
                  README, 파일 구조, 의존성 등을 종합적으로 평가하여 전문적인 기술 리포트를 생성합니다.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <span className="text-2xl">3️⃣</span>
                <div>
                  <h3 className="font-semibold text-white mb-1">품질 스코어링</h3>
                  <p>인기도, 프로젝트 실체, 활동도, 성숙도 시그널, 트렌드 부합도의 5가지 차원으로 각 프로젝트를 평가하여 
                  10점 만점의 품질 점수를 부여합니다.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <span className="text-2xl">4️⃣</span>
                <div>
                  <h3 className="font-semibold text-white mb-1">큐레이션 제공</h3>
                  <p>언어별, 토픽별, 점수별로 필터링과 검색이 가능한 대시보드를 제공하여 
                  사용자가 자신에게 맞는 프로젝트를 쉽게 찾을 수 있도록 합니다.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="glass-panel rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-semibold text-yellow-300 mb-4">💡 이런 분들에게 추천합니다</h2>
            <ul className="space-y-3 text-gray-300">
              <li className="flex gap-3"><span>👨‍💻</span><span>오픈소스 첫 기여를 준비하는 주니어 개발자</span></li>
              <li className="flex gap-3"><span>🔍</span><span>흥미로운 사이드 프로젝트 아이디어를 찾는 개발자</span></li>
              <li className="flex gap-3"><span>📚</span><span>다양한 코드 구조와 아키텍처를 학습하고 싶은 분</span></li>
              <li className="flex gap-3"><span>🏢</span><span>특정 기술 스택의 실제 프로젝트 사례를 연구하는 팀</span></li>
              <li className="flex gap-3"><span>🌱</span><span>개발 커뮤니티에 긍정적인 영향을 주고 싶은 분</span></li>
            </ul>
          </section>

          <section className="glass-panel rounded-2xl p-8">
            <h2 className="text-2xl font-semibold text-pink-300 mb-4">📬 문의</h2>
            <p className="text-gray-300 leading-relaxed">
              서비스에 대한 의견이나 제안이 있으시다면 
              <a href="https://github.com/gogoonbuntu" className="text-cyan-400 hover:text-cyan-300 ml-1">GitHub</a>를 
              통해 연락해주세요. 더 나은 서비스를 만들기 위해 항상 노력하겠습니다.
            </p>
          </section>
        </article>
      </main>
    </div>
  )
}

import { Header } from "@/components/header"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "FAQ | Incomplete Projects Discovery",
  description: "자주 묻는 질문 — 미완성 프로젝트 탐색기의 사용법, AI 분석, 오픈소스 기여 방법에 대한 답변입니다.",
}

const faqs = [
  {
    q: "Incomplete Projects Discovery는 어떤 서비스인가요?",
    a: "GitHub에서 방치되었지만 잠재력 있는 오픈소스 프로젝트를 AI(Google Gemini)로 자동 분석하여 큐레이션하는 서비스입니다. 개발자들이 기여하거나 포크할 만한 프로젝트를 쉽게 발견할 수 있도록 돕습니다.",
  },
  {
    q: "프로젝트 스코어는 어떻게 계산되나요?",
    a: "AI가 커밋 이력, 인기도(스타/포크), 문서화 수준, 코드 구조, 최근 활동, 성장 잠재력 등 6가지 차원을 분석하여 10점 만점으로 종합 평가합니다. 점수가 높을수록 기여 가치가 높은 프로젝트입니다.",
  },
  {
    q: "추천 알고리즘은 어떻게 동작하나요?",
    a: "기본 AI 스코어(40%), 최신 업데이트 정도(30%), 개인 선호도(30%)를 조합하여 맞춤 추천합니다. 선호도는 사용자가 클릭한 프로젝트의 언어, 카테고리, 토픽을 브라우저 localStorage에 저장하여 반영합니다. 서버에는 전혀 전송되지 않습니다.",
  },
  {
    q: "개인정보를 수집하나요?",
    a: "추천을 위한 클릭 선호도 데이터는 브라우저 localStorage에만 저장되며, 서버나 외부에 전송하지 않습니다. 브라우저 데이터를 삭제하면 즉시 초기화됩니다. GitHub 로그인 시 Firebase Authentication을 통해 기본 프로필 정보만 사용합니다.",
  },
  {
    q: "프로젝트는 얼마나 자주 업데이트되나요?",
    a: "GitHub 크롤링은 매일 자동으로 실행되며, AI 요약 분석은 7일 주기로 전체 프로젝트를 순환 업데이트합니다. 수동으로 '새 프로젝트 수집' 버튼을 눌러 즉시 새로운 프로젝트를 탐색할 수도 있습니다.",
  },
  {
    q: "오픈소스에 기여하려면 어떻게 시작하나요?",
    a: "프로젝트 상세 페이지에서 'GitHub 저장소 탐사' 버튼을 클릭하면 원본 저장소로 이동합니다. Issues 탭에서 'good first issue' 라벨을 찾거나, AI가 제안한 '미해결 미션' 항목을 참고하여 기여를 시작할 수 있습니다.",
  },
  {
    q: "어떤 프로그래밍 언어의 프로젝트를 지원하나요?",
    a: "JavaScript, TypeScript, Python, Go, Rust, Java, C#, Kotlin, Shell, Vue 등 20개 이상의 언어를 지원합니다. 필터 기능을 사용하여 원하는 언어의 프로젝트만 탐색할 수 있습니다.",
  },
  {
    q: "블로그 콘텐츠는 누가 작성하나요?",
    a: "블로그의 모든 기술 아티클은 오픈소스 생태계와 개발자 문화에 관한 실전 경험을 바탕으로 작성됩니다. Git 전략, 코드 리뷰, REST API 설계, 개발자 번아웃 등 실무에 도움이 되는 심층 주제를 다룹니다.",
  },
  {
    q: "이 서비스는 무료인가요?",
    a: "네, 완전히 무료입니다. 프로젝트 탐색, AI 분석 리포트 열람, 북마크, 블로그 열람 등 모든 기능을 무료로 이용할 수 있습니다.",
  },
  {
    q: "문의나 피드백은 어떻게 보내나요?",
    a: "GitHub 저장소의 Issues 탭에서 버그 리포트, 기능 제안, 일반 문의를 남길 수 있습니다. 모든 피드백을 환영합니다.",
  },
]

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-transparent text-white">
      <Header />
      <main className="container mx-auto px-4 py-12 max-w-4xl relative z-10">
        <h1 className="text-5xl font-black mb-4 title-gradient text-glow tracking-tight">FAQ</h1>
        <p className="text-cyan-100/60 mb-12 text-lg font-light">자주 묻는 질문과 답변</p>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <details
              key={i}
              className="glass-panel rounded-xl border border-white/5 group open:border-cyan-500/30 transition-all"
            >
              <summary className="cursor-pointer p-6 flex items-start gap-4 list-none select-none">
                <span className="text-cyan-500 font-mono font-bold text-sm mt-0.5 shrink-0">Q{i + 1}</span>
                <span className="font-semibold text-white group-open:text-cyan-300 transition-colors">{faq.q}</span>
                <span className="ml-auto text-gray-600 group-open:rotate-180 transition-transform text-lg shrink-0">▾</span>
              </summary>
              <div className="px-6 pb-6 pl-14">
                <p className="text-gray-400 leading-relaxed font-light">{faq.a}</p>
              </div>
            </details>
          ))}
        </div>
      </main>
    </div>
  )
}

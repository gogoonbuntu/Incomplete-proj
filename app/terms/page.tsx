import { Header } from "@/components/header"
import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "이용약관 | Incomplete Projects Discovery",
  description: "Incomplete Projects Discovery 서비스의 이용약관입니다.",
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-transparent text-white">
      <Header />
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <Link href="/" className="text-cyan-400/60 hover:text-cyan-400 text-sm font-mono mb-6 inline-block transition-colors">
          ← 메인으로 돌아가기
        </Link>

        <article className="prose prose-invert prose-lg max-w-none">
          <h1 className="text-3xl font-bold mb-2">이용약관</h1>
          <p className="text-gray-500 text-sm mb-8">최종 수정일: 2025년 3월 27일</p>

          <div className="glass-panel rounded-2xl p-8 space-y-8 text-gray-300 leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">제1조 (목적)</h2>
              <p>이 약관은 Incomplete Projects Discovery(이하 "본 서비스")가 제공하는 인터넷 서비스의 이용과 관련하여 
                 서비스 제공자와 이용자 간의 권리, 의무 및 책임 사항 등을 규정함을 목적으로 합니다.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">제2조 (서비스의 내용)</h2>
              <p>본 서비스는 다음과 같은 기능을 무료로 제공합니다:</p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>GitHub에서 수집한 미완성 오픈소스 프로젝트 정보 열람</li>
                <li>AI 기반 프로젝트 분석 리포트 열람</li>
                <li>프로젝트 검색, 필터링, 정렬 기능</li>
                <li>프로젝트 북마크 기능 (로그인 필요)</li>
                <li>개발 관련 블로그 콘텐츠 열람</li>
                <li>프로그래밍 언어 및 토픽 트렌드 통계 열람</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">제3조 (서비스 이용)</h2>
              <div className="space-y-3">
                <p>① 본 서비스는 별도의 회원가입 없이 자유롭게 이용할 수 있습니다. 
                   단, 북마크 등 일부 기능은 GitHub 계정으로 로그인해야 합니다.</p>
                <p>② 본 서비스에서 제공하는 프로젝트 정보는 GitHub의 공개 데이터를 기반으로 하며, 
                   정보의 정확성이나 완전성을 보장하지 않습니다.</p>
                <p>③ AI가 생성한 분석 내용은 참고용이며, 실제 프로젝트 평가와 다를 수 있습니다.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">제4조 (이용자의 의무)</h2>
              <p>이용자는 서비스 이용 시 다음 행위를 해서는 안 됩니다:</p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>타인의 정보를 도용하는 행위</li>
                <li>서비스에 게시된 정보를 변경하거나 허위 정보를 유포하는 행위</li>
                <li>서비스의 안정적 운영을 방해하는 행위 (과도한 크롤링, DDoS 등)</li>
                <li>기타 관계 법령에 위배되는 행위</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">제5조 (지적재산권)</h2>
              <div className="space-y-3">
                <p>① 본 서비스가 제작한 콘텐츠(블로그 글, UI 디자인, AI 분석 리포트 등)에 대한 저작권은 서비스 제공자에게 있습니다.</p>
                <p>② GitHub에서 수집된 프로젝트 정보의 저작권은 각 프로젝트의 원작자 및 해당 라이선스에 따릅니다.</p>
                <p>③ 본 서비스는 GitHub API의 이용약관을 준수하여 공개 데이터만을 수집합니다.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">제6조 (면책 조항)</h2>
              <div className="space-y-3">
                <p>① 본 서비스는 무료로 제공되며, 서비스 이용으로 인해 발생하는 손해에 대해 법적 책임을 지지 않습니다.</p>
                <p>② 천재지변, 시스템 장애, 외부 API 장애 등 불가항력에 의한 서비스 중단에 대해 책임을 지지 않습니다.</p>
                <p>③ 이용자가 서비스를 통해 얻은 정보를 활용하여 발생하는 결과에 대해 서비스 제공자는 책임을 지지 않습니다.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">제7조 (광고 게재)</h2>
              <p>본 서비스는 운영 비용 충당을 위해 Google AdSense 등의 광고를 게재할 수 있습니다. 
                 광고 콘텐츠에 대한 책임은 해당 광고주에게 있으며, 이용자가 광고를 통해 발생한 거래에 대해 
                 서비스 제공자는 책임을 지지 않습니다.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">제8조 (약관의 변경)</h2>
              <p>본 약관은 관련 법령의 변경이나 서비스 정책 변경 시 수정될 수 있으며, 
                 변경된 약관은 본 페이지를 통해 공지합니다. 
                 변경된 약관에 동의하지 않는 이용자는 서비스 이용을 중단할 수 있습니다.</p>
            </section>
          </div>
        </article>
      </main>
    </div>
  )
}

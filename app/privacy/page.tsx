import { Header } from "@/components/header"
import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "개인정보처리방침 | Incomplete Projects Discovery",
  description: "Incomplete Projects Discovery 서비스의 개인정보처리방침입니다.",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-transparent text-white">
      <Header />
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <Link href="/" className="text-cyan-400/60 hover:text-cyan-400 text-sm font-mono mb-6 inline-block transition-colors">
          ← 메인으로 돌아가기
        </Link>

        <article className="prose prose-invert prose-lg max-w-none">
          <h1 className="text-3xl font-bold mb-2">개인정보처리방침</h1>
          <p className="text-gray-500 text-sm mb-8">최종 수정일: 2025년 3월 27일</p>

          <div className="glass-panel rounded-2xl p-8 space-y-8 text-gray-300 leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">1. 수집하는 개인정보</h2>
              <p>Incomplete Projects Discovery(이하 "본 서비스")는 서비스 제공을 위해 최소한의 정보만을 수집합니다.</p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li><strong>GitHub 로그인 시</strong>: GitHub에서 제공하는 공개 프로필 정보(사용자명, 프로필 이미지 URL, 이메일 주소)</li>
                <li><strong>자동 수집 정보</strong>: 서비스 이용 시 자동으로 생성되는 정보(IP 주소, 브라우저 종류, 접속 시간, 쿠키)</li>
                <li><strong>북마크 기능 이용 시</strong>: 사용자가 저장한 프로젝트 북마크 목록</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">2. 개인정보의 이용 목적</h2>
              <p>수집된 정보는 다음의 목적으로만 이용됩니다:</p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>사용자 인증 및 계정 관리</li>
                <li>북마크 등 개인화 기능 제공</li>
                <li>서비스 이용 통계 분석 및 서비스 품질 향상</li>
                <li>서비스 관련 공지사항 전달</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">3. 개인정보의 보관 및 파기</h2>
              <p>사용자의 개인정보는 서비스 이용 기간 동안 보관되며, 회원 탈퇴 시 또는 수집 목적이 달성된 후 지체 없이 파기합니다. 
                 단, 관계 법령에 의한 의무 보관 기간이 있는 경우에는 해당 기간 동안 보관합니다.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">4. 개인정보의 제3자 제공</h2>
              <p>본 서비스는 원칙적으로 사용자의 개인정보를 제3자에게 제공하지 않습니다. 
                 다만, 다음의 경우에는 예외적으로 제공할 수 있습니다:</p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>사용자가 사전에 동의한 경우</li>
                <li>법령에 의해 요구되는 경우</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">5. 쿠키(Cookie) 사용</h2>
              <p>본 서비스는 사용자 경험 개선 및 서비스 분석을 위해 쿠키를 사용합니다. 사용자는 브라우저 설정을 통해 
                 쿠키 수집을 거부할 수 있으나, 이 경우 일부 서비스 이용에 제한이 있을 수 있습니다.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">6. 광고</h2>
              <p>본 서비스는 Google AdSense를 통해 광고를 게재할 수 있습니다. Google AdSense는 사용자의 관심사에 맞는 
                 광고를 제공하기 위해 쿠키를 사용할 수 있습니다. 자세한 내용은 
                 <a href="https://policies.google.com/privacy" className="text-cyan-400 hover:text-cyan-300" target="_blank" rel="noopener noreferrer"> Google 개인정보처리방침</a>을 참고해주세요.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">7. 사용자의 권리</h2>
              <p>사용자는 언제든지 다음의 권리를 행사할 수 있습니다:</p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>개인정보 열람, 정정, 삭제 요청</li>
                <li>개인정보 처리 정지 요청</li>
                <li>회원 탈퇴</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">8. 개인정보 보호 책임자</h2>
              <p>개인정보 처리에 관한 문의는 GitHub 이슈 또는 이메일을 통해 연락해주시기 바랍니다.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">9. 변경 사항</h2>
              <p>본 개인정보처리방침은 법령, 정책 또는 서비스 변경 시 수정될 수 있으며, 
                 변경 시 본 페이지를 통해 고지합니다.</p>
            </section>
          </div>
        </article>
      </main>
    </div>
  )
}

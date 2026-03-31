import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/hooks/use-auth"
import { GoogleAdSense } from "@/components/google-adsense"
import { ThemeProvider } from "@/components/theme-provider" 
import { Toaster } from "@/components/ui/sonner"
import { LanguageProvider } from "@/hooks/use-language"
import { GalaxyBackground } from "@/components/galaxy-background"
import { Footer } from "@/components/footer"
import { ScrollToTop } from "@/components/scroll-to-top"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Incomplete Projects Discovery | 미완성 오픈소스 프로젝트 탐색기",
  description: "GitHub에서 방치된 유망한 오픈소스 프로젝트를 AI로 발굴하고 분석합니다. 20개 이상의 프로그래밍 언어에서 트렌디한 미완성 프로젝트를 검색하고, 품질 스코어링을 거쳐 큐레이션해드립니다.",
  keywords: ["오픈소스", "GitHub", "미완성 프로젝트", "AI 분석", "사이드 프로젝트", "프로그래밍", "개발자 도구"],
  authors: [{ name: "Incomplete Projects Discovery" }],
  openGraph: {
    title: "Incomplete Projects Discovery",
    description: "GitHub에서 방치된 유망한 오픈소스 프로젝트를 AI로 발굴하고 분석합니다.",
    type: "website",
    locale: "ko_KR",
    siteName: "Incomplete Projects Discovery",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <LanguageProvider>
            <AuthProvider>
              {/* High-Quality Interactive 3D Galaxy Background */}
              <GalaxyBackground />
              
              <div className="relative z-10 flex min-h-screen flex-col">
                <main className="flex-1">{children}</main>
                <Footer />
              </div>
              <ScrollToTop />
              <Toaster />
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
        <GoogleAdSense />
      </body>
    </html>
  )
}

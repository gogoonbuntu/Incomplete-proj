import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/hooks/use-auth"
import { GoogleAdSense } from "@/components/google-adsense"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "미완성 프로젝트 게시판",
  description: "GitHub의 미완성 프로젝트들을 발견하고 이어서 개발해보세요",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
        <GoogleAdSense />
      </body>
    </html>
  )
}

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

const inter = Inter({ subsets: ["latin"] })

// ... (metadata remains same)

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
              </div>
              <Toaster />
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
        <GoogleAdSense />
      </body>
    </html>
  )
}

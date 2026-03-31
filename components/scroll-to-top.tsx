"use client"

import { useState, useEffect } from "react"
import { ArrowUp } from "lucide-react"

export function ScrollToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 400)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  if (!visible) return null

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-6 right-6 z-50 p-3 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 backdrop-blur-md hover:bg-cyan-900/80 hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(0,243,255,0.2)] transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
      title="맨 위로"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  )
}

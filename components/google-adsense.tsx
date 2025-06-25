"use client"

import { useEffect } from "react"
import Script from "next/script"

interface GoogleAdSenseProps {
  adClient?: string
}

// Fix window.adsbygoogle type issue
declare global {
  interface Window {
    adsbygoogle: any[]
  }
}

export function GoogleAdSense({ adClient }: GoogleAdSenseProps) {
  // Get client ID from props or environment variable
  const clientId = adClient || process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT || ""
  
  useEffect(() => {
    // Only run on client side and if client ID exists
    if (typeof window !== "undefined" && clientId && window.adsbygoogle) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({})
      } catch (e) {
        console.error("AdSense 새로고침 오류:", e)
      }
    }
  }, [clientId])

  // Don't render script if no client ID is available
  if (!clientId) {
    return null
  }

  return (
    <Script
      id="google-adsense"
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
      strategy="afterInteractive"
      crossOrigin="anonymous"
      onError={(e) => {
        console.error("AdSense 스크립트 로드 오류:", e)
      }}
    />
  )
}

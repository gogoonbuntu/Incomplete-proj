"use client"

import { useEffect } from "react"
import Script from "next/script"

interface GoogleAdSenseProps {
  adClient?: string
}

export function GoogleAdSense({ adClient = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT || "" }: GoogleAdSenseProps) {
  useEffect(() => {
    // AdSense가 이미 로드된 경우 광고 새로고침
    if (window.adsbygoogle) {
      try {
        ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      } catch (e) {
        console.error("AdSense 새로고침 오류:", e)
      }
    }
  }, [])

  return (
    <>
      <Script
        id="google-adsense"
        async
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adClient}`}
        strategy="afterInteractive"
        crossOrigin="anonymous"
        onError={(e) => {
          console.error("AdSense 스크립트 로드 오류:", e)
        }}
      />
    </>
  )
}

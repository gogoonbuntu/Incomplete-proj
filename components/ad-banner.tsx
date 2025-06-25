"use client"

import type React from "react"
import { useEffect, useId } from "react"
import { Card } from "@/components/ui/card"

// Fix window.adsbygoogle type issue
declare global {
  interface Window {
    adsbygoogle: any[]
  }
}

interface AdBannerProps {
  adSlot?: string
  format?: "auto" | "horizontal" | "vertical" | "rectangle"
  responsive?: boolean
  className?: string
  style?: React.CSSProperties
}

export function AdBanner({
  adSlot = "XXXXXXXXX",
  format = "auto",
  responsive = true,
  className = "",
  style = {},
}: AdBannerProps) {
  const id = useId()
  const adClient = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT || "ca-pub-6543044917100000"

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return
    
    try {
      // 광고 중복 초기화 방지를 위한 확인
      const adElements = document.querySelectorAll('ins.adsbygoogle');
      
      // 현재 요소가 이미 초기화되었는지 확인
      let alreadyInitialized = false;
      
      // 타입스크립트 오류 피하기 위해 HTMLElement로 타입 지정
      adElements.forEach((ad: Element) => {
        // 안전하게 타입 확인
        const htmlAd = ad as HTMLElement;
        if (htmlAd.getAttribute('data-adsbygoogle-status') === 'done') {
          alreadyInitialized = true;
        }
      });
      
      // 아직 초기화되지 않은 경우에만 초기화
      if (window.adsbygoogle && !alreadyInitialized) {
        (window.adsbygoogle = window.adsbygoogle || []).push({})
      }
    } catch (error) {
      console.error("광고 로드 오류:", error)
    }
  }, [])

  // For development/testing, show a placeholder
  if (process.env.NODE_ENV === "development") {
    return (
      <Card className={`overflow-hidden ${className}`} style={style}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "280px",
            backgroundColor: "#f0f0f0",
            color: "#666",
            ...style,
          }}
        >
          광고 영역 ({format})
        </div>
      </Card>
    )
  }

  return (
    <Card className={`overflow-hidden ${className}`} style={style}>
      <div className="adsbanner-container">
        <ins
          className="adsbygoogle"
          style={{
            display: "block",
            textAlign: "center",
            minHeight: "280px",
            ...style,
          }}
          data-ad-client={adClient}
          data-ad-slot={adSlot}
          data-ad-format={format}
          data-full-width-responsive={responsive ? "true" : "false"}
          data-ad-test="on"
          id={`ad-${id}`}
        />
      </div>
    </Card>
  )
}

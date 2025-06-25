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
      // Initialize ads when the component mounts
      if (window.adsbygoogle) {
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

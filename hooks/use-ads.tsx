"use client"

import { useState, useEffect } from "react"
import { defaultAdConfig, type AdConfig } from "@/types/ads"

export function useAds() {
  const [adConfig, setAdConfig] = useState<AdConfig>(defaultAdConfig)
  const [isAdBlocked, setIsAdBlocked] = useState<boolean>(false)

  useEffect(() => {
    // 광고 차단 감지
    const detectAdBlock = async () => {
      try {
        // 간단한 광고 차단 감지 방법
        const testAd = document.createElement("div")
        testAd.className = "adsbox"
        testAd.innerHTML = "&nbsp;"
        document.body.appendChild(testAd)

        // 짧은 지연 후 확인
        await new Promise((resolve) => setTimeout(resolve, 100))

        // 광고 차단기가 활성화되어 있으면 요소가 숨겨짐
        const isBlocked = testAd.offsetHeight === 0
        setIsAdBlocked(isBlocked)

        // 테스트 요소 제거
        document.body.removeChild(testAd)

        if (isBlocked) {
          console.log("광고 차단이 감지되었습니다.")
        }
      } catch (error) {
        console.error("광고 차단 감지 오류:", error)
      }
    }

    // 로컬 스토리지에서 광고 설정 불러오기
    const loadAdConfig = () => {
      try {
        const savedConfig = localStorage.getItem("adConfig")
        if (savedConfig) {
          setAdConfig({ ...defaultAdConfig, ...JSON.parse(savedConfig) })
        }
      } catch (error) {
        console.error("광고 설정 로드 오류:", error)
      }
    }

    detectAdBlock()
    loadAdConfig()
  }, [])

  // 광고 설정 저장
  const saveAdConfig = (newConfig: Partial<AdConfig>) => {
    const updatedConfig = { ...adConfig, ...newConfig }
    setAdConfig(updatedConfig)
    try {
      localStorage.setItem("adConfig", JSON.stringify(updatedConfig))
    } catch (error) {
      console.error("광고 설정 저장 오류:", error)
    }
  }

  // 광고 활성화/비활성화
  const toggleAds = (enabled: boolean) => {
    saveAdConfig({ enabled })
  }

  return {
    adConfig,
    isAdBlocked,
    toggleAds,
    saveAdConfig,
  }
}

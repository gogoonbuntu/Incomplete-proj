"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

type Language = "ko" | "en" | "zh"

interface TranslationData {
  [key: string]: {
    [key in Language]: string
  }
}

export const translations: TranslationData = {
  title: {
    ko: "미완성 프로젝트 게시판",
    en: "Incomplete Projects",
    zh: "未完成项目公告板"
  },
  subtitle: {
    ko: "GitHub의 잠재력 있는 코드들을 발견하고 은하계를 확장해보세요.",
    en: "Discover potential codes on GitHub and expand the galaxy.",
    zh: "发现 GitHub 上的潜力代码并扩展银河系。"
  },
  searchPlaceholder: {
    ko: "탐사할 프로젝트, 기술 스택, 좌표(언어)를 입력하세요...",
    en: "Enter project, tech stack, or coordinates (language) to explore...",
    zh: "输入要探索的项目、技术栈或坐标（语言）..."
  },
  scanButton: {
    ko: "새 프로젝트 수집",
    en: "SCAN NEW SYSTEMS",
    zh: "扫描新系统"
  },
  scanning: {
    ko: "스캐닝 중...",
    en: "SCANNING...",
    zh: "扫描中..."
  },
  signalsDetected: {
    ko: "개의 신호 감지됨",
    en: "SIGNALS DETECTED",
    zh: "个信号被检测到"
  },
  analyze: {
    ko: "분석",
    en: "Analyze",
    zh: "分析"
  },
  deploy: {
    ko: "배포",
    en: "Deploy",
    zh: "部署"
  },
  missionLog: {
    ko: "미션 로그",
    en: "MISSION LOG",
    zh: "任务日志"
  }
}

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("ko")

  useEffect(() => {
    const savedLang = localStorage.getItem("preferred-language") as Language
    if (savedLang && ["ko", "en", "zh"].includes(savedLang)) {
      setLanguage(savedLang)
    }
  }, [])

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang)
    localStorage.setItem("preferred-language", lang)
  }

  const t = (key: string) => {
    if (!translations[key]) return key
    return translations[key][language]
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}

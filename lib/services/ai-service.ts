import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai"
import { logger } from "./logger-service"
import Groq from "groq-sdk"

interface SummaryRequest {
  readme: string
  description: string
  language: string
}

// 프로젝트 분석 결과 타입
interface ProjectAnalysis {
  summary: string
  techStack: string[]
  difficulty: string
  completionStatus: string
  estimatedTime: string
  category: string
  tags: string[]
  todos: string[]
  categories: string[]
}

// GitHub 저장소 타입
interface Repository {
  name?: string
  full_name?: string
  description?: string
  language?: string
  stargazers_count?: number
  forks_count?: number
  updated_at?: string
  created_at?: string
  html_url?: string
  owner?: {
    login?: string
  }
}

class AIService {
  private apiKey: string
  private groqApiKey: string
  private genAI: GoogleGenerativeAI | null = null
  private groq: Groq | null = null
  private requestCount = 0
  private lastResetTime = Date.now()
  private maxRequestsPerMinute = 30 // Increased from 8
  private dailyRequestCount = 0
  private lastDayReset = new Date().getDate()
  private maxDailyRequests = 1000 // Increased from 100

  constructor() {
    // 다양한 방식으로 환경 변수 로드 시도
    this.apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
    this.groqApiKey = process.env.GROQ_API_KEY || ''
    
    if (!this.apiKey) {
      console.warn('GEMINI_API_KEY is not set in environment variables. AI 기능이 제한됩니다.')
    }
    
    // API 키가 있을 때만 GoogleGenerativeAI 초기화
    if (this.apiKey) {
      this.genAI = new GoogleGenerativeAI(this.apiKey)
    }

    if (this.groqApiKey) {
      this.groq = new Groq({ apiKey: this.groqApiKey })
      logger.info('Groq API가 폴백으로 설정되었습니다.')
    }
  }

  private async checkRateLimit(): Promise<boolean> {
    const now = Date.now()
    const currentDay = new Date().getDate()

    // 일일 카운터 리셋
    if (currentDay !== this.lastDayReset) {
      this.dailyRequestCount = 0
      this.lastDayReset = currentDay
      logger.info("AI API 일일 카운터가 리셋되었습니다")
    }

    // 일일 한도 체크
    if (this.dailyRequestCount >= this.maxDailyRequests) {
      logger.warn(`AI API 일일 한도 도달 (${this.dailyRequestCount}/${this.maxDailyRequests})`)
      return false
    }

    // 분당 카운터 리셋
    const timeSinceReset = now - this.lastResetTime
    if (timeSinceReset >= 60000) {
      this.requestCount = 0
      this.lastResetTime = now
      logger.info("AI API 분당 카운터가 리셋되었습니다")
    }

    // 분당 한도 체크
    if (this.requestCount >= this.maxRequestsPerMinute) {
      const waitTime = 60000 - timeSinceReset + 5000 // 5초 추가 마진
      logger.warn(`AI API 분당 한도 도달. ${Math.ceil(waitTime / 1000)}초 대기 필요`)
      return false
    }

    return true
  }

  /**
   * 텍스트 생성 메서드 - 프로젝트 설명 업데이트에 사용
   * @param prompt 텍스트 생성을 위한 프롬프트
   * @returns 생성된 텍스트 또는 null (오류 발생 시)
   */
  async generateText(prompt: string): Promise<string | null> {
    try {
      // 요청 한도 확인
      const canProceed = await this.checkRateLimit()
      if (!canProceed) {
        logger.warn("AI API 한도 초과로 텍스트 생성을 건너뜁니다.")
        return null
      }
      
      // 1. Gemini 시도
      if (this.genAI) {
        try {
          const model = this.genAI.getGenerativeModel({
            model: "gemini-pro",
          })
          
          this.requestCount++
          this.dailyRequestCount++
          
          const result = await model.generateContent(prompt)
          const response = await result.response
          return response.text()
        } catch (geminiError) {
          logger.error("Gemini 텍스트 생성 실패, Groq 시도:", geminiError)
        }
      }

      // 2. Groq 폴백 시도
      if (this.groq) {
        try {
          const completion = await this.groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
          })
          return completion.choices[0]?.message?.content || null
        } catch (groqError) {
          logger.error("Groq 텍스트 생성 실패:", groqError)
        }
      }
      
      return null
    } catch (error) {
      logger.error("텍스트 생성 중 오류:", error)
      return null
    }
  }

  // Groq를 사용한 프로젝트 분석
  private async analyzeProjectWithGroq(
    repository: Repository,
    readme: string,
  ): Promise<{
    summary: string
    todos: string[]
    categories: string[]
  } | null> {
    if (!this.groq) return null

    try {
      logger.info(`Groq 분석 시작: ${repository.full_name}`)
      
      const prompt = `
당신은 전 세계의 오픈소스 프로젝트를 분석하여 그 가치를 발굴하는 **시니어 소프트웨어 아키텍트**이자 **기술 에반젤리스트**입니다.
다음 프로젝트를 분석하여 개발자들이 협업하고 싶어질 만큼 전문적이고 매력적인 리포트를 작성하세요.

[프로젝트 정보]
- 명칭: ${repository.name}
- 핵심 언어: ${repository.language || "Unknown"}
- 기존 설명: ${repository.description || "No description provided"}
- README 요약: ${readme.substring(0, 2000)}

[작업 가이드라인]
1. **분석적 태도**: 정보가 부족하더라도 이름과 언어를 바탕으로 이 프로젝트가 해결하려는 문제나 아키텍처적 의도를 전문적으로 추론하세요. "정보가 없다"는 표현은 지양합니다.
2. **요약(Summary)**: 단순 나열이 아닌, 프로젝트의 '존재 이유'와 '핵심 가치'를 관통하는 임팩트 있는 문장을 작성하세요.
3. **전문 용어 활용**: 기술적 숙련도가 느껴지는 업계 표준 용어를 적절히 사용하세요.
4. **매력적인 톤**: 프로젝트의 잠재력을 강조하여 다른 개발자들이 기여하고 싶게 만드세요.

아래 형식의 JSON으로만 응답하세요:
{
  "summary_ko": "프로젝트의 핵심 가치를 담은 전문적인 한국어 요약 (3문장 내외)",
  "summary_en": "Professional, high-impact English summary focusing on value proposition",
  "todos": ["아키텍처 완성도를 높이기 위한 고난도 작업1", "확장성을 위한 작업2", "엔지니어링 완성도를 위한 작업3", "테스트 자동화", "문서화"],
  "categories": ["전문 카테고리 1", "전문 카테고리 2"]
}
`

      const completion = await this.groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
      })

      const text = completion.choices[0]?.message?.content || ""
      const parsed = JSON.parse(text)
      
      logger.success(`Groq 분석 완료: ${repository.full_name}`)

      const summaryKo = parsed.summary_ko || this.getFallbackSummary(repository)
      const summaryEn = parsed.summary_en || ""
      const combinedSummary = summaryEn
        ? `KOREAN SUMMARY:\n${summaryKo}\n\nENGLISH SUMMARY:\n${summaryEn}`
        : summaryKo

      return {
        summary: combinedSummary,
        todos: Array.isArray(parsed.todos) ? parsed.todos.slice(0, 5) : [],
        categories: Array.isArray(parsed.categories) ? parsed.categories.slice(0, 2) : ["prototype"],
      }
    } catch (error) {
      logger.error("Groq 분석 실패:", error)
      return null
    }
  }

  // 단일 통합 AI 요청으로 모든 정보를 한 번에 처리
  async analyzeProjectWithAI(
    repository: Repository,
    readme: string,
  ): Promise<{
    summary: string
    todos: string[]
    categories: string[]
  }> {
    try {
      // Rate limit 체크
      const canProceed = await this.checkRateLimit()
      if (!canProceed) {
        logger.warn("AI API 한도 초과로 기본 분석 사용")
        return this.getFallbackAnalysis(repository, readme)
      }

      // 1. Gemini 시도
      if (this.genAI) {
        try {
          logger.info(`Gemini 통합 AI 분석 시작: ${repository.full_name}`)

          const model = this.genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 800,
            },
            safetySettings: [
              {
                category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
              },
              {
                category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
              },
              {
                category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
              },
              {
                category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
              },
            ],
          })

          const prompt = `
당신은 전 세계의 오픈소스 프로젝트를 분석하여 그 가치를 발굴하는 **시니어 소프트웨어 아키텍트**이자 **기술 에반젤리스트**입니다.
다음 프로젝트를 분석하여 개발자들이 협업하고 싶어질 만큼 전문적이고 매력적인 리포트를 작성하세요.

[프로젝트 정보]
- 명칭: ${repository.name}
- 핵심 언어: ${repository.language || "Unknown"}
- 기존 설명: ${repository.description || "No description provided"}
- README 요약: ${readme.substring(0, 2000)}

[작업 가이드라인]
1. **분석적 태도**: 정보가 부족하더라도 이름과 언어를 바탕으로 이 프로젝트가 해결하려는 문제나 아키텍처적 의도를 전문적으로 추론하세요. "정보가 없다"는 표현은 지양합니다.
2. **요약(Summary)**: 단순 나열이 아닌, 프로젝트의 '존재 이유'와 '핵심 가치'를 관통하는 임팩트 있는 문장을 작성하세요.
3. **전문 용어 활용**: 기술적 숙련도가 느껴지는 업계 표준 용어를 적절히 사용하세요.
4. **매력적인 톤**: 프로젝트의 잠재력을 강조하여 다른 개발자들이 기여하고 싶게 만드세요.

아래 형식의 JSON으로만 응답하세요:
{
  "summary_ko": "프로젝트의 핵심 가치를 담은 전문적인 한국어 요약 (3문장 내외)",
  "summary_en": "Professional, high-impact English summary focusing on value proposition",
  "todos": ["아키텍처 완성도를 높이기 위한 고난도 작업1", "확장성을 위한 작업2", "엔지니어링 완성도를 위한 작업3", "테스트 자동화", "문서화"],
  "categories": ["전문 카테고리 1", "전문 카테고리 2"]
}
`

          this.requestCount++
          this.dailyRequestCount++

          const result = await model.generateContent(prompt)
          const response = await result.response
          const text = response.text()

          const parsed = JSON.parse(text)
          logger.success(`Gemini 분석 완료: ${repository.full_name}`)

          const summaryKo = parsed.summary_ko || this.getFallbackSummary(repository)
          const summaryEn = parsed.summary_en || ""
          const combinedSummary = summaryEn
            ? `KOREAN SUMMARY:\n${summaryKo}\n\nENGLISH SUMMARY:\n${summaryEn}`
            : summaryKo

          return {
            summary: combinedSummary,
            todos: Array.isArray(parsed.todos) ? parsed.todos.slice(0, 5) : [],
            categories: Array.isArray(parsed.categories) ? parsed.categories.slice(0, 2) : ["prototype"],
          }
        } catch (geminiError) {
          logger.error("Gemini 분석 실패, Groq 시도:", geminiError)
        }
      }

      // 2. Groq 폴백 시도
      const groqResult = await this.analyzeProjectWithGroq(repository, readme)
      if (groqResult) return groqResult

      // 3. 둘 다 실패 시 기본값
      return this.getFallbackAnalysis(repository, readme)
    } catch (error: any) {
      logger.error("AI 분석 전체 실패", error)
      return this.getFallbackAnalysis(repository, readme)
    }
  }

  private getFallbackAnalysis(repository: Repository, readme: string): ProjectAnalysis {
    const language = repository.language || "Unknown";
    return {
      summary: "AI 분석을 사용할 수 없습니다. 기본 분석 결과입니다.",
      techStack: ["Unknown"],
      difficulty: "Medium",
      completionStatus: "Unknown",
      estimatedTime: "Unknown",
      category: "Other",
      tags: ["incomplete-project"],
      todos: this.getFallbackTodos(language),
      categories: this.getFallbackCategories(repository, readme)
    }
  }

  private getFallbackSummary(repository: Repository): string {
    const language = repository.language || "Unknown"
    const description = repository.description || ""

    return `${language}로 개발된 프로젝트입니다. ${description || "추가 개발을 통해 완성할 수 있는 미완성 프로젝트입니다."}`
  }

  private getFallbackTodos(language: string): string[] {
    const todoMap: Record<string, string[]> = {
      JavaScript: ["테스트 코드 작성", "ESLint 설정", "번들링 최적화", "문서화 개선", "에러 핸들링 강화"],
      TypeScript: ["타입 정의 완성", "테스트 코드 작성", "빌드 설정", "API 문서화", "코드 리팩토링"],
      Python: ["requirements.txt 정리", "단위 테스트", "코드 포맷팅", "문서화", "패키지 구조 개선"],
      Java: ["Maven 설정", "JUnit 테스트", "JavaDoc", "코드 최적화", "의존성 관리"],
      Go: ["go mod 정리", "테스트 작성", "문서화", "성능 최적화", "에러 처리"],
    }

    return todoMap[language] || ["코드 리팩토링", "테스트 작성", "문서화", "에러 처리", "성능 최적화"]
  }

  private getFallbackCategories(repository: any, readme: string): string[] {
    const description = (repository.description || "").toLowerCase()
    const readmeLower = readme.toLowerCase()

    if (description.includes("web") || readmeLower.includes("react")) return ["web-development"]
    if (description.includes("api") || readmeLower.includes("server")) return ["api"]
    if (description.includes("cli") || readmeLower.includes("command")) return ["cli-tool"]
    if (description.includes("game")) return ["game"]

    return ["prototype"]
  }

  getUsageStats() {
    return {
      minuteRequests: this.requestCount,
      maxMinuteRequests: this.maxRequestsPerMinute,
      dailyRequests: this.dailyRequestCount,
      maxDailyRequests: this.maxDailyRequests,
    }
  }
}



export const aiService = new AIService()

// Promise-based initialization for the AI service
export const aiServicePromise = Promise.resolve(aiService)

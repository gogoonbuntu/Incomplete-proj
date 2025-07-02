import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai"
import { logger } from "./logger-service"

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
  private genAI: GoogleGenerativeAI | null = null
  private requestCount = 0
  private lastResetTime = Date.now()
  private maxRequestsPerMinute = 8 // More conservative setting
  private dailyRequestCount = 0
  private lastDayReset = new Date().getDate()
  private maxDailyRequests = 100 // Conservative daily limit

  constructor() {
    // 다양한 방식으로 환경 변수 로드 시도
    this.apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
    
    if (!this.apiKey) {
      console.warn('GEMINI_API_KEY is not set in environment variables. AI 기능이 제한됩니다.')
      // 개발 환경에서도 API 키가 필요합니다
      if (process.env.NODE_ENV === 'development') {
        console.error('개발 환경에서도 .env.local 파일에 GEMINI_API_KEY를 설정해야 합니다.')
      }
    }
    
    // API 키가 있을 때만 GoogleGenerativeAI 초기화
    if (this.apiKey) {
      this.genAI = new GoogleGenerativeAI(this.apiKey)
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
      if (!this.genAI) {
        logger.warn("AI API 키가 설정되지 않아 텍스트 생성을 건너뜁니다.")
        return null
      }
      
      // 요청 한도 확인
      const canProceed = await this.checkRateLimit()
      if (!canProceed) {
        logger.warn("AI API 한도 초과로 텍스트 생성을 건너뜁니다.")
        return null
      }
      
      // 텍스트 생성 모델 사용
      const model = this.genAI.getGenerativeModel({
        model: "gemini-pro",
      })
      
      // 요청 횟수 증가
      this.requestCount++
      this.dailyRequestCount++
      
      // 텍스트 생성
      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()
      
      return text
    } catch (error) {
      logger.error("텍스트 생성 중 오류:", error)
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

      logger.info(`통합 AI 분석 시작: ${repository.full_name}`)

      if (!this.genAI) {
        logger.warn("AI API 키가 설정되지 않아 기본 분석 사용")
        return this.getFallbackAnalysis(repository, readme)
      }

      const model = this.genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 800, // 토큰 수 제한
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
다음은 ${repository.language || "Unknown"}로 작성된 GitHub 프로젝트입니다:

프로젝트명: ${repository.name}
설명: ${repository.description || "설명 없음"}
README (처음 2000자): ${readme.substring(0, 2000)}

다음 형식으로 JSON 응답해주세요:
{
  "summary": "프로젝트 요약 (200자 이내)",
  "todos": ["완성을 위한 작업1", "작업2", "작업3", "작업4", "작업5"],
  "categories": ["카테고리1", "카테고리2"]
}

카테고리는 다음 중에서 선택: web-development, mobile-app, cli-tool, api, game, data-science, machine-learning, devtools, library, prototype
`

      this.requestCount++
      this.dailyRequestCount++

      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()

      // JSON 파싱 시도
      try {
        const parsed = JSON.parse(text)
        logger.success(`통합 AI 분석 완료: ${repository.full_name}`)
        return {
          summary: parsed.summary || this.getFallbackSummary(repository),
          todos: Array.isArray(parsed.todos) ? parsed.todos.slice(0, 5) : [],
          categories: Array.isArray(parsed.categories) ? parsed.categories.slice(0, 2) : ["prototype"],
        }
      } catch (parseError) {
        logger.warn("AI 응답 파싱 실패, 기본값 사용")
        return this.getFallbackAnalysis(repository, readme)
      }
    } catch (error: any) {
      logger.error("AI 분석 실패", error)
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

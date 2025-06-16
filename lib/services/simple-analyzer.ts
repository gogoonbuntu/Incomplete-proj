import { logger } from "./logger-service"

interface ProjectAnalysis {
  completionScore: number
  description: string
  todos: string[]
  categories: string[]
  reasoning: string[]
}

class SimpleAnalyzer {
  analyzeProject(repository: any, readme: string): ProjectAnalysis {
    logger.info(`간단 분석 시작: ${repository.full_name}`)

    const analysis: ProjectAnalysis = {
      completionScore: 0,
      description: "",
      todos: [],
      categories: [],
      reasoning: [],
    }

    // 1. README 기반 완성도 분석
    const readmeAnalysis = this.analyzeReadme(readme)

    // 2. 저장소 메타데이터 분석
    const repoAnalysis = this.analyzeRepository(repository)

    // 3. 언어별 기본 TODO 생성
    const languageTodos = this.generateLanguageSpecificTodos(repository.language)

    // 4. 카테고리 추론
    const inferredCategories = this.inferCategories(repository, readme)

    // 결과 조합
    analysis.completionScore = Math.min(10, readmeAnalysis.score + repoAnalysis.score)
    analysis.description = this.generateDescription(repository, readmeAnalysis, repoAnalysis)
    analysis.todos = [...readmeAnalysis.todos, ...languageTodos].slice(0, 8)
    analysis.categories = inferredCategories
    analysis.reasoning = [...readmeAnalysis.reasoning, ...repoAnalysis.reasoning]

    logger.success(`간단 분석 완료: ${repository.full_name} (점수: ${analysis.completionScore})`)
    return analysis
  }

  private analyzeReadme(readme: string) {
    const analysis = {
      score: 0,
      todos: [] as string[],
      reasoning: [] as string[],
      hasInstallation: false,
      hasUsage: false,
      hasFeatures: false,
    }

    const readmeLower = readme.toLowerCase()

    // README 품질 점수 계산
    if (readme.length > 500) {
      analysis.score += 2
      analysis.reasoning.push("상세한 README 문서")
    } else if (readme.length > 200) {
      analysis.score += 1
      analysis.reasoning.push("기본적인 README 문서")
    }

    // 설치 가이드 확인
    if (readmeLower.includes("install") || readmeLower.includes("설치")) {
      analysis.hasInstallation = true
      analysis.score += 1
      analysis.reasoning.push("설치 가이드 포함")
    } else {
      analysis.todos.push("설치 가이드 작성")
    }

    // 사용법 확인
    if (readmeLower.includes("usage") || readmeLower.includes("사용법") || readmeLower.includes("example")) {
      analysis.hasUsage = true
      analysis.score += 1
      analysis.reasoning.push("사용법 예제 포함")
    } else {
      analysis.todos.push("사용법 예제 추가")
    }

    // 기능 설명 확인
    if (readmeLower.includes("feature") || readmeLower.includes("기능")) {
      analysis.hasFeatures = true
      analysis.score += 1
      analysis.reasoning.push("기능 설명 포함")
    } else {
      analysis.todos.push("주요 기능 설명 추가")
    }

    // TODO/FIXME 키워드 검색
    const todoMatches = readme.match(/TODO|FIXME|HACK|BUG|INCOMPLETE/gi)
    if (todoMatches && todoMatches.length > 0) {
      analysis.todos.push(`코드 내 ${todoMatches.length}개의 TODO 항목 해결`)
      analysis.reasoning.push(`${todoMatches.length}개의 미완성 항목 발견`)
    }

    return analysis
  }

  private analyzeRepository(repository: any) {
    const analysis = {
      score: 0,
      reasoning: [] as string[],
    }

    // 스타 수 기반 점수
    if (repository.stargazers_count >= 10) {
      analysis.score += 2
      analysis.reasoning.push(`높은 관심도 (${repository.stargazers_count} stars)`)
    } else if (repository.stargazers_count >= 3) {
      analysis.score += 1
      analysis.reasoning.push(`적당한 관심도 (${repository.stargazers_count} stars)`)
    }

    // 최근 활동 확인
    const lastUpdate = new Date(repository.updated_at)
    const monthsAgo = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24 * 30)

    if (monthsAgo <= 3) {
      analysis.score += 2
      analysis.reasoning.push("최근 3개월 내 활동")
    } else if (monthsAgo <= 6) {
      analysis.score += 1
      analysis.reasoning.push("최근 6개월 내 활동")
    }

    // 라이선스 확인
    if (repository.license) {
      analysis.score += 1
      analysis.reasoning.push(`라이선스 명시 (${repository.license.name})`)
    }

    // 이슈/PR 활동
    if (repository.open_issues_count > 0) {
      analysis.score += 1
      analysis.reasoning.push("활발한 이슈 활동")
    }

    return analysis
  }

  private generateLanguageSpecificTodos(language: string): string[] {
    const todoMap: Record<string, string[]> = {
      JavaScript: [
        "테스트 코드 작성 (Jest/Mocha)",
        "ESLint 설정 및 코드 품질 개선",
        "번들링 최적화 (Webpack/Vite)",
        "타입스크립트 마이그레이션 고려",
      ],
      TypeScript: ["타입 정의 완성", "테스트 코드 작성", "빌드 설정 최적화", "API 문서 자동 생성"],
      Python: ["requirements.txt 정리", "단위 테스트 작성 (pytest)", "코드 포맷팅 (black, flake8)", "패키지 배포 준비"],
      Java: ["Maven/Gradle 설정 완성", "JUnit 테스트 작성", "JavaDoc 문서화", "CI/CD 파이프라인 구축"],
      Go: ["go mod 의존성 정리", "테스트 커버리지 향상", "벤치마크 테스트 추가", "Docker 컨테이너화"],
      Rust: ["Cargo.toml 최적화", "단위 테스트 완성", "문서 테스트 추가", "성능 최적화"],
    }

    return todoMap[language] || ["코드 리팩토링", "테스트 코드 작성", "문서화 개선", "에러 핸들링 강화"]
  }

  private inferCategories(repository: any, readme: string): string[] {
    const categories: string[] = []
    const description = (repository.description || "").toLowerCase()
    const readmeLower = readme.toLowerCase()
    const topics = repository.topics || []
    const language = repository.language || ""

    // 언어 기반 카테고리
    if (["JavaScript", "TypeScript"].includes(language)) {
      if (readmeLower.includes("react") || topics.includes("react")) {
        categories.push("web-development")
      } else if (readmeLower.includes("node") || topics.includes("nodejs")) {
        categories.push("backend")
      }
    }

    // 키워드 기반 카테고리 매핑
    const categoryKeywords = {
      "web-development": ["web", "website", "frontend", "react", "vue", "angular"],
      "mobile-app": ["mobile", "android", "ios", "flutter", "react-native"],
      "cli-tool": ["cli", "command", "terminal", "tool"],
      api: ["api", "rest", "graphql", "server"],
      game: ["game", "gaming", "unity", "godot"],
      "data-science": ["data", "analysis", "pandas", "numpy"],
      "machine-learning": ["ml", "ai", "tensorflow", "pytorch"],
      devtools: ["dev", "development", "build", "deploy"],
      library: ["library", "package", "module", "framework"],
    }

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (
        keywords.some(
          (keyword) => description.includes(keyword) || readmeLower.includes(keyword) || topics.includes(keyword),
        )
      ) {
        categories.push(category)
      }
    }

    // 기본 카테고리
    if (categories.length === 0) {
      categories.push("prototype")
    }

    return categories.slice(0, 3) // 최대 3개
  }

  private generateDescription(repository: any, readmeAnalysis: any, repoAnalysis: any): string {
    const language = repository.language || "Unknown"
    const description = repository.description || ""

    let generatedDesc = `${language}로 개발된 프로젝트입니다. `

    if (description) {
      generatedDesc += `${description} `
    }

    // 완성도 상태 추가
    const totalScore = readmeAnalysis.score + repoAnalysis.score
    if (totalScore >= 8) {
      generatedDesc += "비교적 완성도가 높은 프로젝트로, 추가 기능 구현이나 개선 작업에 적합합니다."
    } else if (totalScore >= 5) {
      generatedDesc += "기본 구조가 갖춰진 프로젝트로, 추가 개발을 통해 완성할 수 있습니다."
    } else {
      generatedDesc += "초기 단계의 프로젝트로, 많은 개발 작업이 필요합니다."
    }

    return generatedDesc
  }
}

export const simpleAnalyzer = new SimpleAnalyzer()

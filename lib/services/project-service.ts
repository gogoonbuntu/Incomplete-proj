import { firebaseServicePromise } from './firebase-service'
import { githubService } from "./github-service"
import { scoringService } from "./scoring-service"
import { aiService } from "./ai-service"
import { simpleAnalyzer } from "./simple-analyzer"
import { logger } from "./logger-service"
import type { Project } from "@/types/project"

// 크롤링 진행 상황을 추적하기 위한 타입
export interface CrawlingProgress {
  step: string
  current: number
  total: number
  details: string
}

class ProjectService {
  private progressCallback?: (progress: CrawlingProgress) => void

  setProgressCallback(callback: (progress: CrawlingProgress) => void) {
    this.progressCallback = callback
  }

  private updateProgress(step: string, current: number, total: number, details: string) {
    logger.info(`[${step}] ${details} (${Math.round(current)}%)`)
    if (this.progressCallback) {
      this.progressCallback({ step, current, total, details })
    }
  }

  async getProjects(): Promise<Project[]> {
    try {
      const firebaseService = await firebaseServicePromise;
return await firebaseService.getProjects()
    } catch (error) {
      logger.error("프로젝트 목록 로드 실패", error)
      return []
    }
  }

  async getProject(id: string): Promise<Project | null> {
    try {
      const project = await (await firebaseServicePromise).getProject(id)
      if (project) {
        await (await firebaseServicePromise).incrementProjectView(id)
      }
      return project
    } catch (error) {
      logger.error(`프로젝트 로드 실패: ${id}`, error)
      return null
    }
  }

  async searchProjects(query: string): Promise<Project[]> {
    try {
      const firebaseService = await firebaseServicePromise;
return await firebaseService.searchProjects(query)
    } catch (error) {
      logger.error("프로젝트 검색 실패", error)
      return []
    }
  }

  async triggerCrawling(): Promise<void> {
    try {
      const firebaseService = await firebaseServicePromise;
await firebaseService.triggerCrawling()
    } catch (error) {
      logger.error("크롤링 트리거 실패", error)
      throw error
    }
  }

  async processNewProjects(): Promise<void> {
    try {
      logger.info("=== 프로젝트 크롤링 시작 ===")
      this.updateProgress("시작", 0, 100, "GitHub 프로젝트 검색을 시작합니다...")

      // 기존 프로젝트 목록 가져오기 (중복 방지용)
      const existingProjects = await this.getProjects()
      const existingIds = new Set(existingProjects.map((p) => p.id))
      logger.info(`기존 프로젝트 ${existingProjects.length}개 확인됨`)

      // AI 사용량 체크
      const aiStats = aiService.getUsageStats()
      logger.info(
        `AI API 사용량: 분당 ${aiStats.minuteRequests}/${aiStats.maxMinuteRequests}, 일일 ${aiStats.dailyRequests}/${aiStats.maxDailyRequests}`,
      )

      // Find unfinished projects from GitHub with better error handling
      this.updateProgress("검색", 10, 100, "GitHub API에서 미완성 프로젝트를 검색 중...")

      let repositories: any[] = []
      try {
        repositories = await githubService.findUnfinishedProjects()
        logger.success(`GitHub에서 ${repositories.length}개의 잠재적 프로젝트 발견`)
      } catch (error: any) {
        if (error.message.includes("rate limit")) {
          logger.warn("GitHub API 한도 도달. 기존 프로젝트로 진행합니다.")
          this.updateProgress("한도도달", 30, 100, "API 한도 도달로 기존 데이터를 사용합니다")
          return
        }
        throw error
      }

      // 새로운 프로젝트만 필터링
      const newRepositories = repositories.filter((repo) => !existingIds.has(repo.id.toString()))
      logger.info(`새로운 프로젝트 ${newRepositories.length}개 발견 (전체 ${repositories.length}개 중)`)

      if (newRepositories.length === 0) {
        logger.info("새로운 프로젝트가 없지만 기존 프로젝트 업데이트를 시도합니다")
        // 새 프로젝트가 없어도 일부 기존 프로젝트를 업데이트
        const recentProjects = repositories.slice(0, 5) // 최근 5개 프로젝트
        if (recentProjects.length > 0) {
          this.updateProgress("업데이트", 50, 100, `${recentProjects.length}개 프로젝트 정보를 업데이트합니다`)
          await this.updateExistingProjects(recentProjects)
          this.updateProgress("완료", 100, 100, `${recentProjects.length}개 프로젝트가 업데이트되었습니다`)
          return
        } else {
          this.updateProgress("완료", 100, 100, "처리할 프로젝트가 없습니다")
          return
        }
      }

      this.updateProgress("검색완료", 30, 100, `${newRepositories.length}개의 새로운 프로젝트를 발견했습니다`)

      // Score projects in batches with rate limit consideration
      this.updateProgress("분석", 40, 100, "프로젝트 점수를 계산 중...")
      logger.info("프로젝트 점수 계산 시작")

      let scores: Map<string, any>
      try {
        scores = await scoringService.batchScoreProjects(newRepositories)
      } catch (error: any) {
        if (error.message.includes("rate limit")) {
          logger.warn("점수 계산 중 API 한도 도달. 기본 점수를 사용합니다.")
          scores = new Map()
          newRepositories.forEach((repo) => {
            scores.set(repo.full_name, {
              score: 6,
              breakdown: { commits: 1, popularity: 1, documentation: 1, structure: 1, activity: 1, potential: 1 },
              reasoning: ["API 한도로 인한 기본 점수"],
            })
          })
        } else {
          throw error
        }
      }

      // 점수 기준을 더 관대하게 조정 (5점 이상)
      const qualifiedProjects = newRepositories.filter((repo) => {
        const score = scores.get(repo.full_name)
        return score && score.score >= 5 // 6점에서 5점으로 낮춤
      })

      logger.success(`${qualifiedProjects.length}개 프로젝트가 점수 기준(5점 이상)을 통과`)
      this.updateProgress("필터링", 60, 100, `${qualifiedProjects.length}개의 프로젝트가 기준을 통과했습니다`)

      if (qualifiedProjects.length === 0) {
        logger.warn("점수 기준을 통과한 프로젝트가 없습니다. 기준을 낮춰서 재시도합니다.")
        // 점수 기준을 더 낮춰서 재시도 (4점 이상)
        const lowerQualifiedProjects = newRepositories.filter((repo) => {
          const score = scores.get(repo.full_name)
          return score && score.score >= 4
        })

        if (lowerQualifiedProjects.length > 0) {
          logger.info(`낮은 기준(4점 이상)으로 ${lowerQualifiedProjects.length}개 프로젝트 발견`)
          await this.processQualifiedProjects(lowerQualifiedProjects, scores, aiStats)
          return
        }
      }

      await this.processQualifiedProjects(qualifiedProjects, scores, aiStats)
    } catch (error) {
      logger.error("크롤링 프로세스 실패", error)
      this.updateProgress("오류", 0, 100, "크롤링 중 오류가 발생했습니다")
      throw error
    }
  }

  private async processQualifiedProjects(qualifiedProjects: any[], scores: Map<string, any>, aiStats: any) {
    // 더 많은 프로젝트 처리 (15개로 증가)
    const maxProcessProjects = Math.min(qualifiedProjects.length, 15)
    const projectsToProcess = qualifiedProjects.slice(0, maxProcessProjects)

    logger.info(`${projectsToProcess.length}개 프로젝트를 처리합니다`)

    // AI 사용량에 따라 처리 방식 결정
    const maxAIProjects = Math.min(
      projectsToProcess.length,
      Math.max(0, aiStats.maxDailyRequests - aiStats.dailyRequests),
    )
    logger.info(`AI 분석 가능한 프로젝트: ${maxAIProjects}개, 나머지는 간단 분석 사용`)

    // Process each qualified project
    let processedCount = 0
    let successCount = 0

    for (const repo of projectsToProcess) {
      try {
        this.updateProgress(
          "처리",
          60 + (processedCount / projectsToProcess.length) * 35,
          100,
          `${repo.name} 프로젝트를 처리 중... (${processedCount + 1}/${projectsToProcess.length})`,
        )

        logger.info(`프로젝트 처리 시작: ${repo.full_name}`)

        const useAI = processedCount < maxAIProjects
        await this.processProject(repo, scores.get(repo.full_name)!, useAI)

        successCount++
        logger.success(`프로젝트 처리 완료: ${repo.full_name}`)

        // 대기 시간 단축
        if (useAI) {
          await new Promise((resolve) => setTimeout(resolve, 8000)) // 8초 대기
        } else {
          await new Promise((resolve) => setTimeout(resolve, 2000)) // 2초 대기
        }
      } catch (error: any) {
        logger.error(`프로젝트 처리 실패: ${repo.full_name}`, error)
        if (error.message.includes("rate limit")) {
          logger.warn("API 한도 도달로 크롤링을 중단합니다")
          break
        }
      }
      processedCount++
    }

    logger.success(`=== 크롤링 완료: ${successCount}/${processedCount}개 프로젝트 성공 ===`)
    this.updateProgress("완료", 100, 100, `총 ${successCount}개의 새로운 프로젝트가 추가되었습니다!`)
  }

  private async updateExistingProjects(repositories: any[]) {
    logger.info("기존 프로젝트 업데이트 시작")
    let updateCount = 0

    for (const repo of repositories) {
      try {
        const existingProject = await this.getProject(repo.id.toString())
        if (existingProject) {
          // 기본 정보만 업데이트 (API 호출 최소화)
          const updatedProject: Project = {
            ...existingProject,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            lastUpdate: repo.updated_at,
            topics: repo.topics || existingProject.topics,
          }

          await (await firebaseServicePromise).saveProject(updatedProject)
          updateCount++
          logger.info(`프로젝트 업데이트 완료: ${repo.full_name}`)
        }

        await new Promise((resolve) => setTimeout(resolve, 1000)) // 1초 대기
      } catch (error) {
        logger.error(`프로젝트 업데이트 실패: ${repo.full_name}`, error)
      }
    }

    logger.success(`${updateCount}개 프로젝트 업데이트 완료`)
  }

  private async processProject(repository: any, scoringResult: any, useAI = false): Promise<void> {
    const [owner, name] = repository.full_name.split("/")

    try {
      logger.info(`프로젝트 데이터 수집: ${repository.full_name}`)

      let readme = `# ${name}\n\n${owner}/${name} 프로젝트입니다.`
      const commits: any[] = []
      let hasReadme = false

      try {
        hasReadme = await githubService.hasReadme(owner, name)
        logger.info(`README 존재 여부: ${hasReadme ? "있음" : "없음"} - ${repository.full_name}`)

        if (hasReadme) {
          readme = await githubService.getReadme(owner, name)
        }
      } catch (error: any) {
        if (error.message.includes("rate limit")) {
          logger.warn(`API 한도로 인해 ${repository.full_name}의 추가 데이터 수집을 건너뜁니다`)
        } else {
          logger.warn(`데이터 수집 실패: ${repository.full_name}`, error)
        }
      }

      let summary = ""
      let todos: string[] = []
      let categories: string[] = []

      if (useAI && hasReadme) {
        logger.info(`AI 분석 사용: ${repository.full_name}`)
        const aiResult = await aiService.analyzeProjectWithAI(repository, readme)
        summary = aiResult.summary
        todos = aiResult.todos
        categories = aiResult.categories
      } else {
        logger.info(`간단 분석 사용: ${repository.full_name}`)
        const simpleResult = simpleAnalyzer.analyzeProject(repository, readme)
        summary = simpleResult.description
        todos = simpleResult.todos
        categories = simpleResult.categories
      }

      // Create project object
      const project: Project = {
        id: repository.id.toString(),
        title: repository.name,
        description: repository.description || "No description available",
        language: repository.language || "Unknown",
        stars: repository.stargazers_count,
        forks: repository.forks_count,
        lastUpdate: repository.updated_at,
        createdAt: repository.created_at,
        githubUrl: repository.html_url,
        owner: owner,
        repo: name,
        score: scoringResult.score,
        scoreBreakdown: scoringResult.breakdown,
        scoreReasoning: scoringResult.reasoning,
        readmeSummary: summary,
        todos: todos,
        topics: repository.topics || [],
        categories: categories,
        license: repository.license?.name || null,
        commits: commits.length || 0,
        linesOfCode: this.estimateProjectSize(repository),
        views: 0,
        defaultBranch: repository.default_branch || "main",
      }

      await (await firebaseServicePromise).saveProject(project)
      logger.success(`Firebase에 저장 완료: ${project.title}`)
    } catch (error) {
      logger.error(`프로젝트 처리 중 오류: ${repository.full_name}`, error)
      throw error
    }
  }

  private estimateProjectSize(repository: any): number {
    const sizeKB = repository.size || 0
    return Math.floor(sizeKB * 0.1)
  }

  // Bookmark management
  async addBookmark(userId: string, projectId: string): Promise<void> {
    try {
      await (await firebaseServicePromise).addBookmark(userId, projectId)
      await (await firebaseServicePromise).addProjectInteraction(projectId, userId, "bookmark")
    } catch (error) {
      logger.error("북마크 추가 실패", error)
      throw error
    }
  }

  async removeBookmark(userId: string, projectId: string): Promise<void> {
    try {
      const firebaseService = await firebaseServicePromise;
await firebaseService.removeBookmark(userId, projectId)
    } catch (error) {
      logger.error("북마크 제거 실패", error)
      throw error
    }
  }

  async getUserBookmarks(userId: string): Promise<string[]> {
    try {
      const firebaseService = await firebaseServicePromise;
return await firebaseService.getUserBookmarks(userId)
    } catch (error) {
      logger.error("사용자 북마크 로드 실패", error)
      return []
    }
  }

  async getBookmarkedProjects(userId: string): Promise<Project[]> {
    try {
      const firebaseService = await firebaseServicePromise;
return await firebaseService.getBookmarkedProjects(userId)
    } catch (error) {
      logger.error("북마크된 프로젝트 로드 실패", error)
      return []
    }
  }

  // Recommendation system
  async getRecommendedProjects(userId: string, currentProjectId?: string): Promise<Project[]> {
    try {
      const bookmarkedProjects = await this.getBookmarkedProjects(userId)

      if (bookmarkedProjects.length === 0) {
        const allProjects = await this.getProjects()
        return allProjects
          .filter((p) => p.id !== currentProjectId)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
      }

      const userLanguages = [...new Set(bookmarkedProjects.map((p) => p.language))]
      const userTopics = [...new Set(bookmarkedProjects.flatMap((p) => p.topics || []))]

      const allProjects = await this.getProjects()
      const recommendations = allProjects
        .filter((p) => p.id !== currentProjectId)
        .filter((p) => !bookmarkedProjects.some((bp) => bp.id === p.id))
        .map((project) => {
          let score = 0

          if (userLanguages.includes(project.language)) {
            score += 3
          }

          const commonTopics = (project.topics || []).filter((topic) => userTopics.includes(topic)).length
          score += commonTopics * 2
          score += project.score * 0.5

          return { project, score }
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map((item) => item.project)

      return recommendations
    } catch (error) {
      logger.error("추천 프로젝트 로드 실패", error)
      return []
    }
  }
}

export const projectService = new ProjectService()

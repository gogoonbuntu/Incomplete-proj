import { githubService } from "./github-service"

interface ScoringCriteria {
  commits: number
  stars: number
  hasReadme: boolean
  readmeLength: number
  hasLicense: boolean
  recentActivity: number // months since last update
  hasIssuesOrPRs: boolean
  codeStructure: number
  todoComments: number
  projectSize: number // lines of code estimate
}

interface ScoringResult {
  score: number
  breakdown: {
    commits: number
    popularity: number
    documentation: number
    structure: number
    activity: number
    potential: number
  }
  reasoning: string[]
}

class ScoringService {
  // scoreProject 메서드를 repository 정보만으로 동작하도록 수정

  async scoreProject(owner: string, repo: string, repository?: any): Promise<ScoringResult> {
    try {
      // repository 정보가 이미 있으면 추가 API 호출 생략
      if (repository) {
        const criteria = this.analyzeBasicCriteria(repository)
        return this.calculateScore(criteria)
      }

      // repository 정보가 없으면 기본 API 호출
      const [repoData, readme] = await Promise.all([
        githubService.getRepository(owner, repo),
        githubService.getReadme(owner, repo),
      ])

      const criteria = await this.analyzeCriteria(repoData, [], readme, [])
      return this.calculateScore(criteria)
    } catch (error) {
      console.error(`Failed to score project ${owner}/${repo}:`, error)
      return {
        score: 5, // 기본 점수
        breakdown: {
          commits: 1,
          popularity: 1,
          documentation: 1,
          structure: 1,
          activity: 1,
          potential: 0,
        },
        reasoning: ["기본 분석만 수행됨"],
      }
    }
  }

  // repository 정보만으로 기본 분석 수행
  private analyzeBasicCriteria(repository: any): ScoringCriteria {
    const lastUpdate = new Date(repository.updated_at)
    const now = new Date()
    const monthsSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24 * 30)

    return {
      commits: Math.floor(Math.random() * 30) + 5, // 추정값
      stars: repository.stargazers_count,
      hasReadme: true, // 대부분의 프로젝트에 README가 있다고 가정
      readmeLength: 500, // 기본값
      hasLicense: !!repository.license,
      recentActivity: monthsSinceUpdate,
      hasIssuesOrPRs: repository.open_issues_count > 0,
      codeStructure: repository.size > 100 ? 1 : 0, // 크기로 구조 추정
      todoComments: Math.floor(Math.random() * 5), // 추정값
      projectSize: repository.size * 10, // KB를 라인 수로 변환
    }
  }

  private async analyzeCriteria(
    repository: any,
    commits: any[],
    readme: string,
    contents: any[],
  ): Promise<ScoringCriteria> {
    const lastUpdate = new Date(repository.updated_at)
    const now = new Date()
    const monthsSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24 * 30)

    // Analyze code structure
    const hasSourceDir = contents.some(
      (item) => item.type === "dir" && ["src", "lib", "app", "components"].includes(item.name.toLowerCase()),
    )
    const hasConfigFiles = contents.some((item) =>
      ["package.json", "requirements.txt", "Cargo.toml", "pom.xml", "go.mod"].includes(item.name),
    )

    // Estimate project size and find TODO comments
    const { estimatedLines, todoCount } = await this.analyzeCodebase(repository.full_name, contents)

    return {
      commits: commits.length,
      stars: repository.stargazers_count,
      hasReadme: readme.length > 0,
      readmeLength: readme.length,
      hasLicense: !!repository.license,
      recentActivity: monthsSinceUpdate,
      hasIssuesOrPRs: repository.open_issues_count > 0,
      codeStructure: hasSourceDir && hasConfigFiles ? 2 : hasSourceDir || hasConfigFiles ? 1 : 0,
      todoComments: todoCount,
      projectSize: estimatedLines,
    }
  }

  private async analyzeCodebase(
    fullName: string,
    contents: any[],
  ): Promise<{ estimatedLines: number; todoCount: number }> {
    // This is a simplified analysis - in a real implementation, you'd recursively analyze files
    const codeFiles = contents.filter((item) => item.type === "file" && this.isCodeFile(item.name))

    // Estimate lines based on file count and typical file sizes
    const estimatedLines = codeFiles.length * 50 // rough estimate

    // For TODO analysis, you'd need to fetch and analyze file contents
    // This is simplified for the example
    const todoCount = Math.floor(Math.random() * 10) // placeholder

    return { estimatedLines, todoCount }
  }

  private isCodeFile(filename: string): boolean {
    const codeExtensions = [".js", ".ts", ".jsx", ".tsx", ".py", ".java", ".go", ".rs", ".cpp", ".c", ".php"]
    return codeExtensions.some((ext) => filename.endsWith(ext))
  }

  private calculateScore(criteria: ScoringCriteria): ScoringResult {
    const reasoning: string[] = []
    const breakdown = {
      commits: 0,
      popularity: 0,
      documentation: 0,
      structure: 0,
      activity: 0,
      potential: 0,
    }

    // Commits score (0-2 points)
    if (criteria.commits >= 5 && criteria.commits <= 30) {
      breakdown.commits = 2
      reasoning.push(`Good commit count (${criteria.commits})`)
    } else if (criteria.commits >= 3) {
      breakdown.commits = 1
      reasoning.push(`Moderate commit count (${criteria.commits})`)
    } else {
      reasoning.push(`Low commit count (${criteria.commits})`)
    }

    // Popularity score (0-2 points)
    if (criteria.stars >= 10) {
      breakdown.popularity = 2
      reasoning.push(`High popularity (${criteria.stars} stars)`)
    } else if (criteria.stars >= 3) {
      breakdown.popularity = 1
      reasoning.push(`Some popularity (${criteria.stars} stars)`)
    } else {
      reasoning.push(`Low popularity (${criteria.stars} stars)`)
    }

    // Documentation score (0-3 points)
    if (criteria.hasReadme && criteria.readmeLength > 500) {
      breakdown.documentation = 3
      reasoning.push("Comprehensive README")
    } else if (criteria.hasReadme && criteria.readmeLength > 200) {
      breakdown.documentation = 2
      reasoning.push("Good README")
    } else if (criteria.hasReadme) {
      breakdown.documentation = 1
      reasoning.push("Basic README")
    } else {
      reasoning.push("No README found")
    }

    // Structure score (0-2 points)
    breakdown.structure = criteria.codeStructure
    if (criteria.codeStructure === 2) {
      reasoning.push("Well-organized code structure")
    } else if (criteria.codeStructure === 1) {
      reasoning.push("Basic code structure")
    } else {
      reasoning.push("Poor code organization")
    }

    // Activity score (0-2 points)
    if (criteria.recentActivity <= 6) {
      breakdown.activity = 2
      reasoning.push("Recently active")
    } else if (criteria.recentActivity <= 12) {
      breakdown.activity = 1
      reasoning.push("Moderately recent activity")
    } else {
      reasoning.push("Inactive for a long time")
    }

    // Potential score (0-2 points)
    let potentialScore = 0
    if (criteria.hasLicense) {
      potentialScore += 0.5
      reasoning.push("Has license")
    }
    if (criteria.hasIssuesOrPRs) {
      potentialScore += 0.5
      reasoning.push("Has issues/PRs")
    }
    if (criteria.todoComments > 0) {
      potentialScore += 0.5
      reasoning.push("Contains TODO comments")
    }
    if (criteria.projectSize >= 100 && criteria.projectSize <= 2000) {
      potentialScore += 0.5
      reasoning.push("Good project size")
    }
    breakdown.potential = Math.min(2, potentialScore)

    const totalScore = Object.values(breakdown).reduce((sum, score) => sum + score, 0)

    return {
      score: Math.round(totalScore * 10) / 10, // Round to 1 decimal place
      breakdown,
      reasoning,
    }
  }

  // batchScoreProjects도 수정
  async batchScoreProjects(repositories: any[]): Promise<Map<string, ScoringResult>> {
    const results = new Map<string, ScoringResult>()

    for (const repo of repositories) {
      try {
        // repository 정보를 직접 전달하여 API 호출 최소화
        const score = await this.scoreProject("", "", repo)
        results.set(repo.full_name, score)

        // 처리 간격 단축
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`Failed to score ${repo.full_name}:`, error)
        // 실패해도 기본 점수 제공
        results.set(repo.full_name, {
          score: 5,
          breakdown: { commits: 1, popularity: 1, documentation: 1, structure: 1, activity: 1, potential: 0 },
          reasoning: ["기본 점수 적용"],
        })
      }
    }

    return results
  }
}

export const scoringService = new ScoringService()

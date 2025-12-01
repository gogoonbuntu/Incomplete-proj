interface GitHubRepository {
  id: string
  name: string
  full_name: string
  description: string
  html_url: string
  stargazers_count: number
  forks_count: number
  language: string
  updated_at: string
  created_at: string
  topics: string[]
  license: { name: string } | null
  default_branch: string
  has_readme?: boolean
}

interface GitHubSearchResponse {
  items: GitHubRepository[]
  total_count: number
}

interface GitHubCommit {
  sha: string
  commit: {
    message: string
    author: {
      date: string
    }
  }
}

interface GitHubContent {
  name: string
  path: string
  type: string
  content?: string
  encoding?: string
}

class GitHubService {
  private baseUrl = "https://api.github.com"
  private token: string | undefined
  private requestCount = 0
  private maxRequests = 30
  private lastResetTime = Date.now()
  private requestInterval = 2000

  constructor() {
    // 다양한 방식으로 환경 변수 로드 시도
    this.token = process.env.GITHUB_TOKEN || process.env.NEXT_PUBLIC_GITHUB_TOKEN
    
    if (!this.token) {
      console.warn('GITHUB_TOKEN is not set in environment variables. GitHub API 기능이 제한됩니다.')
      // 개발 환경에서도 토큰이 필요합니다
      if (process.env.NODE_ENV === 'development') {
        console.error('개발 환경에서도 .env.local 파일에 GITHUB_TOKEN을 설정해야 합니다.')
      }
    }
  }

  private async request<T>(endpoint: string): Promise<T> {
    // Check if we've hit the rate limit
    if (this.requestCount >= this.maxRequests) {
      throw new Error("API rate limit reached")
    }

    // Reset counter every hour
    const now = Date.now()
    if (now - this.lastResetTime > 3600000) {
      this.requestCount = 0
      this.lastResetTime = now
    }

    // Add delay between requests
    await new Promise((resolve) => setTimeout(resolve, this.requestInterval))

    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
    }

    if (this.token) {
      headers["Authorization"] = `token ${this.token}`
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, { headers })
      this.requestCount++

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("GitHub API rate limit exceeded")
        }
        if (response.status === 422) {
          throw new Error("GitHub API query syntax error - invalid search parameters")
        }
        if (response.status === 404) {
          throw new Error("Resource not found")
        }
        throw new Error(`GitHub API error: ${response.status}`)
      }

      return response.json()
    } catch (error) {
      console.error(`GitHub API request failed: ${endpoint}`, error)
      throw error
    }
  }

  async searchRepositories(query: string, page = 1, perPage = 100): Promise<GitHubSearchResponse> {
    const searchQuery = encodeURIComponent(query)
    return this.request<GitHubSearchResponse>(
      `/search/repositories?q=${searchQuery}&page=${page}&per_page=${perPage}&sort=updated`,
    )
  }

  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    return this.request<GitHubRepository>(`/repos/${owner}/${repo}`)
  }

  async getCommits(owner: string, repo: string, page = 1): Promise<GitHubCommit[]> {
    try {
      return this.request<GitHubCommit[]>(`/repos/${owner}/${repo}/commits?page=${page}&per_page=50`)
    } catch {
      return []
    }
  }

  async hasReadme(owner: string, repo: string): Promise<boolean> {
    try {
      if (this.requestCount >= this.maxRequests - 2) {
        return false
      }
      await this.request(`/repos/${owner}/${repo}/readme`)
      return true
    } catch (error) {
      return false
    }
  }

  async getReadme(owner: string, repo: string): Promise<string> {
    try {
      const hasReadme = await this.hasReadme(owner, repo)
      if (!hasReadme) {
        return `# ${repo}\n\n${owner}/${repo} 프로젝트입니다. (README 파일이 없습니다)`
      }

      const content = await this.request<GitHubContent>(`/repos/${owner}/${repo}/readme`)
      if (content.content && content.encoding === "base64") {
        return atob(content.content)
      }
      return `# ${repo}\n\n프로젝트 README를 불러올 수 없습니다.`
    } catch (error: any) {
      if (!error.message.includes("404") && !error.message.includes("not found")) {
        console.error(`README 조회 실패: ${owner}/${repo}`, error)
      }
      return `# ${repo}\n\n${owner}/${repo} 프로젝트입니다. (README를 불러올 수 없습니다)`
    }
  }

  async getDirectoryContents(owner: string, repo: string, path = ""): Promise<GitHubContent[]> {
    try {
      return this.request<GitHubContent[]>(`/repos/${owner}/${repo}/contents/${path}`)
    } catch {
      return []
    }
  }

  async getRepositoryWithReadmeCheck(owner: string, repo: string): Promise<GitHubRepository & { hasReadme: boolean }> {
    try {
      const [repository, hasReadme] = await Promise.all([this.getRepository(owner, repo), this.hasReadme(owner, repo)])

      return {
        ...repository,
        hasReadme,
      }
    } catch (error) {
      const repository = await this.getRepository(owner, repo)
      return {
        ...repository,
        hasReadme: false,
      }
    }
  }

  // 더 다양하고 관대한 검색 조건으로 수정
  async findUnfinishedProjects(): Promise<GitHubRepository[]> {
    // 더 다양한 검색 조건 추가 (모든 쿼리는 최소 10개 이상의 스타를 가진 저장소만 검색)
    const queries = [
      // 최근 업데이트된 프로젝트들 (최소 10 스타 이상)
      "stars:10..50 pushed:>2023-06-01 size:50..5000 archived:false language:JavaScript",
      "stars:10..50 pushed:>2023-06-01 size:50..5000 archived:false language:TypeScript",
      "stars:10..100 pushed:>2023-06-01 size:50..5000 archived:false language:Python",
      "stars:10..100 pushed:>2023-06-01 size:50..5000 archived:false language:Java",
      "stars:10..100 pushed:>2023-06-01 size:50..5000 archived:false language:Go",
      "stars:10..100 pushed:>2023-06-01 size:50..5000 archived:false language:Rust",
      // TODO나 FIXME가 포함된 프로젝트들 (최소 10 스타 이상)
      "TODO in:readme stars:10..200 pushed:>2023-01-01 archived:false",
      "FIXME in:readme stars:10..200 pushed:>2023-01-01 archived:false",
      // 특정 키워드가 포함된 미완성 프로젝트들 (최소 10 스타 이상)
      "incomplete in:name,description stars:10..200 pushed:>2023-01-01 archived:false",
      "unfinished in:name,description stars:10..200 pushed:>2023-01-01 archived:false",
      "prototype in:name,description stars:10..200 pushed:>2023-01-01 archived:false",
      "work-in-progress in:name,description stars:10..200 pushed:>2023-01-01 archived:false",
    ]

    const allRepos: GitHubRepository[] = []
    let successfulQueries = 0

    console.log(`총 ${queries.length}개의 검색 쿼리를 실행합니다...`)

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i]
      try {
        // Check rate limit before each query
        if (this.requestCount >= this.maxRequests - 3) {
          console.log(`API 한도 근접으로 ${i + 1}번째 쿼리에서 중단 (${successfulQueries}개 쿼리 성공)`)
          break
        }

        console.log(`[${i + 1}/${queries.length}] 검색 중: ${query.substring(0, 50)}...`)
        const response = await this.searchRepositories(query, 1, 15) // 페이지당 15개로 증가

        console.log(`  → ${response.total_count}개 총 결과, ${response.items.length}개 반환됨`)

        if (response.items.length > 0) {
          allRepos.push(...response.items.slice(0, 12)) // 각 쿼리당 최대 12개
          successfulQueries++
        }

        // 쿼리 간 대기 시간
        await new Promise((resolve) => setTimeout(resolve, 3000))
      } catch (err) {
        const error = err as Error;
        console.error(`쿼리 실패 [${i + 1}/${queries.length}]: ${query}`, error);
        if (error.message && error.message.includes("rate limit")) {
          console.log("Rate limit 도달로 검색 중단");
          break;
        }
        continue;
      }
    }

    console.log(`검색 완료: ${successfulQueries}개 쿼리 성공, 총 ${allRepos.length}개 저장소 발견`)

    // 중복 제거
    const uniqueRepos = allRepos.filter((repo, index, self) => index === self.findIndex((r) => r.id === repo.id))

    console.log(`중복 제거 후: ${uniqueRepos.length}개 고유 저장소`)

    // 최소 스타 10개 이상인 저장소만 남김 (이중 안전장치)
    const starredRepos = uniqueRepos.filter((repo) => repo.stargazers_count >= 10)
    console.log(`스타 10개 이상 필터 후: ${starredRepos.length}개 저장소`)

    // 더 많은 프로젝트 반환 (50개로 증가)
    const finalRepos = starredRepos.slice(0, 50)
    console.log(`최종 반환: ${finalRepos.length}개 저장소`)

    // 각 저장소의 기본 정보 로깅
    finalRepos.forEach((repo, index) => {
      console.log(`  ${index + 1}. ${repo.full_name} (⭐${repo.stargazers_count}, ${repo.language})`)
    })

    return finalRepos
  }
}

export const githubService = new GitHubService()

export interface Project {
  id: string
  title: string
  description: string
  language: string
  stars: number
  forks: number
  lastUpdate: string
  createdAt?: string
  githubUrl: string
  owner: string
  repo: string
  score: number
  scoreBreakdown?: {
    commits: number
    popularity: number
    documentation: number
    structure: number
    activity: number
    potential: number
  }
  scoreReasoning?: string[]
  readmeSummary?: string
  todos?: string[]
  topics?: string[]
  categories?: string[]
  license?: string
  commits?: number
  linesOfCode?: number
  views?: number
  defaultBranch?: string
  // 프로젝트 설명 자동 업데이트 관련 필드
  koreanDescription?: string
  englishDescription?: string
  isDescriptionUpdated?: boolean
  lastDescriptionUpdate?: string
  lastDescriptionUpdateAttempt?: string
  readme?: {
    content: string
    encoding: string
  }
  name?: string
  full_name?: string
}

export interface FilterOptions {
  language: string
  stars: string
  lastUpdate: string
  score: string
}

export type SortOption = "score" | "stars" | "updated" | "created"

export interface User {
  uid: string
  email: string
  displayName: string
  photoURL?: string
  bookmarks: string[]
  contributions: string[]
  createdAt: Date
}

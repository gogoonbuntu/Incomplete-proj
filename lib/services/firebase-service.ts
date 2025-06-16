import { initializeApp } from "firebase/app"
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User } from "firebase/auth"
import { getDatabase, ref, set, get, push, update } from "firebase/database"
import { getFunctions } from "firebase/functions"
import { logger } from "./logger-service"
import type { Project } from "@/types/project"

// Log environment variables for debugging
console.log('Firebase Config - Environment Variables:', {
  hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  hasAuthDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  hasProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  hasDatabaseUrl: !!process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  hasMessagingSenderId: !!process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  hasAppId: !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
})

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Firebase 초기화 전에 설정 검증
function validateFirebaseConfig() {
  const issues = []

  if (!firebaseConfig.databaseURL) {
    issues.push("NEXT_PUBLIC_FIREBASE_DATABASE_URL이 설정되지 않았습니다")
  } else {
    // URL 형식 검증을 더 관대하게 수정
    const urlPattern = /^https:\/\/[\w-]+.*\.firebasedatabase\.app\/?$|^https:\/\/[\w-]+.*\.firebaseio\.com\/?$/
    if (!urlPattern.test(firebaseConfig.databaseURL)) {
      issues.push(`잘못된 Database URL 형식: ${firebaseConfig.databaseURL}`)
    }
  }

  if (!firebaseConfig.apiKey) {
    issues.push("NEXT_PUBLIC_FIREBASE_API_KEY가 설정되지 않았습니다")
  }

  if (!firebaseConfig.projectId) {
    issues.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID가 설정되지 않았습니다")
  }

  return issues
}

const configIssues = validateFirebaseConfig()
if (configIssues.length > 0) {
  console.error("⚠️ Firebase 설정 문제:", configIssues)
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const database = getDatabase(app)
export const functions = getFunctions(app)

class FirebaseService {
  private connectionStatus: "connected" | "disconnected" | "unknown" = "unknown"

  // 데이터베이스 연결 테스트 (개선된 버전)
  async testDatabaseConnection(): Promise<boolean> {
    try {
      // 설정 검증 먼저 수행
      const issues = validateFirebaseConfig()
      if (issues.length > 0) {
        logger.error("Firebase 설정 오류", issues)
        return false
      }

      // projects 경로에 간단한 테스트 (규칙에 맞춤)
      const testRef = ref(database, "projects")

      // 읽기 테스트만 수행 (쓰기 테스트 제거)
      const snapshot = await get(testRef)

      logger.success("Firebase Realtime Database 연결 성공")
      this.connectionStatus = "connected"
      return true
    } catch (error: any) {
      logger.error("Firebase Realtime Database 연결 실패", {
        error: error.message,
        code: error.code,
      })
      this.connectionStatus = "disconnected"
      return false
    }
  }

  // 실시간 연결 상태 모니터링 (간소화)
  monitorConnection(callback: (connected: boolean) => void): () => void {
    // 주기적으로 연결 상태 확인
    const interval = setInterval(async () => {
      const connected = await this.testDatabaseConnection()
      callback(connected)
    }, 30000) // 30초마다 확인

    return () => {
      clearInterval(interval)
    }
  }

  getConnectionStatus(): "connected" | "disconnected" | "unknown" {
    return this.connectionStatus
  }

  // Authentication
  async signInWithGoogle(): Promise<User> {
    const provider = new GoogleAuthProvider()
    const result = await signInWithPopup(auth, provider)

    // Save user profile to Realtime Database
    await this.saveUserProfile(result.user)

    return result.user
  }

  async signOut(): Promise<void> {
    await signOut(auth)
  }

  onAuthStateChanged(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback)
  }

  private async saveUserProfile(user: User): Promise<void> {
    try {
      const userRef = ref(database, `users/${user.uid}`)
      const userSnapshot = await get(userRef)

      if (!userSnapshot.exists()) {
        await set(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: new Date().toISOString(),
          bookmarks: {},
          contributions: {},
        })
        logger.success("사용자 프로필 저장 완료")
      }
    } catch (error) {
      logger.error("사용자 프로필 저장 실패", error)
    }
  }

  // Projects - undefined 값 처리 개선
  async saveProject(project: Project): Promise<void> {
    try {
      const cleanProject = this.cleanProjectData(project)
      const currentUser = auth.currentUser

      if (this.connectionStatus === "disconnected") {
        logger.warn("Firebase 연결 끊김, 로컬 저장소에만 백업")
        await this.saveProjectToLocalStorage(cleanProject)
        return
      }

      try {
        // projects 경로에만 저장 (규칙에 맞춤)
        const projectRef = ref(database, `projects/${cleanProject.id}`)
        await set(projectRef, {
          ...cleanProject,
          updatedAt: new Date().toISOString(),
          addedBy: currentUser?.uid || "system",
        })

        logger.success(`프로젝트 저장 완료: ${cleanProject.title}`)
        await this.saveProjectToLocalStorage(cleanProject)
      } catch (error: any) {
        logger.error("Firebase 저장 실패", error)
        throw error
      }
    } catch (error: any) {
      logger.error(`프로젝트 저장 실패: ${project.title}`, error)
      await this.saveProjectToLocalStorage(project)
    }
  }

  // 로컬 저장소 백업 메서드
  private async saveProjectToLocalStorage(project: Project): Promise<void> {
    try {
      const existingProjects = JSON.parse(localStorage.getItem("backup_projects") || "[]")
      const cleanProject = this.cleanProjectData(project)

      // 중복 제거
      const filteredProjects = existingProjects.filter((p: Project) => p.id !== cleanProject.id)
      filteredProjects.push(cleanProject)

      // 최대 1000개로 제한
      const limitedProjects = filteredProjects.slice(-1000)

      localStorage.setItem("backup_projects", JSON.stringify(limitedProjects))
      logger.info(`로컬 저장소에 백업 완료: ${project.title}`)
    } catch (error) {
      logger.error("로컬 저장소 백업 실패", error)
    }
  }

  private cleanProjectData(project: Project): Project {
    return {
      ...project,
      // undefined 값들을 적절한 기본값으로 변환
      license: project.license || null,
      topics: project.topics || [],
      categories: project.categories || [],
      todos: project.todos || [],
      scoreReasoning: project.scoreReasoning || [],
      readmeSummary: project.readmeSummary || "",
      commits: project.commits || 0,
      linesOfCode: project.linesOfCode || 0,
      views: project.views || 0,
      createdAt: project.createdAt || project.lastUpdate,
      defaultBranch: project.defaultBranch || "main",
      scoreBreakdown: project.scoreBreakdown || {
        commits: 0,
        popularity: 0,
        documentation: 0,
        structure: 0,
        activity: 0,
        potential: 0,
      },
    }
  }

  async getProjects(limitCount = 100): Promise<Project[]> {
    try {
      let projects: Project[] = []

      if (this.connectionStatus !== "disconnected") {
        try {
          // projects 경로에서만 조회 (규칙에 맞춤)
          const projectsRef = ref(database, "projects")
          const projectsSnapshot = await get(projectsRef)

          if (projectsSnapshot.exists()) {
            const projectsData = projectsSnapshot.val()
            projects = Object.keys(projectsData).map((key) => ({
              id: key,
              ...projectsData[key],
            }))
          }

          projects = projects.sort((a, b) => b.score - a.score)
        } catch (error) {
          logger.warn("Firebase 프로젝트 조회 실패, 로컬 백업 사용", error)
        }
      }

      // 로컬 백업 프로젝트도 추가
      try {
        const backupProjects = JSON.parse(localStorage.getItem("backup_projects") || "[]")
        const existingIds = new Set(projects.map((p) => p.id))
        const uniqueBackupProjects = backupProjects.filter((p: Project) => !existingIds.has(p.id))
        projects = [...projects, ...uniqueBackupProjects].sort((a, b) => b.score - a.score).slice(0, limitCount)
      } catch (error) {
        logger.warn("로컬 백업 조회 실패", error)
      }

      return projects as Project[]
    } catch (error) {
      logger.error("프로젝트 목록 조회 실패", error)
      return []
    }
  }

  async getProject(id: string): Promise<Project | null> {
    try {
      if (this.connectionStatus !== "disconnected") {
        // projects 경로에서만 조회 (규칙에 맞춤)
        const projectRef = ref(database, `projects/${id}`)
        const snapshot = await get(projectRef)

        if (snapshot.exists()) {
          return {
            id,
            ...snapshot.val(),
          } as Project
        }
      }

      // 로컬 백업에서도 조회
      try {
        const backupProjects = JSON.parse(localStorage.getItem("backup_projects") || "[]")
        const project = backupProjects.find((p: Project) => p.id === id)
        if (project) {
          return project
        }
      } catch (error) {
        logger.warn("로컬 백업 조회 실패", error)
      }

      return null
    } catch (error) {
      logger.error(`프로젝트 조회 실패: ${id}`, error)
      return null
    }
  }

  async searchProjects(searchTerm: string): Promise<Project[]> {
    try {
      let projects: Project[] = []

      if (this.connectionStatus !== "disconnected") {
        try {
          // projects 경로에서만 조회 (규칙에 맞춤)
          const projectsRef = ref(database, "projects")
          const projectsSnapshot = await get(projectsRef)

          if (projectsSnapshot.exists()) {
            const projectsData = projectsSnapshot.val()
            projects = Object.keys(projectsData).map((key) => ({
              id: key,
              ...projectsData[key],
            }))
          }
        } catch (error) {
          logger.warn("Firebase 검색 실패, 로컬 백업 사용", error)
        }
      }

      // 로컬 백업에서도 검색
      try {
        const backupProjects = JSON.parse(localStorage.getItem("backup_projects") || "[]")
        const existingIds = new Set(projects.map((p) => p.id))
        const uniqueBackupProjects = backupProjects.filter((p: Project) => !existingIds.has(p.id))
        projects = [...projects, ...uniqueBackupProjects]
      } catch (error) {
        logger.warn("로컬 백업 검색 실패", error)
      }

      return projects.filter(
        (project) =>
          project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          project.language.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    } catch (error) {
      logger.error("프로젝트 검색 실패", error)
      return []
    }
  }

  // Bookmarks
  async addBookmark(userId: string, projectId: string): Promise<void> {
    try {
      const bookmarkRef = ref(database, `users/${userId}/bookmarks/${projectId}`)
      await set(bookmarkRef, true)
    } catch (error) {
      logger.error("북마크 추가 실패", error)
      throw error
    }
  }

  async removeBookmark(userId: string, projectId: string): Promise<void> {
    try {
      const bookmarkRef = ref(database, `users/${userId}/bookmarks/${projectId}`)
      await set(bookmarkRef, null)
    } catch (error) {
      logger.error("북마크 제거 실패", error)
      throw error
    }
  }

  async getUserBookmarks(userId: string): Promise<string[]> {
    try {
      const bookmarksRef = ref(database, `users/${userId}/bookmarks`)
      const snapshot = await get(bookmarksRef)

      if (snapshot.exists()) {
        const bookmarksData = snapshot.val()
        return Object.keys(bookmarksData).filter((key) => bookmarksData[key] === true)
      }

      return []
    } catch (error) {
      logger.error("사용자 북마크 조회 실패", error)
      return []
    }
  }

  async getBookmarkedProjects(userId: string): Promise<Project[]> {
    try {
      const bookmarkIds = await this.getUserBookmarks(userId)

      if (bookmarkIds.length === 0) {
        return []
      }

      const projects: Project[] = []

      for (const projectId of bookmarkIds) {
        const project = await this.getProject(projectId)
        if (project) {
          projects.push(project)
        }
      }

      return projects
    } catch (error) {
      logger.error("북마크된 프로젝트 조회 실패", error)
      return []
    }
  }

  // Cloud Functions
  async triggerCrawling(): Promise<void> {
    try {
      logger.info("로컬 크롤링 프로세스 시작")

      // 로컬에서 크롤링 처리
      const { projectService } = await import("./project-service")
      await projectService.processNewProjects()

      logger.success("크롤링 프로세스 완료")
    } catch (error) {
      logger.error("크롤링 프로세스 실패", error)
      throw error
    }
  }

  // Analytics
  async incrementProjectView(projectId: string): Promise<void> {
    try {
      if (this.connectionStatus === "disconnected") {
        return
      }

      // projects 경로에서만 조회 (규칙에 맞춤)
      const projectRef = ref(database, `projects/${projectId}`)
      const snapshot = await get(projectRef)

      if (snapshot.exists()) {
        const projectData = snapshot.val()
        const currentViews = projectData.views || 0
        await update(projectRef, {
          views: currentViews + 1,
        })
      }
    } catch (error) {
      logger.error("프로젝트 조회수 증가 실패", error)
    }
  }

  async addProjectInteraction(projectId: string, userId: string, type: "view" | "bookmark" | "fork"): Promise<void> {
    try {
      if (this.connectionStatus === "disconnected") {
        return
      }

      const interactionsRef = ref(database, "interactions")
      const newInteractionRef = push(interactionsRef)
      await set(newInteractionRef, {
        projectId,
        userId,
        type,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      logger.error("프로젝트 상호작용 기록 실패", error)
    }
  }
}

export const firebaseService = new FirebaseService()

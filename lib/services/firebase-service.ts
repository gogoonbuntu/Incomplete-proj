import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged, 
  type User,
  type Auth,
  type Unsubscribe
} from "firebase/auth"
import { 
  ref, 
  set, 
  get, 
  push, 
  update, 
  onValue,
  type Database, 
  type DatabaseReference, 
  type DataSnapshot,
  type Unsubscribe as DatabaseUnsubscribe,
  type Query
} from "firebase/database"
import { 
  getFunctions, 
  httpsCallable, 
  type Functions, 
  type HttpsCallable
} from "firebase/functions"
import { logger } from "./logger-service"
import type { Project } from "@/types/project"
import { 
  initializeFirebaseClient, 
  getFirebaseAuth, 
  getFirebaseDatabase, 
  getFirebaseFunctions,
  getServerFirebaseConfig
} from "@/lib/utils/firebase-client"

// Firebase service class that handles initialization and provides methods
class FirebaseService {
  private auth: Auth;
  private db: Database;
  private functions: Functions;
  private connectionStatus: "connected" | "disconnected" | "unknown" = "unknown";
  private authStateUnsubscribe: Unsubscribe | null = null;
  private connectionRef: DatabaseReference | null = null;
  private connectionUnsubscribe: (() => void) | null = null;
  private backupInterval: NodeJS.Timeout | null = null;

  constructor() {
    try {
      this.auth = getFirebaseAuth();
      this.db = getFirebaseDatabase();
      this.functions = getFirebaseFunctions();
      
      if (typeof window !== 'undefined') {
        console.log('Firebase services initialized successfully on client');
        this.setupConnectionMonitoring();
      } else {
        console.log('Firebase services initialized successfully on server');
      }
    } catch (error) {
      console.error('Error initializing Firebase services:', error);
      throw error;
    }
  }

  private setupConnectionMonitoring() {
    if (typeof window === 'undefined') return;
    
    // Monitor auth state
    this.authStateUnsubscribe = onAuthStateChanged(this.auth, (user) => {
      if (user) {
        logger.info('User signed in:', user.uid);
      } else {
        logger.info('User signed out');
      }
    });
    
    // Monitor database connection
    this.connectionRef = ref(this.db, '.info/connected');
    this.connectionUnsubscribe = onValue(this.connectionRef, (snapshot: DataSnapshot) => {
      this.connectionStatus = snapshot.val() ? "connected" : "disconnected";
      logger.info('Database connection status:', this.connectionStatus);
      
      // Set up periodic backup when online
      if (this.connectionStatus === 'connected' && !this.backupInterval) {
        this.backupInterval = setInterval(async () => {
          await this.backupProjects();
        }, 5 * 60 * 1000); // Backup every 5 minutes when online
      }
    });
  }

  // Cleanup method to call when the service is no longer needed
  public cleanup() {
    if (this.authStateUnsubscribe) {
      this.authStateUnsubscribe();
    }
    if (this.connectionUnsubscribe) {
      this.connectionUnsubscribe();
    }
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
    }
  }

  getConnectionStatus(): "connected" | "disconnected" | "unknown" {
    return this.connectionStatus;
  }

  // Authentication
  async signInWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(this.auth, provider);
      return result.user;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  }

  async signOut() {
    try {
      await firebaseSignOut(this.auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  onAuthStateChanged(callback: (user: User | null) => void) {
    return onAuthStateChanged(this.auth, callback);
  }

  private async saveUserProfile(user: User): Promise<void> {
    try {
      const userRef = ref(this.db, `users/${user.uid}`)
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

  // Projects
  async getProject(id: string): Promise<Project | null> {
    try {
      if (this.connectionStatus === "disconnected") {
        logger.warn("Firebase 연결 끊김, 로컬 저장소에서 프로젝트 로드 시도");
        const localProjects = await this.getFromLocalStorage();
        if (localProjects) {
          return localProjects.find(p => p.id === id) || null;
        }
        return null;
      }

      const projectRef = ref(this.db, `projects/${id}`);
      const snapshot = await get(projectRef);

      if (snapshot.exists()) {
        return this.cleanProjectData({
          id,
          ...snapshot.val()
        });
      }
      return null;
    } catch (error) {
      logger.error(`프로젝트 조회 실패: ${id}`, error);
      
      // Fallback to local storage on error
      try {
        const localProjects = await this.getFromLocalStorage();
        if (localProjects) {
          return localProjects.find(p => p.id === id) || null;
        }
      } catch (localError) {
        logger.error("로컬 저장소에서 프로젝트 조회 실패", localError);
      }
      
      return null;
    }
  }

  async getProjects(): Promise<Project[]> {
    try {
      if (this.connectionStatus === "disconnected") {
        logger.warn("Firebase 연결 끊김, 로컬 저장소에서 프로젝트 목록 로드 시도");
        const localProjects = await this.getFromLocalStorage();
        return localProjects || [];
      }

      const projectsRef = ref(this.db, 'projects');
      const snapshot = await get(projectsRef);

      if (snapshot.exists()) {
        const projects: Project[] = [];
        snapshot.forEach((childSnapshot) => {
          projects.push(this.cleanProjectData({
            id: childSnapshot.key,
            ...childSnapshot.val()
          }));
        });
        return projects;
      }
      return [];
    } catch (error) {
      logger.error("프로젝트 목록 조회 실패", error);
      
      // Fallback to local storage on error
      try {
        const localProjects = await this.getFromLocalStorage();
        return localProjects || [];
      } catch (localError) {
        logger.error("로컬 저장소에서 프로젝트 목록 조회 실패", localError);
        return [];
      }
    }
  }

  async saveProject(project: Project): Promise<void> {
    try {
      const cleanProject = this.cleanProjectData(project)
      const currentUser = this.auth.currentUser

      if (this.connectionStatus === "disconnected") {
        logger.warn("Firebase 연결 끊김, 로컬 저장소에만 백업")
        await this.saveProjectToLocalStorage(cleanProject)
        return
      }

      try {
        // projects 경로에만 저장 (규칙에 맞춤)
        const projectRef = ref(this.db, `projects/${cleanProject.id}`)
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
    // Check if localStorage is available (client-side only)
    if (typeof window === 'undefined') return;
    
    try {
      // Safely get and parse existing projects
      const existingProjectsStr = localStorage.getItem("backup_projects");
      const existingProjects: Project[] = existingProjectsStr ? JSON.parse(existingProjectsStr) : [];
      
      const cleanProject = this.cleanProjectData(project);

      // Remove duplicates
      const filteredProjects = existingProjects.filter((p: Project) => p.id !== cleanProject.id);
      filteredProjects.push(cleanProject);

      // Limit to 1000 items
      const limitedProjects = filteredProjects.slice(-1000);

      // Save back to localStorage
      localStorage.setItem("backup_projects", JSON.stringify(limitedProjects));
      logger.info(`로컬 저장소에 백업 완료: ${project.title}`);
    } catch (err) {
      const error = err as Error;
      logger.error("로컬 저장소 백업 실패", { error: error.message || 'Unknown error' });
    }
  }

  private cleanProjectData(project: Partial<Project> & { id?: string }): Project {
    // Ensure we don't have duplicate id field
    const { id, ...rest } = project;
    
    // Ensure required fields have defaults
    const cleaned: Project = {
      id: id || '', // Ensure id is always present
      title: project.title || 'Untitled Project',
      description: project.description || '',
      githubUrl: project.githubUrl || '',
      owner: project.owner || '',
      repo: project.repo || '',
      stars: project.stars || 0,
      forks: project.forks || 0,
      language: project.language || 'Other',
      lastUpdate: project.lastUpdate || new Date().toISOString(),
      createdAt: project.createdAt || new Date().toISOString(),
      score: project.score || 0,
      topics: project.topics || [],
      categories: project.categories || [],
      todos: project.todos || [],
      scoreReasoning: project.scoreReasoning || [],
      readmeSummary: project.readmeSummary || '',
      commits: project.commits || 0,
      linesOfCode: project.linesOfCode || 0,
      views: project.views || 0,
      defaultBranch: project.defaultBranch || "main",
      scoreBreakdown: project.scoreBreakdown || {
        commits: 0,
        popularity: 0,
        documentation: 0,
        structure: 0,
        activity: 0,
        potential: 0,
      },
      license: project.license || '',
      // Add any other required fields from the Project type
      ...rest,
    };
    
    return cleaned;
  }

  // ...

  async getBookmarkedProjects(userId: string): Promise<Project[]> {
    try {
      const bookmarkIds = await this.getUserBookmarks(userId);

      if (bookmarkIds.length === 0) {
        return [];
      }

      const projects: Project[] = [];

      for (const projectId of bookmarkIds) {
        const project = await this.getProject(projectId);
        if (project) {
          projects.push(project);
        }
      }

      return projects;
    } catch (error) {
      logger.error("북마크된 프로젝트 조회 실패", error);
      return [];
    }
  }

  async getUserBookmarks(userId: string): Promise<string[]> {
    try {
      const bookmarksRef = ref(this.db, `userBookmarks/${userId}`);
      const snapshot = await get(bookmarksRef);
      
      if (snapshot.exists()) {
        return Object.keys(snapshot.val());
      }
      return [];
    } catch (error) {
      logger.error("북마크 목록 조회 실패", error);
      return [];
    }
  }

  private async backupProjects(): Promise<void> {
    try {
      if (this.connectionStatus !== 'connected') {
        console.log('Skipping backup - not connected to Firebase');
        return;
      }

      // Get all projects from Firebase
      const snapshot = await get(ref(this.db, 'projects'));
      if (snapshot.exists()) {
        const projects = snapshot.val();
        await this.saveToLocalStorage(projects);
        logger.info('Projects backed up to localStorage');
      }
    } catch (error) {
      console.error('Error backing up projects:', error);
      throw error;
    }
  }

  private async saveToLocalStorage(projects: Project[] | Record<string, Project>): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // Convert to array if it's an object
        const projectsArray = Array.isArray(projects) 
          ? projects 
          : Object.entries(projects || {}).map(([id, project]) => ({
              ...project,
              id
            }));
            
        localStorage.setItem('projects', JSON.stringify(projectsArray));
      }
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      throw error;
    }
  }

  private async getFromLocalStorage(): Promise<Project[]> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const projects = localStorage.getItem('projects');
        if (!projects) return [];
        
        const parsed = JSON.parse(projects);
        return Array.isArray(parsed) ? parsed : [];
      }
      return [];
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return [];
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
        return;
      }

      // projects 경로에서만 조회 (규칙에 맞춤)
      const projectRef = ref(this.db, `projects/${projectId}`);
      const snapshot = await get(projectRef);

      if (snapshot.exists()) {
        const projectData = snapshot.val();
        const currentViews = projectData.views || 0;
        await update(projectRef, {
          views: currentViews + 1,
        });
      }
    } catch (error) {
      logger.error("프로젝트 조회수 증가 실패", error);
    }
  }

  async addProjectInteraction(projectId: string, userId: string, type: "view" | "bookmark" | "fork"): Promise<void> {
    try {
      if (this.connectionStatus === "disconnected") {
        return;
      }

      const interactionsRef = ref(this.db, "interactions");
      const newInteractionRef = push(interactionsRef);
      await set(newInteractionRef, {
        projectId,
        userId,
        type,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("프로젝트 상호작용 기록 실패", error);
    }
  }
}

export const firebaseService = new FirebaseService()

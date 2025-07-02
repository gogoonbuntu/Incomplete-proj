import { ref, get, update, query, orderByChild, limitToFirst } from "firebase/database";
import { logger } from "./logger-service";
import { firebaseServicePromise } from "./firebase-service";
import { aiService, aiServicePromise } from "./ai-service";
import type { Project } from "@/types/project";

// Project 타입 확장
interface ProjectWithUpdates extends Project {
  isDescriptionUpdated?: boolean;
  lastDescriptionUpdate?: string;
  koreanDescription?: string;
  englishDescription?: string;
}

/**
 * 프로젝트 설명 자동 업데이트 서비스
 * 기존 DB에 있는 프로젝트 설명을 AI를 사용하여 한국어와 영어로 업데이트
 */
class ProjectDescriptionUpdater {
  private isRunning = false;
  private updateInterval: NodeJS.Timeout | null = null;
  private lastRunTime: string | null = null;
  private processedCount = 0;
  private successCount = 0;
  private failureCount = 0;
  private readonly INTERVAL_MS = 5 * 60 * 1000; // 5분마다 실행
  private readonly MAX_PROJECTS_PER_RUN = 1; // 한 번에 처리할 프로젝트 수 (API 제한 고려)

  /**
   * 서비스 시작
   */
  async start() {
    if (this.isRunning) {
      logger.warn("프로젝트 설명 업데이트 서비스가 이미 실행 중입니다.");
      return;
    }

    logger.info("프로젝트 설명 자동 업데이트 서비스 시작");
    this.isRunning = true;

    // 즉시 한 번 실행
    await this.updateProjectDescriptions();

    // 주기적으로 실행
    this.updateInterval = setInterval(async () => {
      await this.updateProjectDescriptions();
    }, this.INTERVAL_MS);
  }

  /**
   * 서비스 중지
   */
  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.isRunning = false;
    logger.info("프로젝트 설명 자동 업데이트 서비스 중지");
  }

  /**
   * 업데이트가 필요한 프로젝트 찾기 및 업데이트
   */
  private async updateProjectDescriptions() {
    try {
      // 마지막 실행 시간 기록
      this.lastRunTime = new Date().toISOString();
      
      logger.info("프로젝트 설명 업데이트 작업 시작");
      
      const firebaseService = await firebaseServicePromise;
      if (firebaseService.getConnectionStatus() !== "connected") {
        logger.warn("Firebase 연결이 끊어져 있어 프로젝트 설명 업데이트를 건너뜁니다.");
        return;
      }

      // 업데이트가 필요한 프로젝트 찾기
      const projectsToUpdate = await this.findProjectsNeedingUpdate();
      
      if (projectsToUpdate.length === 0) {
        logger.info("업데이트가 필요한 프로젝트가 없습니다.");
        return;
      }

      logger.info(`${projectsToUpdate.length}개의 프로젝트 설명 업데이트 필요`);

      // 최대 처리 개수만큼만 처리
      const projectsToProcess = projectsToUpdate.slice(0, this.MAX_PROJECTS_PER_RUN);
      
      // 통계 초기화
      this.processedCount = 0;
      this.successCount = 0;
      this.failureCount = 0;
      
      // 각 프로젝트 업데이트
      for (const project of projectsToProcess) {
        this.processedCount++;
        const success = await this.updateSingleProject(project);
        if (success) {
          this.successCount++;
        } else {
          this.failureCount++;
        }
      }
      
      logger.info(`업데이트 결과: 총 ${this.processedCount}개 중 ${this.successCount}개 성공, ${this.failureCount}개 실패`);

    } catch (error) {
      logger.error("프로젝트 설명 업데이트 중 오류 발생:", error);
    }
  }

  /**
   * 업데이트가 필요한 프로젝트 찾기
   */
  private async findProjectsNeedingUpdate(): Promise<Project[]> {
    try {
      const firebaseService = await firebaseServicePromise;
      const db = firebaseService["db"]; // 내부 DB 접근
      
      // 'isDescriptionUpdated' 필드가 없거나 false인 프로젝트 찾기
      // 또는 'lastDescriptionUpdate' 필드가 없는 프로젝트
      const projectsRef = ref(db, 'projects');
      const snapshot = await get(projectsRef);
      
      if (!snapshot.exists()) {
        logger.warn("프로젝트 데이터가 없습니다.");
        return [];
      }
      
      const projects: Project[] = [];
      const projectsData = snapshot.val();
      
      // 모든 프로젝트 확인
      for (const projectId in projectsData) {
        const project = projectsData[projectId] as Project;
        project.id = projectId; // ID 설정
        
        // 업데이트가 필요한 프로젝트 필터링
        if (!project.isDescriptionUpdated || !project.lastDescriptionUpdate) {
          projects.push(project);
        }
      }
      
      return projects;
      
    } catch (error) {
      logger.error("업데이트가 필요한 프로젝트 찾기 실패:", error);
      return [];
    }
  }

  /**
   * 단일 프로젝트 설명 업데이트
   * @param project 업데이트할 프로젝트
   * @returns 업데이트 성공 여부
   */
  private async updateSingleProject(project: ProjectWithUpdates): Promise<boolean> {
    try {
      const { id, name, description, readme } = project;
      const projectName = name || project.full_name || id;
      
      logger.info(`프로젝트 '${projectName}' 설명 업데이트 시작`);
      
      // 원본 설명과 README 기반으로 새로운 설명 생성
      const originalDescription = description || "";
      
      // README가 객체인 경우 content 필드 추출, 그렇지 않으면 문자열로 처리
      let readmeContent = "";
      if (readme) {
        if (typeof readme === 'object' && readme.content) {
          readmeContent = readme.content;
        } else if (typeof readme === 'string') {
          readmeContent = readme;
        }
      }
      
      // AI를 사용하여 한국어와 영어 설명 생성
      const aiService = await aiServicePromise;
      
      // 한국어 설명 생성
      const koreanDescription = await this.generateDescription(
        aiService, 
        originalDescription, 
        readmeContent,
        projectName,
        "korean"
      );
      
      // 영어 설명 생성
      const englishDescription = await this.generateDescription(
        aiService, 
        originalDescription, 
        readmeContent,
        projectName,
        "english"
      );
      
      // 새로운 설명이 생성되지 않은 경우 실패
      if (!koreanDescription && !englishDescription) {
        logger.warn(`프로젝트 '${projectName}' 설명 생성 실패`);
        return false;
      }
      
      // 프로젝트 업데이트
      const updatedProject: Partial<ProjectWithUpdates> = {};
      
      // 업데이트 상태 표시
      updatedProject.isDescriptionUpdated = true;
      updatedProject.lastDescriptionUpdate = new Date().toISOString();
      
      // 한국어 설명이 생성된 경우 추가
      if (koreanDescription) {
        updatedProject.koreanDescription = koreanDescription;
      }
      
      // 영어 설명이 생성된 경우 추가
      if (englishDescription) {
        updatedProject.englishDescription = englishDescription;
      }
      
      // 서버 API를 통해 Firebase 업데이트 (권한 문제 해결)
      try {
        const response = await fetch('/api/admin/description-updater/update-project', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uid: 'system', // 시스템 자동 업데이트용 특수 ID
            projectId: id,
            updates: updatedProject
          })
        });
        
        const result = await response.json();
        if (!result.success) {
          throw new Error(result.message || '업데이트 실패');
        }
      } catch (updateError) {
        logger.error(`Firebase 업데이트 중 오류: ${updateError}`);
        throw updateError;
      }
      
      logger.info(`프로젝트 '${projectName}' 설명 업데이트 완료`);
      return true;
    } catch (error) {
      logger.error(`프로젝트 설명 업데이트 중 오류 발생:`, error);
      return false;
    }
  }

  /**
   * AI를 사용하여 설명 생성
   * @param aiService AI 서비스 인스턴스
   * @param originalDescription 원본 설명
   * @param readme README 내용
   * @param projectName 프로젝트 이름
   * @param language 생성할 언어 (korean 또는 english)
   * @returns 생성된 설명 또는 null(실패 시)
   */
  /**
   * AI를 사용하여 설명 생성
   * @param aiService AI 서비스 인스턴스
   * @param originalDescription 원본 설명
   * @param readme README 내용
   * @param projectName 프로젝트 이름
   * @param language 생성할 언어 (korean 또는 english)
   * @returns 생성된 설명 또는 null(실패 시)
   */
  private async generateDescription(
    aiService: any,
    originalDescription: string,
    readme: string,
    projectName: string,
    language: string
  ): Promise<string | null> {
    try {
      // AI 프롬프트 구성
      const prompt = `다음 프로젝트에 대한 설명을 ${language === 'korean' ? '한국어' : '영어'}로 작성해주세요.
      
      프로젝트 이름: ${projectName}
      기존 설명: ${originalDescription || '(없음)'}
      
      README 내용:
      ${readme}
      
      요구사항:
      1. 프로젝트의 목적과 주요 기능을 명확하게 설명해주세요.
      2. 기술 스택이나 사용된 라이브러리가 있다면 포함해주세요.
      3. 200자 이내로 간결하게 작성해주세요.
      4. 다음 형식으로 응답해주세요:
      ---${language === 'korean' ? '한국어' : '영어'}---
      (생성된 설명)`;
      
      // AI 응답 생성
      const response = await aiService.generateText(prompt);
      
      if (!response) {
        logger.warn("AI 응답이 없습니다.");
        return null;
      }
      
      // language에 따라 해당 언어의 설명만 추출
      if (language === 'korean') {
        const koreanMatch = response.match(/---한국어---([\s\S]*?)(?:---영어---|$)/);
        const koreanDescription = koreanMatch ? koreanMatch[1].trim() : '';
        
        if (!koreanDescription) {
          logger.warn("AI가 한국어 설명을 올바른 형식으로 응답하지 않았습니다.");
          return null;
        }
        
        return koreanDescription;
      } else {
        const englishMatch = response.match(/---영어---([\s\S]*?)$/);
        const englishDescription = englishMatch ? englishMatch[1].trim() : '';
        
        if (!englishDescription) {
          logger.warn("AI가 영어 설명을 올바른 형식으로 응답하지 않았습니다.");
          return null;
        }
        
        return englishDescription;
      }
    } catch (error) {
      logger.error("AI를 사용한 설명 생성 중 오류:", error);
      return null;
    }
  }
  private async generateDescription(
    aiService: any,
    originalDescription: string,
    readme: string,
    projectName: string,
    language: string
  ): Promise<string | null> {
    try {
      const prompt = `
프로젝트 이름: ${projectName}
원본 설명: ${originalDescription}
README: ${readme.substring(0, 3000)} ${readme.length > 3000 ? '...(생략)' : ''}

위 프로젝트에 대한 설명을 다음 형식으로 작성해주세요:
1. ${language === "korean" ? "한국어" : "영어"} 설명 (200-300자): 이 프로젝트가 무엇인지, 어떤 기능이 있는지, 어떤 기술을 사용하는지 간결하고 명확하게 설명

응답은 다음 형식으로 해주세요:
${language === "korean" ? "한국어" : "영어"} 설명:
`;

      // AI 서비스를 통해 설명 생성
      const response = await aiService.generateText(prompt);
      
      if (!response) {
        return null;
      }
      
      // 응답에서 한국어와 영어 설명 추출
      const koreanMatch = response.match(/---한국어---([\s\S]*?)(?:---영어---|$)/);
      const englishMatch = response.match(/---영어---([\s\S]*?)$/);
      
      const koreanDescription = koreanMatch ? koreanMatch[1].trim() : '';
      const englishDescription = englishMatch ? englishMatch[1].trim() : '';
      
      if (!koreanDescription || !englishDescription) {
        logger.warn("AI가 올바른 형식으로 응답하지 않았습니다.");
        return null;
      }
      
      return { koreanDescription, englishDescription };
      
    } catch (error) {
      logger.error("AI를 사용한 설명 생성 중 오류:", error);
      return null;
    }
  }

  /**
   * 업데이트된 설명 저장
   */
  private async saveUpdatedDescriptions(
    projectId: string,
    descriptions: { koreanDescription: string; englishDescription: string }
  ): Promise<void> {
    try {
      const firebaseService = await firebaseServicePromise;
      const db = firebaseService["db"];
      const projectRef = ref(db, `projects/${projectId}`);
      
      // 업데이트할 데이터
      const updateData = {
        koreanDescription: descriptions.koreanDescription,
        englishDescription: descriptions.englishDescription,
        isDescriptionUpdated: true,
        lastDescriptionUpdate: new Date().toISOString()
      };
      
      // 데이터베이스 업데이트
      await update(projectRef, updateData);
      
    } catch (error) {
      logger.error(`프로젝트 ${projectId} 설명 저장 중 오류:`, error);
      throw error;
    }
  }

  /**
   * 프로젝트를 업데이트됨으로 표시 (실패 시에도 호출)
   */
  private async markProjectAsUpdated(projectId: string, success: boolean): Promise<void> {
    try {
      const firebaseService = await firebaseServicePromise;
      const db = firebaseService["db"];
      const projectRef = ref(db, `projects/${projectId}`);
      
      // 업데이트 시도 기록
      await update(projectRef, {
        isDescriptionUpdated: success,
        lastDescriptionUpdateAttempt: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error(`프로젝트 ${projectId} 업데이트 상태 표시 중 오류:`, error);
    }
  }
}

// 싱글톤 인스턴스
export const projectDescriptionUpdater = new ProjectDescriptionUpdater();

import { GoogleGenerativeAI } from "@google/generative-ai";
import { db, storage } from "../lib/firebase-admin";
import { readFile } from "fs/promises";
import path from "path";
import { logger } from "./logger";
import { apiKeyManager } from "./api-key-manager";
import { Timestamp, FieldValue, DocumentSnapshot, DocumentData, Firestore } from "firebase-admin/firestore";

// DB가 null이 아님을 확인
if (!db) {
  throw new Error("Firestore database not initialized");
}

// 타입 캐스팅을 위한 변수
const firestore = db as Firestore;

// API 인스턴스를 저장할 변수들
let genAI: GoogleGenerativeAI;
let model: any;

// 현재 API 키로 Gemini API 클라이언트 초기화
function initializeGeminiApi() {
  const apiKey = apiKeyManager.getCurrentGeminiApiKey();
  if (!apiKey) {
    logger.logSummaryUpdate("⚠️ Gemini API를 초기화할 수 없습니다: API 키가 없습니다.");
    return false;
  }
  
  try {
    // 새 API 키로 클라이언트 재초기화
    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    // API 키의 일부를 로그에 기록 (보안상 전체 키는 표시하지 않음)
    const maskedKey = apiKey.substring(0, 4) + "..." + apiKey.substring(apiKey.length - 4);
    logger.logSummaryUpdate(`Gemini API 클라이언트 초기화됨: ${maskedKey} (${apiKey.length}자리)`);
    return true;
  } catch (error) {
    logger.logSummaryUpdate(`⚠️ Gemini API 초기화 오류: ${error}`);
    return false;
  }
}

// 초기 API 클라이언트 설정
initializeGeminiApi();

// Initialize counters to track API usage
let apiCallsToday = 0;
let apiCallsThisMinute = 0;
let lastResetDate = new Date().toDateString();
let lastMinuteReset = new Date().getTime();

// 재시도 관리를 위한 변수
let retryAttemptsCounter = 0;
let lastRetryTime = 0;
const MAX_RETRY_ATTEMPTS = 5; // 최대 재시도 횟수
const RETRY_DELAY_MS = 5000; // 재시도 간격 (밀리초)

interface ProjectData {
  id: string;
  name: string;
  description: string;
  language: string;
  readme?: string;
  lastSummaryUpdate?: string;
  primaryFiles?: string[];
}

interface ProjectUpdateResult {
  updated?: boolean;
  reset?: boolean;
  resetCount?: number;
  projectId?: string;
  projectName?: string;
  description?: string;
}

interface SystemStats {
  lastSuccessfulUpdate?: string;
  lastUpdatedProject?: string;
  lastUpdatedProjectId?: string;
  totalUpdates?: number;
}

export const summaryGenerator = {
  // Reset API call counter if it's a new day and minute
  checkAndResetCounter: () => {
    // 일일 제한 초기화
    const today = new Date().toDateString();
    if (today !== lastResetDate) {
      apiCallsToday = 0;
      lastResetDate = today;
      logger.logSummaryUpdate(`API 호출 일일 카운터 초기화: ${today}`);
    }
    
    // 분당 제한 초기화 (분당 60초 = 60,000ms)
    const now = new Date().getTime();
    if (now - lastMinuteReset >= 60000) {
      apiCallsThisMinute = 0;
      lastMinuteReset = now;
      if (retryAttemptsCounter > 0) {
        logger.logSummaryUpdate(`분당 API 호출 카운터 초기화. 재시도 카운터도 초기화합니다.`);
        // 새로운 분이 시작될 때 재시도 카운터도 초기화
        retryAttemptsCounter = 0;
      }
    }
    
    return { 
      dailyCalls: apiCallsToday, 
      minuteCalls: apiCallsThisMinute 
    };
  },

  // Check if we've hit API limits and determine if we can make a call now
  canMakeApiCall: (maxCallsPerDay = 50, maxCallsPerMinute = 10) => {
    const counters = summaryGenerator.checkAndResetCounter();
    
    // API 키 상태 확인
    const keyStats = apiKeyManager.getStats();
    if (keyStats.available === 0 && keyStats.total > 0) {
      logger.logSummaryUpdate(`모든 API 키(${keyStats.total}개)가 사용 불가 상태입니다.`);
      return false;
    }
    
    // 일일 한도 초과 확인
    if (counters.dailyCalls >= maxCallsPerDay) {
      logger.logSummaryUpdate(`일일 API 호출 한도(${maxCallsPerDay}) 초과: ${counters.dailyCalls}`);
      // API 키가 여러 개 있을 경우 일일 한도가 키마다 별도로 적용될 수 있음
      if (keyStats.available > 1) {
        logger.logSummaryUpdate(`다른 API 키를 사용할 수 있습니다(${keyStats.available}개 사용 가능). 계속 진행합니다.`);
        return true;
      }
      return false;
    }
    
    // 분당 한도 초과 확인
    if (counters.minuteCalls >= maxCallsPerMinute) {
      const timeToNextMinute = 60000 - (new Date().getTime() - lastMinuteReset);
      logger.logSummaryUpdate(`분당 API 호출 한도(${maxCallsPerMinute}) 초과: ${counters.minuteCalls}. ${Math.ceil(timeToNextMinute/1000)}초 후 재시도 가능`);
      // 분당 한도는 모든 키에 적용될 수 있으므로 항상 대기
      return false;
    }
    
    return true;
  },

  // 모든 프로젝트가 업데이트되었는지 확인
  checkAllProjectsUpdated: async (): Promise<boolean> => {
    try {
      // 강제 업데이트를 위해 항상 false 반환 (모든 프로젝트가 업데이트되지 않았다고 처리)
      logger.logSummaryUpdate("강제 업데이트 모드: 모든 프로젝트를 업데이트 대상으로 처리합니다.");
      return false;
      
      /* 일시적으로 비활성화
      // 지난 7일 이내에 업데이트되지 않은 프로젝트 찾기
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const snapshot = await firestore
        .collection("projects")
        .where("lastSummaryUpdate", "<", oneWeekAgo.toISOString())
        .limit(1)
        .get();
      
      // 업데이트가 필요한 프로젝트가 없으면 true 반환
      const allUpdated = snapshot.empty;
      
      if (allUpdated) {
        logger.logSummaryUpdate("모든 프로젝트가 최근 7일 이내에 업데이트되었습니다. 리셋이 필요합니다.");
      }
      
      return allUpdated;
      */
    } catch (error) {
      console.error("[Summary Generator] 프로젝트 업데이트 상태 확인 중 오류:", error);
      return false;
    }
  },
  
  // API 키 상태 확인 및 초기화
  resetApiKeyFailures: (): void => {
    apiKeyManager.resetFailedKeys();
    logger.logSummaryUpdate("API 키 실패 상태가 초기화되었습니다.");
  },
  
  // API 키 통계 정보 가져오기
  getApiKeyStats: (): { total: number, failed: number, available: number } => {
    return apiKeyManager.getStats();
  },
  
  // 모든 프로젝트의 lastSummaryUpdate 필드 리셋
  resetAllProjectsUpdateStatus: async (): Promise<boolean> => {
    try {
      // 확인 로깅
      logger.logSummaryUpdate("모든 프로젝트의 업데이트 상태를 리셋합니다...");
      
      // 프로젝트 수 확인을 위한 카운트 쿼리
      const countSnapshot = await firestore.collection("projects").count().get();
      const totalProjects = countSnapshot.data().count;
      
      // 배치 업데이트 준비 (최대 500개까지만 가능)
      const batchSize = 500;
      const batches = Math.ceil(totalProjects / batchSize);
      
      let resetCount = 0;
      
      for (let i = 0; i < batches; i++) {
        const batch = firestore.batch();
        
        const projectsSnapshot = await firestore
          .collection("projects")
          .offset(i * batchSize)
          .limit(batchSize)
          .get();
        
        projectsSnapshot.docs.forEach((doc: DocumentSnapshot<DocumentData>) => {
          // lastSummaryUpdate 필드를 매우 오래된 날짜로 설정
          const oldDate = new Date(2000, 0, 1).toISOString();
          batch.update(doc.ref, { lastSummaryUpdate: oldDate });
          resetCount++;
        });
        
        await batch.commit();
      }
      
      logger.logSummaryUpdate(`프로젝트 업데이트 상태 리셋 완료: ${resetCount}개 프로젝트 리셋됨`);
      return true;
    } catch (error) {
      console.error("[Summary Generator] 프로젝트 업데이트 상태 리셋 중 오류:", error);
      return false;
    }
  },
  
  // Get the next project that needs a summary update
  getNextProjectForUpdate: async (): Promise<ProjectData | null> => {
    try {
      // API 키 상태 확인
      const keyStats = apiKeyManager.getStats();
      logger.logSummaryUpdate(`API 키 상태: 전체 ${keyStats.total}개, 사용 가능 ${keyStats.available}개, 실패 ${keyStats.failed}개`);
      
      // 새로운 날이 시작되면 API 키 실패 상태 초기화
      const today = new Date().toDateString();
      if (today !== lastResetDate) {
        summaryGenerator.resetApiKeyFailures();
        // 일일 카운터도 초기화됨
      }
      
      // 최소한 하나의 프로젝트가 존재하는지 확인
      logger.logSummaryUpdate("프로젝트 데이터베이스 접근 중...");
      const projectCountSnapshot = await firestore.collection("projects").count().get();
      const totalProjects = projectCountSnapshot.data().count;
      logger.logSummaryUpdate(`총 ${totalProjects}개의 프로젝트가 데이터베이스에 있습니다.`);

      if (totalProjects === 0) {
        logger.logSummaryUpdate("데이터베이스에 프로젝트가 없습니다. 테스트 프로젝트를 생성하거나 데이터를 가져와야 합니다.");
        return null;
      }

      // 먼저 모든 프로젝트가 업데이트되었는지 확인
      // All projects updated - reset status
      if (await summaryGenerator.checkAllProjectsUpdated()) {
        logger.logSummaryUpdate("모든 프로젝트가 최근 7일 내에 업데이트되었습니다. 업데이트 상태를 리셋합니다...");
        const resetResult = await summaryGenerator.resetAllProjectsUpdateStatus();
        logger.logSummaryUpdate("업데이트 상태를 리셋 완료.");

        // 리셋 후 재시도
        if (resetResult) {
          return await summaryGenerator.getNextProjectForUpdate();
        }
        return null;
      }
      
      // Get projects sorted by lastSummaryUpdate (oldest first or null first)
      logger.logSummaryUpdate("가장 오래된 프로젝트 찾는 중...");
      const snapshot = await firestore
        .collection("projects")
        .orderBy("lastSummaryUpdate", "asc")
        .limit(1)
        .get();

      if (snapshot.empty) {
        logger.logSummaryUpdate("업데이트할 프로젝트가 없습니다.");
        return null; // 올바른 타입으로 리턴
      }

      const projectDoc = snapshot.docs[0];
      const project = { id: projectDoc.id, ...projectDoc.data() } as ProjectData;
      
      // 프로젝트 데이터 필드 확인
      logger.logSummaryUpdate(`프로젝트 데이터: id=${project.id}, name=${project.name || '없음'}, 마지막 업데이트=${project.lastSummaryUpdate || '없음'}`); 
      
      // If the project was updated in the last 7 days, skip it
      if (project.lastSummaryUpdate) {
        const lastUpdate = new Date(project.lastSummaryUpdate);
        const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceUpdate < 7) {
          logger.logSummaryUpdate(`프로젝트 ${project.name}(${project.id})는 최근에 업데이트됨 (${daysSinceUpdate.toFixed(1)}일 전) - 건너뜁니다.`);
          return null;
        }
      }
      
      logger.logSummaryUpdate(`업데이트할 프로젝트를 찾았습니다: ${project.name} (ID: ${project.id})`);
      return project;
    } catch (error: any) {
      console.error("[Summary Generator] Error getting next project:", error);
      logger.logSummaryUpdate(`프로젝트 검색 중 오류 발생: ${error?.message || String(error)}`);
      return null;
    }
  },

  // Analyze README content and generate summary
  analyzeSummary: async (projectData: ProjectData): Promise<string | null> => {
    // 일일 API 호출 제한 확인
    if (!summaryGenerator.canMakeApiCall() && apiKeyManager.getStats().available === 0) {
      logger.logSummaryUpdate("API 호출 일일 한도에 도달했고 사용 가능한 API 키가 없습니다.");
      return null;
    }

    try {
      // API 초기화 상태 확인
      if (!model) {
        const initialized = initializeGeminiApi();
        if (!initialized) {
          logger.logSummaryUpdate("Gemini API 클라이언트를 초기화할 수 없습니다.");
          return null;
        }
      }
      
      logger.logSummaryUpdate(`프로젝트 ${projectData.name} (ID: ${projectData.id})에 대한 요약 생성 시도 중...`);
      
      // Create prompt for Gemini API
      const prompt = `
      You are an assistant that analyzes GitHub projects and writes clear descriptions in both Korean and English.
      Use the following information about a project:
      
      Project Name: ${projectData.name}
      Current Description: ${projectData.description || "No description available"}
      Primary Language: ${projectData.language || "Unknown"}
      
      ${projectData.readme ? `README Content (first 4000 chars): ${projectData.readme.substring(0, 4000)}...` : "No README available"}
      
      Your task:
      1. Analyze the project and write a concise Korean summary (2-3 sentences) that explains what this project does and why it is interesting.
      2. Write a concise English summary (2-3 sentences) that explains the same content for international users.
      3. Write a bullet list (in Korean) of 3-5 main features or purposes of this project.
      4. Write a short technical overview paragraph (in Korean) highlighting the frameworks, languages, or libraries used.
      5. Choose 1-3 categories that best describe this project from the following list and output them as simple English identifiers:
         web-development, mobile-app, cli-tool, api, game, data-science, machine-learning, devtools, library, prototype, other
      
      Very Important:
      - All Korean natural language sentences (summary, features, technical explanation) MUST be written in Korean only.
      - The English summary MUST be written in clear, professional English.
      - Category names MUST be chosen only from the given list and written exactly as they appear.
      - Do not mix multiple languages in a single sentence.
      
      Format the response exactly as follows (keep the section titles in English, but the content where indicated):
      
      KOREAN SUMMARY:
      [한 문단 요약 (한국어)]
      
      ENGLISH SUMMARY:
      [One-paragraph summary in English]
      
      FEATURES:
      - [특징 1 (한국어)]
      - [특징 2 (한국어)]
      - [특징 3 (한국어)]
      
      TECHNICAL:
      [기술적 개요 (한국어)]
      
      CATEGORIES:
      [comma-separated English category identifiers from the list above, e.g. "web-development, api"]
      `;

      // API 호출 및 키 로테이션 로직 구현
      let attemptCount = 0;
      let keyRotationCount = 0;
      const MAX_KEY_ROTATIONS = 5; // 최대 키 로테이션 시도 횟수
      
      // 초기 시도 + 재시도 + 키 로테이션
      while (attemptCount <= retryAttemptsCounter || keyRotationCount < MAX_KEY_ROTATIONS) {
        try {
          if (attemptCount > 0) {
            logger.logSummaryUpdate(`🔄 Gemini API 재시도 중... (시도 ${attemptCount}/${retryAttemptsCounter})`);
            // 재시도 간에 잠시 지연
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
          } else {
            logger.logSummaryUpdate("Gemini API 호출 중...");
            // 첫 시도에만 API 카운터 증가
            apiCallsToday++;
            apiCallsThisMinute++;
          }
          
          // API 호출
          const result = await model.generateContent(prompt);
          const response = result.response;
          const text = response.text();
          
          // 성공했으면 재시도 카운터 초기화
          retryAttemptsCounter = 0;
          lastRetryTime = 0;
          
          logger.logSummaryUpdate(`요약 생성 성공: ${projectData.name} (${text.length}자)`);
          return text;
        } catch (apiError: any) {
          const errorMessage = apiError?.message || String(apiError);
          logger.logSummaryUpdate(`⚠️ Gemini API 오류: ${errorMessage}`);
          
          // 크레딧 제한 관련 오류인지 확인
          const isCreditLimitError = errorMessage.includes("quota") || 
                                   errorMessage.includes("rate limit") || 
                                   errorMessage.includes("credit") ||
                                   errorMessage.includes("exceeded") ||
                                   errorMessage.includes("limit");
          
          // 현재 API 키를 가져와서 실패 보고
          const currentKey = apiKeyManager.getCurrentGeminiApiKey();
          
          if (isCreditLimitError && currentKey) {
            // 키 로테이션 시도
            logger.logSummaryUpdate(`크레딧 제한으로 인한 오류. API 키 로테이션 시도 중... (${keyRotationCount + 1}/${MAX_KEY_ROTATIONS})`);            
            const newKey = apiKeyManager.reportFailedGeminiKey(currentKey, errorMessage);
            
            if (newKey) {
              // 새로운 키로 API 클라이언트 초기화
              initializeGeminiApi();
              keyRotationCount++;
              attemptCount = 0; // 새 키로 재시도 카운터 초기화
              continue;
            } else {
              logger.logSummaryUpdate("모든 API 키가 크레딧 한도에 도달했습니다. 나중에 다시 시도하세요.");
              break;
            }
          } else if (attemptCount < retryAttemptsCounter) {
            // 크레딧 제한 오류가 아니거나, 현재 키에서 재시도 가능한 경우
            attemptCount++;
            continue;
          } else {
            logger.logSummaryUpdate(`재시도 한도(${retryAttemptsCounter})에 도달했습니다. 요약 생성 실패.`);
            break;
          }
        }
      }
      
      return null;
    } catch (error: any) {
      console.error("[Summary Generator] Error generating summary:", error);
      logger.logSummaryUpdate(`요약 생성 중 오류 발생: ${error?.message || String(error)}`);
      return null;
    }
  },

  // Update project with new summary in Firebase
  updateProjectSummary: async (projectId: string, summary: string): Promise<boolean> => {
    try {
      await firestore.collection("projects").doc(projectId).update({
        enhancedDescription: summary,
        lastSummaryUpdate: new Date().toISOString(),
      });
      
      logger.logSummaryUpdate(`Updated summary for project ${projectId}`);
      return true;
    } catch (error) {
      console.error("[Summary Generator] Error updating project summary:", error);
      return false;
    }
  },

  // Process a single project
  processSingleProject: async (): Promise<ProjectUpdateResult | null> => {
    try {
      // 다음 업데이트할 프로젝트 가져오기
      const project = await summaryGenerator.getNextProjectForUpdate();
      
      // 프로젝트가 없는 경우
      if (!project) {
        logger.logSummaryUpdate("현재 처리할 프로젝트가 없습니다.");
        return { updated: false };
      }

      // 프로젝트 처리 시작 로그
      logger.logSummaryUpdate(`프로젝트 처리 시작: ${project.name} (ID: ${project.id})`);
      
      // API 호출 제한 확인
      if (!summaryGenerator.canMakeApiCall() && retryAttemptsCounter === 0) {
        logger.logSummaryUpdate(`API 호출 제한에 도달했습니다. 재시도 카운터가 0이므로 작업을 건너뜁니다.`);
        return { updated: false };
      } else if (!summaryGenerator.canMakeApiCall() && retryAttemptsCounter > 0) {
        logger.logSummaryUpdate(`API 호출 제한에 도달했지만 재시도 중입니다. (재시도: ${retryAttemptsCounter}/${MAX_RETRY_ATTEMPTS})`);
      }
      
      // 요약 생성
      const summary = await summaryGenerator.analyzeSummary(project);
      
      // 요약 생성 결과 확인 및 업데이트
      if (summary) {
        const success = await summaryGenerator.updateProjectSummary(project.id, summary);
        
        if (success) {
          logger.logSummaryUpdate(`프로젝트 요약이 성공적으로 업데이트됨: ${project.name}`);
          
          // 프로젝트 업데이트 현황 통계 업데이트
          await firestore.collection("system").doc("summary-updater-stats").set({
            lastSuccessfulUpdate: new Date().toISOString(),
            lastUpdatedProject: project.name,
            lastUpdatedProjectId: project.id,
            totalUpdates: FieldValue.increment(1)
          }, { merge: true });
        } else {
          logger.logSummaryUpdate(`프로젝트 요약 업데이트 실패: ${project.name}`);
        }
        return { updated: success, projectId: project.id, projectName: project.name };
      } else {
        logger.logSummaryUpdate(`프로젝트 요약 생성 실패: ${project.name}`);
        return { updated: false, projectId: project.id, projectName: project.name };
      }
    } catch (error) {
      console.error("[Summary Generator] 프로젝트 처리 중 오류:", error);
      logger.logSummaryUpdate(`프로젝트 처리 중 오류 발생: ${error}`);
      return { updated: false };
    }
  },
  
  // 시스템 통계 정보 가져오기
  getSystemStats: async (): Promise<SystemStats | null> => {
    try {
      const statsDoc = await firestore.collection("system").doc("summary-updater-stats").get();
      if (statsDoc.exists) {
        return statsDoc.data() as SystemStats;
      }
      return null;
    } catch (error) {
      logger.logSummaryUpdate(`❌ 시스템 통계 정보 가져오기 오류: ${error}`);
      return null;
    }
  }
};


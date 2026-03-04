import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import { rtdb, storage } from "../lib/firebase-admin";
import { readFile } from "fs/promises";
import path from "path";
import { logger } from "./logger";
import { apiKeyManager } from "./api-key-manager";
import { githubService } from "./github-service";

// DB가 null이 아님을 확인
if (!rtdb) {
  throw new Error("Realtime Database not initialized");
}

// API 인스턴스를 저장할 변수들
let genAI: GoogleGenerativeAI;
let model: any;
let groq: Groq | null = null;

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
    model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // API 키의 일부를 로그에 기록 (보안상 전체 키는 표시하지 않음)
    const maskedKey = apiKey.substring(0, 4) + "..." + apiKey.substring(apiKey.length - 4);
    logger.logSummaryUpdate(`Gemini API 클라이언트 초기화됨: ${maskedKey} (${apiKey.length}자리)`);
    return true;
  } catch (error) {
    logger.logSummaryUpdate(`⚠️ Gemini API 초기화 오류: ${error}`);
    return false;
  }
}

// Groq API 초기화
function initializeGroqApi() {
  const apiKey = apiKeyManager.getGroqApiKey();
  if (!apiKey) {
    logger.logSummaryUpdate("⚠️ Groq API를 초기화할 수 없습니다: API 키가 없습니다.");
    return false;
  }

  try {
    groq = new Groq({ apiKey });
    logger.logSummaryUpdate("Groq API 클라이언트 초기화됨 (폴백용)");
    return true;
  } catch (error) {
    logger.logSummaryUpdate(`⚠️ Groq API 초기화 오류: ${error}`);
    return false;
  }
}

// 초기 API 클라이언트 설정
initializeGeminiApi();
initializeGroqApi();

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
  name?: string;
  title?: string;
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
  canMakeApiCall: (maxCallsPerDay = 500, maxCallsPerMinute = 30) => {
    const counters = summaryGenerator.checkAndResetCounter();
    
    // API 키 상태 확인
    const keyStats = apiKeyManager.getStats();
    if (keyStats.available === 0 && keyStats.total > 0 && !apiKeyManager.getGroqApiKey()) {
      logger.logSummaryUpdate(`모든 API 키(${keyStats.total}개)가 사용 불가 상태이며 Groq 폴백이 없습니다.`);
      return false;
    }
    
    // 일일 한도 초과 확인
    if (counters.dailyCalls >= maxCallsPerDay) {
      logger.logSummaryUpdate(`일일 API 호출 한도(${maxCallsPerDay}) 초과: ${counters.dailyCalls}`);
      // API 키가 여러 개 있을 경우 일일 한도가 키마다 별도로 적용될 수 있음
      if (keyStats.available > 1 || apiKeyManager.getGroqApiKey()) {
        logger.logSummaryUpdate(`다른 API 키나 Groq를 사용할 수 있습니다. 계속 진행합니다.`);
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
      
      /* RTDB용 구현 예시
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const snapshot = await rtdb!
        .ref("projects")
        .orderByChild("lastSummaryUpdate")
        .endAt(oneWeekAgo.toISOString())
        .limitToFirst(1)
        .get();
      
      return snapshot.exists();
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
      
      const snapshot = await rtdb!.ref("projects").get();
      if (!snapshot.exists()) return true;

      const projects = snapshot.val();
      const updates: Record<string, any> = {};
      const oldDate = new Date(2000, 0, 1).toISOString();

      Object.keys(projects).forEach(projectId => {
        updates[`projects/${projectId}/lastSummaryUpdate`] = oldDate;
      });
      
      await rtdb!.ref().update(updates);
      
      logger.logSummaryUpdate(`프로젝트 업데이트 상태 리셋 완료: ${Object.keys(projects).length}개 프로젝트 리셋됨`);
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
      const snapshot = await rtdb!.ref("projects").limitToFirst(1).get();
      
      if (!snapshot.exists()) {
        logger.logSummaryUpdate("데이터베이스에 프로젝트가 없습니다. 테스트 프로젝트를 생성하거나 데이터를 가져와야 합니다.");
        return null;
      }

      // 전체 개수 확인 (필요한 경우)
      // const totalSnapshot = await rtdb!.ref("projects").get();
      // const totalProjects = totalSnapshot.numChildren();
      // logger.logSummaryUpdate(`총 ${totalProjects}개의 프로젝트가 데이터베이스에 있습니다.`);

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
      
      // Get all projects and sort by lastSummaryUpdate locally to avoid indexing issues
      logger.logSummaryUpdate("가장 오래된 프로젝트 찾는 중 (로컬 정렬)...");
      const projectsSnapshot = await rtdb!.ref("projects").get();

      if (!projectsSnapshot.exists()) {
        logger.logSummaryUpdate("업데이트할 프로젝트가 없습니다.");
        return null;
      }

      const projectsData = projectsSnapshot.val();
      const projectList = Object.keys(projectsData).map(id => ({
        id,
        ...projectsData[id]
      })) as ProjectData[];

      // Sort by lastSummaryUpdate (oldest first)
      projectList.sort((a, b) => {
        const timeA = a.lastSummaryUpdate ? new Date(a.lastSummaryUpdate).getTime() : 0;
        const timeB = b.lastSummaryUpdate ? new Date(b.lastSummaryUpdate).getTime() : 0;
        return timeA - timeB;
      });

      const project = projectList[0];
      
      // 프로젝트 데이터 필드 확인
      logger.logSummaryUpdate(`프로젝트 데이터: id=${project.id}, name=${project.name || project.title || '없음'}, 마지막 업데이트=${project.lastSummaryUpdate || '없음'}`); 
      
      // If the project was updated in the last 7 days, skip it
      if (project.lastSummaryUpdate) {
        const lastUpdate = new Date(project.lastSummaryUpdate);
        const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
        const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceUpdate < 1) {
          logger.logSummaryUpdate(`프로젝트 ${project.name || project.title}(${project.id})는 최근에 업데이트됨 (${hoursSinceUpdate.toFixed(1)}시간 전) - 건너뜁니다.`);
          return null;
        }
      }
      
      logger.logSummaryUpdate(`업데이트할 프로젝트를 찾았습니다: ${project.name || project.title} (ID: ${project.id})`);
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
    if (!summaryGenerator.canMakeApiCall() && apiKeyManager.getStats().available === 0 && !apiKeyManager.getGroqApiKey()) {
      logger.logSummaryUpdate("API 호출 일일 한도에 도달했고 사용 가능한 API 키가 없습니다.");
      return null;
    }

    try {
      // API 초기화 상태 확인
      if (!model) {
        const initialized = initializeGeminiApi();
        if (!initialized && !apiKeyManager.getGroqApiKey()) {
          logger.logSummaryUpdate("Gemini API 클라이언트를 초기화할 수 없습니다.");
          return null;
        }
      }
      
      const projectName = projectData.name || projectData.title || "Unknown";
      logger.logSummaryUpdate(`프로젝트 ${projectName} (ID: ${projectData.id}) 정밀 분석 중...`);

      // NEW: Get more technical context (File Tree and Entry Point)
      const owner = 'tmddud333'; // Default owner
      const repo = projectName;
      
      let fileTree: string[] = [];
      let packageJsonContent: string | null = null;
      let mainCode: string | null = null;

      try {
        [fileTree, packageJsonContent, mainCode] = await Promise.all([
          githubService.fetchFileTree(owner, repo),
          githubService.fetchFileContent(owner, repo, 'package.json'),
          githubService.fetchFileContent(owner, repo, 'src/index.ts') || 
          githubService.fetchFileContent(owner, repo, 'index.ts') || 
          githubService.fetchFileContent(owner, repo, 'main.py') ||
          githubService.fetchFileContent(owner, repo, 'app.py')
        ]);
      } catch (e) {
        logger.logSummaryUpdate(`GitHub 추가 데이터 획득 실패 (기본 정보로 진행): ${projectName}`);
      }

      // Optimize context: Parse dependencies from package.json if available
      let dependencies = "Unknown";
      if (packageJsonContent) {
        try {
          const pkg = JSON.parse(packageJsonContent);
          dependencies = Object.keys(pkg.dependencies || {}).join(', ') || "No dependencies found";
        } catch (e) {}
      }

      const technicalContext = {
        files: fileTree.slice(0, 15).join(', '),
        dependencies,
        codeSnippet: mainCode ? mainCode.substring(0, 1200) : "No significant entry file code available"
      };
      
      // Create prompt for Principal Architect (Objective & Strategic)
      const prompt = `
당신은 수만 개의 시스템을 설계하고 검토해 온 **수석 소프트웨어 아키텍트(Principal Architect)**입니다.
제공된 데이터를 바탕으로 이 프로젝트에 대한 **냉철한 공학적 감사(Engineering Audit)**와 **전략적 조언**을 작성하세요. 
과장된 마케팅 용어는 배제하고, 엔지니어가 읽었을 때 신뢰할 수 있는 실무적 통찰만 담으세요.

[엔지니어링 데이터]
- 프로젝트명: ${projectName}
- 핵심 스택: ${projectData.language} / ${technicalContext.dependencies}
- 아키텍처 토폴로지: ${technicalContext.files}
- 핵심 구현부(Partial): 
\`\`\`
${technicalContext.codeSnippet}
\`\`\`
- 문서화 상태: ${projectData.readme ? "README 제공됨" : "문서 없음"}

[분석 가이드라인]
1. **의도 파악(Intent)**: 파일 구조와 사용된 패키지(예: cron, redis, socket.io 등)를 결합하여, 이 프로젝트가 해결하려는 구체적인 '페인 포인트'를 정의하세요.
2. **현상태 진단(Assessment)**: 코드와 구조에서 보이는 설계적 특징(예: 모듈화 수준, 관심사 분리 여부)을 객관적으로 서술하세요. 없는 기능을 있다고 하지 마세요.
3. **실용적 활용 방향(Direction)**: 이 프로젝트가 어떤 서비스의 프로토타입으로 적합한지, 혹은 어떤 시스템의 컴포넌트로 흡수될 수 있을지 비즈니스적/기술적 유즈케이스를 제안하세요.
4. **엔지니어링 제언**: "훌륭합니다" 같은 칭찬 대신, "현 구조에서는 ~부분의 병목이 예상되므로 ~패턴으로의 리팩토링이 우선됨"과 같은 실무적 조언을 하세요.

[응답 형식]

KOREAN SUMMARY:
[프로젝트의 본질적 용도와 현재의 기술적 성숙도를 냉철하게 요약한 한국어 리포트 (한 문단)]

ENGLISH SUMMARY:
[Objective technical evaluation and strategic value proposition in professional English]

FEATURES:
- [코드와 구조에서 확인된 실질적인 기술적/기능적 명세 3-5가지 (한국어)]

TECHNICAL:
[의존성 기반의 기술적 특이사항 분석 및 아키텍처 고도화를 위한 구체적인 기술 로드맵 제언 (한국어)]

CATEGORIES:
[web-development, mobile-app, cli-tool, api, game, data-science, machine-learning, devtools, library, prototype, other 중 1-3개]
      `;

      // API 호출 및 키 로테이션 로직 구현
      let attemptCount = 0;
      let keyRotationCount = 0;
      const MAX_KEY_ROTATIONS = 5; // 최대 키 로테이션 시도 횟수
      
      // 1. Gemini 시도
      while (attemptCount <= retryAttemptsCounter || keyRotationCount < MAX_KEY_ROTATIONS) {
        try {
          if (!model) break;

          if (attemptCount > 0) {
            logger.logSummaryUpdate(`🔄 Gemini API 재시도 중... (시도 ${attemptCount}/${retryAttemptsCounter})`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
          } else {
            logger.logSummaryUpdate("Gemini API 호출 중...");
            apiCallsToday++;
            apiCallsThisMinute++;
          }
          
          const result = await model.generateContent(prompt);
          const response = result.response;
          const text = response.text();
          
          retryAttemptsCounter = 0;
          lastRetryTime = 0;
          
          logger.logSummaryUpdate(`요약 생성 성공 (Gemini): ${projectName}`);
          return text;
        } catch (apiError: any) {
          const errorMessage = apiError?.message || String(apiError);
          logger.logSummaryUpdate(`⚠️ Gemini API 오류: ${errorMessage}`);
          
          const isCreditLimitError = errorMessage.includes("quota") || 
                                   errorMessage.includes("rate limit") || 
                                   errorMessage.includes("credit") ||
                                   errorMessage.includes("exceeded") ||
                                   errorMessage.includes("limit") ||
                                   errorMessage.includes("suspended");
          
          const currentKey = apiKeyManager.getCurrentGeminiApiKey();
          
          if (isCreditLimitError && currentKey) {
            logger.logSummaryUpdate(`키 로테이션 시도 중... (${keyRotationCount + 1}/${MAX_KEY_ROTATIONS})`);            
            const newKey = apiKeyManager.reportFailedGeminiKey(currentKey, errorMessage);
            
            if (newKey) {
              initializeGeminiApi();
              keyRotationCount++;
              attemptCount = 0;
              continue;
            } else {
              logger.logSummaryUpdate("모든 Gemini API 키가 실패했습니다.");
              break;
            }
          } else if (attemptCount < retryAttemptsCounter) {
            attemptCount++;
            continue;
          } else {
            break;
          }
        }
      }

      // 2. Groq 폴백 시도
      if (apiKeyManager.getGroqApiKey()) {
        if (!groq) initializeGroqApi();
        if (groq) {
          try {
            logger.logSummaryUpdate(`Groq API로 폴백 시도 중: ${projectName}`);
            const completion = await groq.chat.completions.create({
              messages: [{ role: "user", content: prompt }],
              model: "llama-3.3-70b-versatile",
            });
            const text = completion.choices[0]?.message?.content || null;
            if (text) {
              logger.logSummaryUpdate(`요약 생성 성공 (Groq): ${projectName}`);
              return text;
            }
          } catch (groqError: any) {
            logger.logSummaryUpdate(`⚠️ Groq API 오류: ${groqError?.message || String(groqError)}`);
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
      await rtdb!.ref(`projects/${projectId}`).update({
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

      const projectName = project.name || project.title || "Unknown";
      // 프로젝트 처리 시작 로그
      logger.logSummaryUpdate(`프로젝트 처리 시작: ${projectName} (ID: ${project.id})`);
      
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
          logger.logSummaryUpdate(`프로젝트 요약이 성공적으로 업데이트됨: ${projectName}`);
          
          // 프로젝트 업데이트 현황 통계 업데이트
          const statsRef = rtdb!.ref("system/summary-updater-stats");
          const statsSnapshot = await statsRef.get();
          const currentTotal = (statsSnapshot.val()?.totalUpdates || 0);
          
          await statsRef.update({
            lastSuccessfulUpdate: new Date().toISOString(),
            lastUpdatedProject: projectName,
            lastUpdatedProjectId: project.id,
            totalUpdates: currentTotal + 1
          });
        } else {
          logger.logSummaryUpdate(`프로젝트 요약 업데이트 실패: ${projectName}`);
        }
        return { updated: success, projectId: project.id, projectName: projectName };
      } else {
        logger.logSummaryUpdate(`프로젝트 요약 생성 실패: ${projectName}`);
        return { updated: false, projectId: project.id, projectName: projectName };
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
      const statsSnapshot = await rtdb!.ref("system/summary-updater-stats").get();
      if (statsSnapshot.exists()) {
        return statsSnapshot.val() as SystemStats;
      }
      return null;
    } catch (error) {
      logger.logSummaryUpdate(`❌ 시스템 통계 정보 가져오기 오류: ${error}`);
      return null;
    }
  }
};


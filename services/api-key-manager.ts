import { logger } from "./logger";

/**
 * API 키 관리 서비스
 * 여러 API 키를 로드하고 키 로테이션을 관리합니다.
 */
export class ApiKeyManager {  
  // 싱글톤 인스턴스
  private static instance: ApiKeyManager;

  /**
   * 싱글톤 인스턴스 반환
   */
  public static getInstance(): ApiKeyManager {
    if (!ApiKeyManager.instance) {
      ApiKeyManager.instance = new ApiKeyManager();
    }
    return ApiKeyManager.instance;
  }
  // 모든 Gemini API 키를 저장하는 배열
  private geminiApiKeys: string[] = [];
  
  // 현재 사용 중인 Gemini API 키 인덱스
  private currentGeminiKeyIndex = 0;
  
  // 현재 세션에서 실패한 키 추적
  private failedGeminiKeys: Set<string> = new Set();

  constructor() {
    this.loadApiKeys();
    logger.logSummaryUpdate(`API 키 관리자 초기화: ${this.geminiApiKeys.length}개의 Gemini API 키 로드됨`);
  }

  /**
   * 환경 변수에서 모든 API 키 로드
   */
  private loadApiKeys(): void {
    try {
      // 기본 Gemini API 키 로드
      const mainGeminiKey = process.env.GEMINI_API_KEY;
      if (mainGeminiKey && mainGeminiKey.trim() !== "") {
        this.geminiApiKeys.push(mainGeminiKey);
      }

      // 추가 Gemini API 키 로드 (GEMINI_API_KEY_1, GEMINI_API_KEY_2, ...)
      for (let i = 1; i <= 5; i++) {
        const keyName = `GEMINI_API_KEY_${i}`;
        const key = process.env[keyName];
        if (key && key.trim() !== "") {
          this.geminiApiKeys.push(key);
        }
      }

      // 키가 없는 경우 경고
      if (this.geminiApiKeys.length === 0) {
        logger.logSummaryUpdate("⚠️ 경고: 사용 가능한 Gemini API 키가 없습니다!");
      } else {
        logger.logSummaryUpdate(`총 ${this.geminiApiKeys.length}개의 Gemini API 키가 로드되었습니다.`);
      }
    } catch (error) {
      logger.logSummaryUpdate(`API 키 로드 중 오류 발생: ${error}`);
    }
  }

  /**
   * 현재 활성화된 Gemini API 키 반환
   */
  public getCurrentGeminiApiKey(): string | null {
    if (this.geminiApiKeys.length === 0) {
      return null;
    }
    return this.geminiApiKeys[this.currentGeminiKeyIndex];
  }

  /**
   * 실패한 API 키를 보고하고 다음 키로 전환
   * @param failedKey 실패한 API 키
   * @param errorMessage 오류 메시지
   * @returns 새 API 키 또는 모든 키가 실패한 경우 null
   */
  public reportFailedGeminiKey(failedKey: string, errorMessage: string): string | null {
    // 실패한 키 추적
    this.failedGeminiKeys.add(failedKey);
    
    // 다음 키로 전환 시도
    const initialIndex = this.currentGeminiKeyIndex;
    let foundNewKey = false;
    
    do {
      // 다음 키 인덱스로 순환
      this.currentGeminiKeyIndex = (this.currentGeminiKeyIndex + 1) % this.geminiApiKeys.length;
      
      // 현재 키가 이미 실패한 키인지 확인
      const currentKey = this.geminiApiKeys[this.currentGeminiKeyIndex];
      if (!this.failedGeminiKeys.has(currentKey)) {
        foundNewKey = true;
        logger.logSummaryUpdate(`🔄 Gemini API 키 로테이션: 키 #${initialIndex+1}에서 키 #${this.currentGeminiKeyIndex+1}로 전환합니다.`);
        break;
      }
    } while (this.currentGeminiKeyIndex !== initialIndex);
    
    if (!foundNewKey) {
      logger.logSummaryUpdate("❌ 모든 Gemini API 키가 실패했습니다. 나중에 다시 시도하세요.");
      return null;
    }
    
    return this.getCurrentGeminiApiKey();
  }
  
  /**
   * 모든 실패 상태 재설정 (새로운 세션/날짜 시작 시 호출)
   */
  public resetFailedKeys(): void {
    this.failedGeminiKeys.clear();
    logger.logSummaryUpdate("🔄 API 키 실패 상태가 초기화되었습니다.");
  }
  
  /**
   * 현재 사용 가능한 키 상태 정보 반환
   */
  public getStats(): { total: number, failed: number, available: number } {
    return {
      total: this.geminiApiKeys.length,
      failed: this.failedGeminiKeys.size,
      available: this.geminiApiKeys.length - this.failedGeminiKeys.size
    };
  }
  
  /**
   * 마스킹된 API 키 목록 반환 (보안을 위해)
   */
  public getMaskedKeys(): string[] {
    return this.geminiApiKeys.map(key => {
      // API 키의 앞 6자와 뒤 4자만 표시하고 나머지는 '*'로 마스킹
      const prefix = key.substring(0, 6);
      const suffix = key.length > 10 ? key.substring(key.length - 4) : '';
      const maskLength = key.length - prefix.length - suffix.length;
      return `${prefix}${'*'.repeat(maskLength)}${suffix}`;
    });
  }
  
  /**
   * 현재 사용 중인 API 키의 인덱스 반환
   */
  public getCurrentKeyIndex(): number {
    return this.currentGeminiKeyIndex;
  }
}

// 싱글톤 인스턴스를 가져오는 함수
export const apiKeyManager = ApiKeyManager.getInstance();

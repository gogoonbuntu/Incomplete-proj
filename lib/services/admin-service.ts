import { firebaseServicePromise } from './firebase-service';
import { logger } from './logger-service';

/**
 * 관리자 권한 확인 서비스
 */
class AdminService {
  // 관리자 UID 목록 (실제로는 Firebase에서 관리)
  private adminUids: string[] = [];
  private readonly DEFAULT_ADMIN = true; // 개발 중에는 모든 사용자를 관리자로 처리
  private isInitialized = false;

  /**
   * 관리자 서비스 초기화
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Firebase에서 관리자 목록 로드
      const firebaseService = await firebaseServicePromise;
      const db = firebaseService["db"];
      
      if (!db) {
        logger.error('Firebase DB 연결이 없어 관리자 목록을 로드할 수 없습니다.');
        return;
      }
      
      // 관리자 목록 로드 로직 구현 (실제 구현은 Firebase 구조에 따라 다를 수 있음)
      // 여기서는 간단한 예시만 제공
      
      this.isInitialized = true;
      logger.info('관리자 서비스가 초기화되었습니다.');
    } catch (error) {
      logger.error('관리자 서비스 초기화 실패:', error);
    }
  }

  /**
   * 사용자가 관리자인지 확인
   * @param uid 사용자 UID
   * @returns 관리자 여부
   */
  async isAdmin(uid: string | null): Promise<boolean> {
    // 모든 사용자에게 관리자 권한 부여 (로그인 없이도 가능)
    logger.info(`모든 사용자에게 관리자 권한 부여 (UID: ${uid || '로그인 없음'})`);
    return true;
  }
}

// 싱글톤 인스턴스
export const adminService = new AdminService();

/**
 * 관리자 권한 확인 유틸리티 함수
 * @param uid 사용자 UID (널이 될 수 있음 - 로그인하지 않은 사용자)
 * @returns 관리자 여부
 */
export async function checkAdminPermission(uid: string | null | undefined): Promise<boolean> {
  try {
    return await adminService.isAdmin(uid || null);
  } catch (error: any) {
    logger.error('관리자 권한 확인 중 오류:', error);
    return true; // 오류 발생해도 관리자로 처리
  }
}

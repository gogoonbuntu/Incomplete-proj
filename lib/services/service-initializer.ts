import { logger } from './logger-service';
import { projectDescriptionUpdater } from './project-description-updater';

/**
 * 서비스 초기화 클래스
 * 애플리케이션 시작 시 필요한 서비스들을 초기화하고 시작
 */
class ServiceInitializer {
  private isInitialized = false;
  private isServerSide = typeof window === 'undefined';

  /**
   * 모든 서비스 초기화 및 시작
   */
  async initializeServices() {
    if (this.isInitialized) {
      logger.warn('서비스가 이미 초기화되었습니다.');
      return;
    }

    try {
      logger.info('서비스 초기화 시작...');

      // 서버 사이드에서만 실행되어야 하는 서비스들
      if (this.isServerSide) {
        await this.initializeServerSideServices();
      }

      // 클라이언트 사이드에서만 실행되어야 하는 서비스들
      if (!this.isServerSide) {
        await this.initializeClientSideServices();
      }

      this.isInitialized = true;
      logger.success('모든 서비스가 성공적으로 초기화되었습니다.');
    } catch (error) {
      logger.error('서비스 초기화 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 서버 사이드 전용 서비스 초기화
   */
  private async initializeServerSideServices() {
    logger.info('서버 사이드 서비스 초기화...');

    // 프로젝트 설명 자동 업데이트 서비스는 서버에서만 실행
    // 개발 환경에서는 자동으로 시작하지 않음 (API 사용량 제한 고려)
    if (process.env.NODE_ENV === 'production' && process.env.ENABLE_AUTO_DESCRIPTION_UPDATE === 'true') {
      logger.info('프로젝트 설명 자동 업데이트 서비스를 시작합니다...');
      try {
        await projectDescriptionUpdater.start();
        logger.success('프로젝트 설명 자동 업데이트 서비스가 시작되었습니다.');
      } catch (error) {
        logger.error('프로젝트 설명 자동 업데이트 서비스 시작 실패:', error);
        // 서비스 실패가 전체 애플리케이션에 영향을 주지 않도록 오류를 전파하지 않음
      }
    } else {
      logger.info('프로젝트 설명 자동 업데이트 서비스가 비활성화되었습니다. (개발 환경 또는 설정에 의해)');
    }
  }

  /**
   * 클라이언트 사이드 전용 서비스 초기화
   */
  private async initializeClientSideServices() {
    logger.info('클라이언트 사이드 서비스 초기화...');
    // 클라이언트 사이드 전용 서비스 초기화 로직 (필요시 추가)
  }

  /**
   * 서비스 정리 및 종료
   */
  async cleanupServices() {
    if (!this.isInitialized) {
      return;
    }

    logger.info('서비스 정리 중...');

    // 서버 사이드에서만 실행되어야 하는 정리 작업
    if (this.isServerSide) {
      // 프로젝트 설명 자동 업데이트 서비스 중지
      if (process.env.NODE_ENV === 'production' && process.env.ENABLE_AUTO_DESCRIPTION_UPDATE === 'true') {
        projectDescriptionUpdater.stop();
        logger.info('프로젝트 설명 자동 업데이트 서비스가 중지되었습니다.');
      }
    }

    this.isInitialized = false;
    logger.success('모든 서비스가 정리되었습니다.');
  }
}

// 싱글톤 인스턴스
export const serviceInitializer = new ServiceInitializer();

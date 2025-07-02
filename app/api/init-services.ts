import { serviceInitializer } from '@/lib/services/service-initializer';

// 서버 사이드에서 서비스 초기화
let initialized = false;

export async function initializeServices() {
  if (initialized) return;
  
  try {
    await serviceInitializer.initializeServices();
    initialized = true;
  } catch (error) {
    console.error('Failed to initialize services:', error);
  }
}

// 서버가 종료될 때 서비스 정리를 위한 이벤트 핸들러 등록
if (typeof process !== 'undefined') {
  process.on('SIGTERM', async () => {
    await serviceInitializer.cleanupServices();
  });
  
  process.on('SIGINT', async () => {
    await serviceInitializer.cleanupServices();
  });
}

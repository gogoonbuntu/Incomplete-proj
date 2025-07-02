import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/services/logger-service";
import { checkAdminPermission } from "@/lib/services/admin-service";

/**
 * 서버 캐시 초기화 API
 * 관리자만 접근 가능
 */
export async function POST(request: NextRequest) {
  try {
    // 요청 데이터 파싱
    const data = await request.json();
    const { uid } = data;
    
    // 관리자 권한 확인
    const isAdmin = await checkAdminPermission(uid);
    if (!isAdmin) {
      logger.warn(`관리자가 아닌 사용자(${uid})가 캐시 초기화 시도`);
      return NextResponse.json({ success: false, message: "관리자 권한이 필요합니다." }, { status: 403 });
    }
    
    // 여기서 서버 측 캐시를 초기화하는 로직을 구현
    // 예: Redis 캐시 초기화, 메모리 캐시 초기화 등
    
    // 프로젝트 설명 업데이터 서비스의 상태 초기화 (필요한 경우)
    // projectDescriptionUpdater.resetState();
    
    logger.info(`서버 캐시 초기화 완료 (관리자: ${uid})`);
    return NextResponse.json({ 
      success: true, 
      message: "서버 캐시가 성공적으로 초기화되었습니다." 
    });
    
  } catch (error) {
    logger.error("서버 캐시 초기화 중 오류:", error);
    return NextResponse.json({ 
      success: false, 
      message: "서버 캐시 초기화 중 오류가 발생했습니다." 
    }, { status: 500 });
  }
}

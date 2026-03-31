import { NextResponse } from "next/server";
import { summaryGenerator } from "@/services/summary-generator";
import { logger } from "@/services/logger";

// 인증이 필요없는 자동 업데이트 API 라우트
export async function GET() {
  try {
    logger.logSummaryUpdate("🔄 자동 스케줄러에 의한 프로젝트 요약 업데이트 시작");
    
    // 이전 실패 상태 초기화 (키 교체 후에도 정상 동작하도록)
    summaryGenerator.resetApiKeyFailures();
    
    // 한 개의 프로젝트 처리
    const result = await summaryGenerator.processSingleProject();
    
    // 로그 가져오기
    const recentLogs = logger.getSummaryUpdateLog(10);
    
    // 업데이트 상태 확인
    const systemStats = await summaryGenerator.getSystemStats();
    
    if (result && result.updated) {
      return NextResponse.json({ 
        success: true, 
        message: `프로젝트 요약 업데이트 성공: ${result.projectName || '알 수 없는 프로젝트'} (ID: ${result.projectId || '없음'})`,
        project: result,
        lastUpdated: systemStats?.lastUpdatedProject || "알 수 없음",
        totalUpdates: systemStats?.totalUpdates || 0,
        recentLogs
      });
    } else if (result && result.reset) {
      return NextResponse.json({ 
        success: true, 
        message: "모든 프로젝트가 업데이트 되어 상태를 리셋했습니다.",
        resetCount: result.resetCount || 0,
        recentLogs
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: "현재 업데이트할 프로젝트 없음 또는 처리 실패",
        recentLogs
      });
    }
  } catch (error) {
    logger.logSummaryUpdate(`❌ 자동 업데이트 중 오류 발생: ${error}`);
    return NextResponse.json({ 
      success: false, 
      error: `프로젝트 요약 업데이트 중 오류 발생: ${error}`,
      recentLogs: logger.getSummaryUpdateLog(10)
    }, { status: 500 });
  }
}

// HEAD 메소드도 지원 (헬스 체크용)
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}

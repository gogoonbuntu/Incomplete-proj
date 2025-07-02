import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/services/logger-service";
import { firebaseServicePromise } from "@/lib/services/firebase-service";
import { ref, update } from "firebase/database";
import { checkAdminPermission } from "@/lib/services/admin-service";

/**
 * 프로젝트 설명 업데이트 API
 * 관리자만 접근 가능
 */
export async function POST(request: NextRequest) {
  try {
    // 요청 데이터 파싱
    const data = await request.json();
    const { uid, projectId, updates } = data;
    
    // 관리자 권한 확인
    const isAdmin = await checkAdminPermission(uid);
    if (!isAdmin) {
      logger.warn(`관리자가 아닌 사용자(${uid})가 프로젝트 업데이트 시도`);
      return NextResponse.json({ success: false, message: "관리자 권한이 필요합니다." }, { status: 403 });
    }
    
    if (!projectId || !updates) {
      return NextResponse.json({ success: false, message: "프로젝트 ID와 업데이트 데이터가 필요합니다." }, { status: 400 });
    }
    
    // Firebase 업데이트
    const firebaseService = await firebaseServicePromise;
    const db = firebaseService["db"];
    const projectRef = ref(db, `projects/${projectId}`);
    
    await update(projectRef, updates);
    
    logger.info(`프로젝트 ${projectId} 업데이트 완료 (관리자: ${uid})`);
    return NextResponse.json({ success: true, message: "프로젝트가 성공적으로 업데이트되었습니다." });
    
  } catch (error) {
    logger.error("프로젝트 업데이트 중 오류:", error);
    return NextResponse.json({ success: false, message: "프로젝트 업데이트 중 오류가 발생했습니다." }, { status: 500 });
  }
}

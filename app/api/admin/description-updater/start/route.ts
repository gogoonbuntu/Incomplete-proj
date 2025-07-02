import { NextResponse } from 'next/server';
import { projectDescriptionUpdater } from '@/lib/services/project-description-updater';
import { checkAdminPermission } from '@/lib/services/admin-service';
import { logger } from '@/lib/services/logger-service';

export async function POST(request: Request) {
  try {
    // 관리자 권한 확인
    const body = await request.json().catch(() => ({}));
    const uid = body.uid;
    
    if (uid) {
      const isAdmin = await checkAdminPermission(uid);
      if (!isAdmin) {
        return NextResponse.json({ 
          success: false, 
          message: '권한이 없습니다.' 
        }, { status: 403 });
      }
    }
    
    // 서비스가 이미 실행 중인지 확인
    if (projectDescriptionUpdater['isRunning']) {
      return NextResponse.json({
        success: false,
        message: '서비스가 이미 실행 중입니다.'
      });
    }
    
    // 서비스 시작
    logger.info('관리자 요청으로 프로젝트 설명 자동 업데이트 서비스를 시작합니다.');
    await projectDescriptionUpdater.start();
    
    // 서비스 시작 시간 기록
    projectDescriptionUpdater['lastRunTime'] = new Date().toISOString();
    
    return NextResponse.json({
      success: true,
      message: '프로젝트 설명 자동 업데이트 서비스가 시작되었습니다.'
    });
  } catch (error) {
    console.error('서비스 시작 실패:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '서비스 시작 중 오류가 발생했습니다.' 
      }, 
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { projectDescriptionUpdater } from '@/lib/services/project-description-updater';
import { checkAdminPermission } from '@/lib/services/admin-service';

export async function GET(request: Request) {
  try {
    // 관리자 권한 확인
    const url = new URL(request.url);
    const uid = url.searchParams.get('uid');
    
    if (uid) {
      const isAdmin = await checkAdminPermission(uid);
      if (!isAdmin) {
        return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
      }
    }
    
    // 서비스 상태 반환
    return NextResponse.json({
      isRunning: projectDescriptionUpdater['isRunning'] || false,
      message: '서비스 상태를 성공적으로 조회했습니다.',
      lastRun: projectDescriptionUpdater['lastRunTime'] || null
    });
  } catch (error) {
    console.error('서비스 상태 조회 실패:', error);
    return NextResponse.json(
      { error: '서비스 상태 조회 중 오류가 발생했습니다.' }, 
      { status: 500 }
    );
  }
}

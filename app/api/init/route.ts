import { NextResponse } from 'next/server';
import { initializeServices } from '../init-services';

// 서버 시작 시 자동으로 서비스 초기화
initializeServices().catch(console.error);

// API 라우트 핸들러
export async function GET() {
  try {
    await initializeServices();
    return NextResponse.json({ 
      success: true, 
      message: '서비스가 성공적으로 초기화되었습니다.' 
    });
  } catch (error) {
    console.error('Service initialization error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '서비스 초기화 중 오류가 발생했습니다.' 
      }, 
      { status: 500 }
    );
  }
}

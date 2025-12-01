import { NextResponse } from 'next/server';
import { apiKeyManager } from '../../../../services/api-key-manager';

/**
 * API 키 관리자의 현재 상태를 확인하기 위한 디버그 엔드포인트
 * 주의: 이 엔드포인트는 개발 환경에서만 사용해야 합니다.
 */
export async function GET() {
  // 보안을 위해 개발 환경에서만 작동하도록 설정
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: '개발 환경에서만 접근 가능합니다.' },
      { status: 403 }
    );
  }

  // API 키 관리자의 현재 상태 가져오기
  const stats = apiKeyManager.getStats();
  
  // API 키는 마스킹 처리하여 반환 (보안)
  const maskedKeys = apiKeyManager.getMaskedKeys();
  
  return NextResponse.json({
    stats,
    maskedKeys,
    currentKeyIndex: apiKeyManager.getCurrentKeyIndex(),
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
}

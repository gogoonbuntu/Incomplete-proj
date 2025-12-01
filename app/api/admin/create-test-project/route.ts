import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { logger } from '@/services/logger';
import { Firestore } from 'firebase-admin/firestore';

// DB가 null이 아닌지 확인
if (!db) {
  throw new Error("Firestore database not initialized");
}

// 타입 캐스팅을 위한 변수
const firestore = db as Firestore;

export async function GET() {
  try {
    // 현재 시간을 기준으로 고유 ID 생성
    const timestamp = new Date().getTime();
    const projectId = `test-project-${timestamp}`;

    // 샘플 프로젝트 생성 (간단한 정보만 포함)
    const sampleProject = {
      name: `테스트 프로젝트 ${timestamp}`,
      description: "이 프로젝트는 요약 업데이트 기능을 테스트하기 위해 자동으로 생성되었습니다.",
      language: "JavaScript",
      createdAt: new Date().toISOString(),
      // lastSummaryUpdate 필드를 오래된 날짜로 설정하여 업데이트 대상이 되도록 함
      lastSummaryUpdate: new Date(2020, 0, 1).toISOString(),
      githubUrl: "https://github.com/test/sample-project",
      readme: `
# 테스트 프로젝트

이것은 요약 업데이트 기능을 테스트하기 위한 샘플 프로젝트입니다.

## 기능
- 기능 1: 테스트 목적의 데이터 제공
- 기능 2: 요약 생성 API 테스트 지원
- 기능 3: 자동 업데이트 기능 검증

## 기술 스택
- Frontend: React
- Backend: Node.js
- Database: Firebase
- API: RESTful

## 설치 방법
\`\`\`
npm install
npm run dev
\`\`\`
      `,
      primaryFiles: ["index.js", "server.js", "database.js"]
    };

    // Firestore에 프로젝트 저장
    await firestore.collection('projects').doc(projectId).set(sampleProject);
    
    logger.logSummaryUpdate(`테스트 프로젝트 생성 완료: ${projectId}`);
    
    return NextResponse.json({ 
      success: true, 
      message: `테스트 프로젝트가 성공적으로 생성되었습니다 (ID: ${projectId})`,
      projectId,
      project: sampleProject
    });
  } catch (error: any) {
    console.error('테스트 프로젝트 생성 중 오류:', error);
    return NextResponse.json({ 
      success: false, 
      message: '테스트 프로젝트 생성 실패', 
      error: error.message || String(error) 
    }, { status: 500 });
  }
}

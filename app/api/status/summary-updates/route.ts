import { NextResponse } from "next/server";
import { logger } from "@/services/logger";
import { db } from "@/lib/firebase-admin";
import { Firestore } from "firebase-admin/firestore";

interface ProjectData {
  id: string;
  name: string;
  lastUpdate: string;
  description: string;
}

interface SystemStats {
  lastSuccessfulUpdate?: string;
  lastUpdatedProject?: string;
  lastUpdatedProjectId?: string;
  totalUpdates?: number;
}

export async function GET() {
  try {
    // 로그 가져오기
    const recentLogs = logger.getSummaryUpdateLog(50);
    
    // 시스템 통계 데이터 가져오기
    let stats = null;
    try {
      if (!db) {
        throw new Error("Firestore 데이터베이스가 초기화되지 않았습니다.");
      }
      
      const statsDoc = await db.collection("system").doc("summary-updater-stats").get();
      if (statsDoc.exists) {
        stats = statsDoc.data();
      }
    } catch (error) {
      console.error("통계 정보 가져오기 오류:", error);
    }
    
    // 최근 업데이트된 프로젝트 5개 가져오기
    let recentProjects: ProjectData[] = [];
    try {
      if (!db) {
        throw new Error("Firestore 데이터베이스가 초기화되지 않았습니다.");
      }

      const projectsSnapshot = await db
        .collection("projects")
        .orderBy("lastSummaryUpdate", "desc")
        .limit(5)
        .get();
      
      recentProjects = projectsSnapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          lastUpdate: data.lastSummaryUpdate,
          description: data.enhancedDescription?.substring(0, 100) + "..." || "설명 없음"
        };
      });
    } catch (error) {
      console.error("최근 프로젝트 가져오기 오류:", error);
    }
    
    return NextResponse.json({
      success: true,
      lastUpdate: stats?.lastSuccessfulUpdate || "없음",
      lastUpdatedProject: stats?.lastUpdatedProject || "없음",
      totalUpdates: stats?.totalUpdates || 0,
      recentProjects,
      logs: recentLogs.split("\n")
    });
  } catch (error) {
    console.error("상태 API 오류:", error);
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 });
  }
}

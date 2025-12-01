'use client';

import { useState, useEffect } from 'react';
import styles from './status.module.css';

interface StatusData {
  success: boolean;
  lastUpdate: string;
  lastUpdatedProject: string;
  totalUpdates: number;
  recentProjects: Array<{
    id: string;
    name: string;
    lastUpdate: string;
    description: string;
  }>;
  logs: string[];
}

export default function StatusPage() {
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTime, setRefreshTime] = useState<string>('');

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/status/summary-updates');
      if (!response.ok) {
        throw new Error(`HTTP 에러! 상태: ${response.status}`);
      }
      const data = await response.json();
      setStatusData(data);
      setRefreshTime(new Date().toLocaleString('ko-KR'));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    
    // 1분마다 자동으로 새로고침
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString: string): string => {
    if (!dateString || dateString === '없음') return '없음';
    try {
      return new Date(dateString).toLocaleString('ko-KR');
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>프로젝트 요약 업데이트 현황</h1>
      
      <div className={styles.refreshInfo}>
        <span>마지막 업데이트: {refreshTime || '로딩 중...'}</span>
        <button 
          className={styles.refreshButton} 
          onClick={fetchStatus} 
          disabled={loading}
        >
          {loading ? '로딩 중...' : '새로고침'}
        </button>
      </div>
      
      {error && (
        <div className={styles.error}>
          <p>오류 발생: {error}</p>
        </div>
      )}
      
      {loading && !statusData ? (
        <div className={styles.loading}>로딩 중...</div>
      ) : statusData && (
        <>
          <div className={styles.statsContainer}>
            <div className={styles.statsCard}>
              <h2>업데이트 통계</h2>
              <div className={styles.stat}>
                <span className={styles.statLabel}>마지막 업데이트:</span>
                <span className={styles.statValue}>{formatDate(statusData.lastUpdate)}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>마지막 업데이트 프로젝트:</span>
                <span className={styles.statValue}>{statusData.lastUpdatedProject || '없음'}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>총 업데이트 횟수:</span>
                <span className={styles.statValue}>{statusData.totalUpdates}</span>
              </div>
            </div>
          </div>
          
          <div className={styles.section}>
            <h2>최근 업데이트된 프로젝트</h2>
            {statusData.recentProjects && statusData.recentProjects.length > 0 ? (
              <div className={styles.projectsList}>
                {statusData.recentProjects.map(project => (
                  <div key={project.id} className={styles.projectItem}>
                    <h3>{project.name}</h3>
                    <p className={styles.timestamp}>
                      업데이트: {formatDate(project.lastUpdate)}
                    </p>
                    <p className={styles.description}>{project.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.noData}>최근 업데이트된 프로젝트가 없습니다.</p>
            )}
          </div>
          
          <div className={styles.section}>
            <h2>업데이트 로그</h2>
            <div className={styles.logs}>
              {statusData.logs && statusData.logs.length > 0 ? (
                <ul className={styles.logList}>
                  {statusData.logs.map((log, index) => (
                    <li key={index} className={styles.logItem}>
                      {log.includes('✅') ? (
                        <span className={styles.logSuccess}>{log}</span>
                      ) : log.includes('❌') ? (
                        <span className={styles.logError}>{log}</span>
                      ) : log.includes('⚠️') ? (
                        <span className={styles.logWarning}>{log}</span>
                      ) : (
                        <span>{log}</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.noData}>로그 데이터가 없습니다.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

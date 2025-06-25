import { useEffect, useState } from 'react';
import { getDatabase, ref, get } from 'firebase/database';
import { initializeFirebaseClient } from '@/lib/utils/firebase-client';

export default function TestDB() {
  const [status, setStatus] = useState('Checking database connection...');
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testDbConnection = async () => {
      try {
        const app = await initializeFirebaseClient();
        const db = getDatabase(app);
        console.log('Database instance:', db);
        
        // Test read from a test path
        const testRef = ref(db, '.info/connected');
        const snapshot = await get(testRef);
        
        if (snapshot.exists()) {
          setStatus('✅ Database connection successful!');
          setData(snapshot.val());
        } else {
          setStatus('⚠️ Connected but test path not found');
        }
      } catch (err) {
        console.error('Database test error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setStatus('❌ Database connection failed');
      }
    };

    testDbConnection();
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Firebase Database Test</h1>
      <div style={{ margin: '1rem 0', padding: '1rem', background: '#f0f0f0', borderRadius: '4px' }}>
        <h3>Status: {status}</h3>
        {error && (
          <div style={{ color: 'red', marginTop: '1rem' }}>
            <strong>Error:</strong> {error}
          </div>
        )}
        {data && (
          <div style={{ marginTop: '1rem' }}>
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </div>
        )}
      </div>
      <div style={{ marginTop: '2rem', padding: '1rem', background: '#e6f7ff', borderRadius: '4px' }}>
        <h3>Next Steps:</h3>
        <ol>
          <li>Open browser's developer tools (F12)</li>
          <li>Go to the Console tab</li>
          <li>Check for any error messages</li>
          <li>Look for logs starting with "Firebase"</li>
        </ol>
      </div>
    </div>
  );
}

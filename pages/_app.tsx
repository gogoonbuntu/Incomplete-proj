import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { getFirebaseAuth } from '@/lib/utils/firebase-client';
import { onAuthStateChanged } from 'firebase/auth';
import { logger } from '@/lib/services/logger-service';
import type { AppProps } from 'next/app';
import '@/styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    // Initialize auth state listener
    (async () => {
      const auth = await getFirebaseAuth();
      const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        logger.info('User signed in:', user.uid);
      } else {
        logger.info('User signed out');
      }
    });

    // Cleanup subscription on unmount
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  })();
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp;

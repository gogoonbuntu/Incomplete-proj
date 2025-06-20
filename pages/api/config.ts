import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only expose non-sensitive, client-side Firebase config
  const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
  };

  // Only expose the config in development or if explicitly enabled in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  const exposeInProduction = process.env.EXPOSE_FIREBASE_CONFIG === 'true';

  if (!isDevelopment && !exposeInProduction) {
    return res.status(401).json({ error: 'Not authorized' });
  }

  res.status(200).json(firebaseConfig);
}

/** @type {import('next').NextConfig} */

// dotenv를 직접 사용하여 환경 변수 로드
import dotenv from 'dotenv';

// 환경 변수 로드 (개발 환경과 프로덕션 환경 모두 지원)
dotenv.config({ path: '.env.local' });

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // 서버 측에서 사용할 환경 변수 명시적으로 설정
  env: {
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    FIREBASE_SERVICE_ACCOUNT_KEY: process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
    FIREBASE_DATABASE_URL: process.env.FIREBASE_DATABASE_URL,
    FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET
  },
}

export default nextConfig

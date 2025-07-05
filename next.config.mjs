/** @type {import('next').NextConfig} */

// 환경 변수 로드 시도 (개발 환경과 프로덕션 환경 모두 지원)
try {
  // ESM에서는 동적 임포트를 사용해야 함
  const dotenvResult = await import('dotenv').catch(() => ({ default: null }));
  const dotenv = dotenvResult.default;
  
  // dotenv가 있으면 환경 변수 로드
  if (dotenv) {
    dotenv.config({ path: '.env.local' });
    console.log('Environment variables loaded from .env.local');
  } else {
    console.log('dotenv module not found, continuing with existing environment variables');
  }
} catch (error) {
  console.log('Error loading environment variables:', error.message);
  // 오류가 발생해도 빌드는 계속 진행
}

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
  // 경로 별칭 설정 강화
  webpack: (config, { isServer }) => {
    // 절대 경로 별칭 추가
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': process.cwd()
    };
    return config;
  },
}

export default nextConfig

#!/usr/bin/env node

/**
 * 안전한 Vercel 배포를 위한 스크립트
 * 
 * 이 스크립트는 다음 작업을 수행합니다:
 * 1. .env.local 파일에서 환경 변수를 로드
 * 2. 민감한 키가 안전하게 처리되었는지 확인
 * 3. Vercel 배포를 위한 환경 변수 설정 가이드 제공
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const chalk = require('chalk');

// .env.local 파일 로드
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envLocal = dotenv.parse(fs.readFileSync(envLocalPath));

console.log(chalk.blue('=== 안전한 Vercel 배포 준비 ===\n'));

// 1. Firebase API 키 도메인 제한 확인
console.log(chalk.yellow('1. Firebase API 키 보안 설정'));
console.log('Firebase 콘솔에서 다음 작업을 수행했는지 확인하세요:');
console.log('- 프로젝트 설정 > API 키 관리');
console.log('- 웹 API 키 선택 > HTTP 리퍼러 제한 설정');
console.log('- 다음 도메인 추가: *.vercel.app, 실제 배포 도메인, localhost\n');

// 2. 서버 측 키 확인
console.log(chalk.yellow('2. 서버 측 키 확인'));

// GitHub 토큰 확인
const githubToken = envLocal.GITHUB_TOKEN;
if (githubToken && githubToken !== 'your_new_github_token_here') {
  console.log(chalk.green('✓ GitHub 토큰이 설정되어 있습니다.'));
  
  // 토큰이 NEXT_PUBLIC_ 접두사를 사용하지 않는지 확인
  if (envLocal.NEXT_PUBLIC_GITHUB_TOKEN) {
    console.log(chalk.red('⚠️ 경고: NEXT_PUBLIC_GITHUB_TOKEN이 설정되어 있습니다. 이 변수는 제거해야 합니다.'));
  }
} else {
  console.log(chalk.red('✗ GitHub 토큰이 설정되어 있지 않거나 기본값입니다.'));
}

// Gemini API 키 확인
const geminiApiKey = envLocal.GEMINI_API_KEY;
if (geminiApiKey && geminiApiKey !== 'your_new_gemini_api_key_here') {
  console.log(chalk.green('✓ Gemini API 키가 설정되어 있습니다.'));
  
  // 키가 NEXT_PUBLIC_ 접두사를 사용하지 않는지 확인
  if (envLocal.NEXT_PUBLIC_GEMINI_API_KEY) {
    console.log(chalk.red('⚠️ 경고: NEXT_PUBLIC_GEMINI_API_KEY가 설정되어 있습니다. 이 변수는 제거해야 합니다.'));
  }
} else {
  console.log(chalk.red('✗ Gemini API 키가 설정되어 있지 않거나 기본값입니다.'));
}

// Firebase 서비스 계정 키 확인
const firebaseServiceAccountKey = envLocal.FIREBASE_SERVICE_ACCOUNT_KEY;
if (firebaseServiceAccountKey && firebaseServiceAccountKey !== 'your-service-account-key-here') {
  try {
    // 유효한 JSON인지 확인
    JSON.parse(firebaseServiceAccountKey);
    console.log(chalk.green('✓ Firebase 서비스 계정 키가 유효한 JSON 형식입니다.'));
  } catch (e) {
    console.log(chalk.red('✗ Firebase 서비스 계정 키가 유효한 JSON 형식이 아닙니다.'));
    console.log('  서비스 계정 키는 JSON 문자열 형식이어야 합니다.');
    console.log('  prepare-vercel-env.js 스크립트를 사용하여 변환하세요.');
  }
} else {
  console.log(chalk.yellow('⚠️ Firebase 서비스 계정 키가 설정되어 있지 않거나 기본값입니다.'));
  console.log('  서버 측 Firebase 기능을 사용하려면 이 키가 필요합니다.');
}

console.log('\n');

// 3. Vercel 배포 가이드
console.log(chalk.yellow('3. Vercel 배포 가이드'));
console.log('Vercel 프로젝트 설정에서 다음 환경 변수를 설정하세요:');

// 환경 변수 목록 생성
const envVars = [];

// 필수 환경 변수
const requiredVars = [
  'GITHUB_TOKEN',
  'GEMINI_API_KEY',
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_DATABASE_URL',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  'FIREBASE_DATABASE_URL',
  'FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT'
];

// 선택적 환경 변수
const optionalVars = [
  'FIREBASE_SERVICE_ACCOUNT_KEY'
];

// 환경 변수 목록에 추가
requiredVars.forEach(varName => {
  const value = envLocal[varName] || '';
  const isPlaceholder = value.includes('your_') || value.includes('your-');
  
  envVars.push({
    name: varName,
    value: isPlaceholder ? '' : value,
    required: true,
    isSet: value && !isPlaceholder
  });
});

optionalVars.forEach(varName => {
  const value = envLocal[varName] || '';
  const isPlaceholder = value.includes('your_') || value.includes('your-');
  
  envVars.push({
    name: varName,
    value: isPlaceholder ? '' : value,
    required: false,
    isSet: value && !isPlaceholder
  });
});

// 환경 변수 표시
envVars.forEach(v => {
  const status = v.isSet 
    ? chalk.green('✓') 
    : (v.required ? chalk.red('✗') : chalk.yellow('⚠️'));
  
  console.log(`${status} ${v.name}${v.required ? ' (필수)' : ' (선택)'}`);
});

console.log('\n');
console.log(chalk.blue('=== 배포 준비 완료 ==='));
console.log('1. Vercel 프로젝트 설정에서 위의 환경 변수를 설정하세요.');
console.log('2. Firebase API 키에 도메인 제한을 설정했는지 확인하세요.');
console.log('3. 배포 후 서버 측 기능이 제대로 작동하는지 확인하세요.');

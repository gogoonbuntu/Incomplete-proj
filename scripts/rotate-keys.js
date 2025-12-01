#!/usr/bin/env node

/**
 * API 키 로테이션 유틸리티
 * 
 * 이 스크립트는 다음과 같은 작업을 수행합니다:
 * 1. .env.local 파일에서 현재 API 키 확인
 * 2. 모든 키가 존재하는지 확인하고 누락된 키 보고
 * 3. 각 키를 검증하고 상태 보고
 * 4. 키 로테이션 가이드 제공
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const dotenv = require('dotenv');
const { execSync } = require('child_process');

// 환경 변수 파일 로드
const envPath = path.join(process.cwd(), '.env.local');
const envExists = fs.existsSync(envPath);

if (!envExists) {
  console.error(chalk.red('.env.local 파일이 존재하지 않습니다. 먼저 이 파일을 생성해주세요.'));
  process.exit(1);
}

// .env.local 파일 로드
const envConfig = dotenv.parse(fs.readFileSync(envPath));

// 필요한 API 키와 설명
const requiredKeys = {
  'GITHUB_TOKEN': 'GitHub Personal Access Token',
  'GEMINI_API_KEY': 'Google Gemini API Key',
  'FIREBASE_API_KEY': 'Firebase API Key',
  'NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT': 'Google AdSense Client ID',
  'FIREBASE_SERVICE_ACCOUNT_KEY': 'Firebase Admin SDK Service Account (Base64)'
};

// Git에서 해당 키가 노출된 이력이 있는지 확인
function checkKeyExposureInGit(key, value) {
  if (!value || value.length < 8) return false;
  
  try {
    // 값의 일부만 검색하여 부분 일치 찾기 (마지막 8자리)
    const partialValue = value.slice(-8);
    const result = execSync(`git log -p | grep -q "${partialValue}" || echo "not found"`).toString().trim();
    return result !== 'not found';
  } catch (error) {
    return true; // 에러 발생 시 노출됐다고 가정 (안전한 접근)
  }
}

// 실행 결과 표시
console.log(chalk.blue.bold('============================'));
console.log(chalk.blue.bold('🔐 API 키 보안 상태 확인 🔐'));
console.log(chalk.blue.bold('============================\n'));

let exposedKeys = [];
let missingKeys = [];

// 각 키 검증
Object.keys(requiredKeys).forEach(key => {
  const value = envConfig[key];
  
  if (!value) {
    console.log(`${chalk.yellow('⚠️')} ${chalk.yellow(key)}: ${chalk.red('누락됨')} - ${requiredKeys[key]}`);
    missingKeys.push(key);
    return;
  }
  
  const isExposed = checkKeyExposureInGit(key, value);
  
  if (isExposed) {
    console.log(`${chalk.red('❌')} ${chalk.yellow(key)}: ${chalk.red('Git 히스토리에 노출됨')} - 교체 필요`);
    exposedKeys.push(key);
  } else {
    console.log(`${chalk.green('✅')} ${chalk.green(key)}: ${chalk.green('안전함')}`);
  }
});

console.log('\n');

// 결과 요약 및 권장 조치
if (missingKeys.length > 0) {
  console.log(chalk.yellow.bold('⚠️ 누락된 API 키:'));
  missingKeys.forEach(key => {
    console.log(`  - ${key}: ${requiredKeys[key]}`);
  });
  console.log('\n');
}

if (exposedKeys.length > 0) {
  console.log(chalk.red.bold('❌ Git 히스토리에 노출된 키:'));
  exposedKeys.forEach(key => {
    console.log(`  - ${key}: ${requiredKeys[key]}`);
  });
  
  console.log('\n');
  console.log(chalk.yellow.bold('📝 키 로테이션 가이드:'));
  exposedKeys.forEach(key => {
    console.log(`  1. ${key}: ${requiredKeys[key]} 재발급`);
    
    switch(key) {
      case 'GITHUB_TOKEN':
        console.log('     GitHub → Settings → Developer settings → Personal access tokens → Generate new token');
        break;
      case 'GEMINI_API_KEY':
        console.log('     https://ai.google.dev/ → API keys → Create API key');
        break;
      case 'FIREBASE_API_KEY':
        console.log('     Firebase Console → Project settings → Web API Key');
        break;
      case 'NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT':
        console.log('     Google AdSense Dashboard → Account → Account information');
        break;
      case 'FIREBASE_SERVICE_ACCOUNT_KEY':
        console.log('     Firebase Console → Project settings → Service accounts → Generate new private key');
        console.log('     생성된 JSON 파일을 Base64로 인코딩하여 저장 (cat file.json | base64)');
        break;
    }
  });
  
  console.log('\n');
  console.log(chalk.yellow.bold('🔒 보안 강화 권장사항:'));
  console.log('  1. 모든 API 키를 즉시 교체하세요');
  console.log('  2. BFG Repo-Cleaner를 사용하여 Git 히스토리에서 키 제거');
  console.log('  3. 향후 키 노출 방지를 위해 pre-commit 훅 설정 검토');
  console.log('  4. Vercel 환경 변수로 모든 키 설정 및 로컬 .env.local 파일 git에서 제외 확인');
} else if (missingKeys.length === 0) {
  console.log(chalk.green.bold('✅ 모든 API 키가 안전하게 설정되었습니다.'));
}

console.log('\n');

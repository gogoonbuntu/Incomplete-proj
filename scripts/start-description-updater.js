// 프로젝트 설명 자동 업데이트 서비스 시작 스크립트
const path = require('path');
const dotenv = require('dotenv');
const chalk = require('chalk');

// 환경 변수 로드
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

console.log(chalk.blue('🔄 프로젝트 설명 자동 업데이트 서비스를 시작합니다...'));

// 필요한 환경 변수 확인
if (!process.env.GEMINI_API_KEY) {
  console.error(chalk.red('❌ GEMINI_API_KEY가 설정되지 않았습니다. .env.local 파일을 확인해주세요.'));
  process.exit(1);
}

if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
  console.error(chalk.red('❌ Firebase 설정이 완료되지 않았습니다. .env.local 파일을 확인해주세요.'));
  process.exit(1);
}

// Next.js 환경 설정
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// 서비스 시작을 위한 import 경로
const servicePath = path.resolve(process.cwd(), 'lib/services/project-description-updater');

// 서비스 시작
async function startService() {
  try {
    // 동적으로 서비스 모듈 불러오기
    const { projectDescriptionUpdater } = await import(servicePath);
    
    // 서비스 시작
    await projectDescriptionUpdater.start();
    
    console.log(chalk.green('✅ 프로젝트 설명 자동 업데이트 서비스가 성공적으로 시작되었습니다.'));
    console.log(chalk.yellow('ℹ️  서비스는 5분 간격으로 실행되며, 한 번에 하나의 프로젝트만 처리합니다.'));
    console.log(chalk.yellow('ℹ️  Ctrl+C를 눌러 서비스를 종료할 수 있습니다.'));
    
    // 프로세스 종료 시 서비스 정리
    process.on('SIGINT', () => {
      console.log(chalk.blue('\n🛑 서비스를 종료합니다...'));
      projectDescriptionUpdater.stop();
      process.exit(0);
    });
    
  } catch (error) {
    console.error(chalk.red('❌ 서비스 시작 중 오류가 발생했습니다:'), error);
    process.exit(1);
  }
}

startService();

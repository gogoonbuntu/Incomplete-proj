# Incomplete Projects Discovery

A Next.js application for discovering and continuing development on unfinished GitHub projects.

## Project Overview

This application helps developers find unfinished GitHub projects that they can contribute to or fork for their own use. It uses Firebase for backend services, GitHub API for repository data, and Google Gemini API for AI analysis.

## Features

- Browse unfinished GitHub projects
- Filter and sort projects by various criteria
- Trigger crawling to fetch new projects
- Bookmark interesting projects
- User authentication via Firebase
- AI analysis of project potential

## Local Development

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env.local` file with the required environment variables (see below)
4. Run the development server:
   ```
   npm run dev
   ```

## Environment Variables

The following environment variables are required:

### GitHub API
```
GITHUB_TOKEN=your_github_personal_access_token
```

### Gemini AI API
```
GEMINI_API_KEY=your_gemini_api_key
```

### Firebase Configuration (Client-side)
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=your_firebase_database_url
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
```

### Firebase Admin Configuration (Server-side)
```
FIREBASE_SERVICE_ACCOUNT_KEY=your_service_account_key_json
FIREBASE_DATABASE_URL=your_firebase_database_url
FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
```

### Google AdSense
```
NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT=your_adsense_client_id
```

## Deploying to Vercel

### Prerequisites

1. A Vercel account
2. A Firebase project with Realtime Database enabled
3. GitHub personal access token
4. Google Gemini API key
5. Google AdSense account (optional)

### Deployment Steps

1. Push your code to a GitHub repository
2. Import the repository in Vercel
3. Configure the environment variables in Vercel's project settings
4. Deploy the project

### Important Notes for Vercel Deployment

1. **Firebase Service Account Key**: This should be a JSON string containing your Firebase service account credentials. In Vercel, you need to add this as an environment variable. Make sure to stringify the JSON object before adding it.

2. **Build Settings**: The project is already configured with the necessary build settings in `vercel.json`. No additional configuration is needed.

3. **Environment Variables**: All environment variables from your local `.env.local` file need to be added to Vercel's environment variables section in the project settings.

4. **Security**: Ensure that your Firebase security rules are properly configured to protect your data.

## Troubleshooting

### Common Issues

1. **Firebase Authentication Issues**: Ensure that the authentication methods you want to use are enabled in the Firebase console.

2. **API Rate Limiting**: The GitHub API has rate limits. If you encounter rate limiting issues, consider implementing a more robust rate limiting strategy.

3. **Missing Environment Variables**: If you encounter errors related to missing configuration, check that all required environment variables are set.

4. **AdSense Not Loading**: Google AdSense requires approval before ads will display. During development, placeholder ads will be shown.

## 자동 프로젝트 설명 업데이트 시스템

### 개요

이 애플리케이션은 Google Gemini API를 활용하여 프로젝트 설명을 자동으로 생성하고 업데이트하는 기능을 포함하고 있습니다. 이 기능은 주기적으로 실행되며, 다음과 같은 프로세스로 작동합니다:

### 작동 방식

1. **업데이트 대상 선정**: 데이터베이스에서 가장 오래전에 업데이트된 프로젝트(또는 아직 업데이트되지 않은 프로젝트)를 선택합니다.
   - 최근 7일 이내에 업데이트된 프로젝트는 건너뜁니다.
   - 모든 프로젝트가 최근 7일 이내에 업데이트되었다면, 모든 프로젝트의 업데이트 상태를 리셋하고 처음부터 다시 시작합니다.

2. **요약 생성**: 선택된 프로젝트의 README, 설명, 소스코드 등을 분석하여 Gemini API로 요약을 생성합니다.
   - 요약은 영어로 생성되며, 영어 요약에는 SUMMARY, FEATURES, TECHNICAL 섹션이 포함됩니다.
   - API 일일 호출 한도(50회/일)를 준수하여 과도한 API 사용을 방지합니다.

3. **데이터 저장**: 생성된 요약은 프로젝트의 `enhancedDescription` 필드에 저장되며, `lastSummaryUpdate` 필드에 마지막 업데이트 시간이 기록됩니다.

4. **통계 업데이트**: 시스템은 `system/summary-updater-stats` 문서에 마지막 업데이트 시간, 프로젝트 이름, 총 업데이트 횟수를 기록합니다.

5. **로깅 및 모니터링**: 모든 업데이트 과정은 로그에 기록되며, 관리자 페이지에서 실시간으로 모니터링할 수 있습니다.

### 업데이트 프로세스 상세 설명

1. **프로젝트 선택 로직**:
   ```typescript
   // 가장 오래된 업데이트 순으로 프로젝트 정렬
   const snapshot = await firestore
     .collection("projects")
     .orderBy("lastSummaryUpdate", "asc")
     .limit(1)
     .get();
   ```

2. **리셋 메커니즘**:
   ```typescript
   // 모든 프로젝트가 최근 7일 이내에 업데이트된 경우, 모든 프로젝트의 lastSummaryUpdate를 
   // 2000년 1월 1일로 리셋하여 다시 처리할 수 있게 함
   const oldDate = new Date(2000, 0, 1).toISOString();
   batch.update(doc.ref, { lastSummaryUpdate: oldDate });
   ```

3. **API 호출 제한**:
   ```typescript
   // 일일 API 호출 횟수 제한 (기본값: 50회)
   if (!summaryGenerator.canMakeApiCall()) {
     logger.logSummaryUpdate(`API 호출 제한에 도달했습니다. 내일 다시 시도합니다.`);
     return { updated: false };
   }
   ```

### API 엔드포인트

1. **자동 업데이트 API**: `/api/cron/summary-updater`
   - 한 개의 프로젝트 처리
   - 실행 결과와 로그 반환

2. **상태 확인 API**: `/api/status/summary-updates`
   - 최근 업데이트된 프로젝트 목록
   - 시스템 통계 및 로그 반환

### 관리자 인터페이스

`/admin/summary-updater` 페이지에서 다음 기능을 사용할 수 있습니다:

- 업데이트 상태 및 통계 확인
- 최근 로그 조회
- 수동으로 업데이트 프로세스 트리거
- 자동 업데이트 활성화/비활성화

### 주기적 업데이트 문제 해결

자동 업데이트 시스템이 제대로 작동하지 않는 경우 다음을 확인하세요:

1. **API 키 유효성**: Gemini API 키가 유효한지 확인합니다.
   - 키가 유효하지 않으면 API 호출이 실패하고 요약이 생성되지 않습니다.
   - `.env.local` 파일에서 `GEMINI_API_KEY` 값을 확인하세요.
   - 키 노출 여부를 확인하려면 `npm run rotate-keys` 명령어를 실행하세요.

2. **Firebase 연결**: Firebase 데이터베이스 연결이 정상적인지 확인합니다.
   - 서비스 계정 키가 올바르게 설정되었는지 확인합니다.
   - 데이터베이스 읽기/쓰기 권한이 있는지 확인합니다.

3. **로그 확인**: 시스템 로그를 확인하여 오류 메시지가 있는지 검토합니다.
   - 관리자 페이지에서 최근 로그를 확인할 수 있습니다.
   - 콘솔 오류 메시지도 확인하세요.

4. **수동 업데이트 트리거**: 관리자 페이지에서 수동으로 업데이트 프로세스를 트리거해보세요.
   - 이 기능을 통해 개별 프로젝트의 업데이트 상태를 테스트할 수 있습니다.

5. **리셋 프로세스**: 모든 프로젝트 업데이트 상태를 수동으로 리셋합니다.
   ```javascript
   // Firebase 콘솔이나 관리자 기능을 통해 다음 작업 수행:
   // 1. 모든 프로젝트의 lastSummaryUpdate 필드를 과거 날짜로 설정
   // 2. 업데이트 프로세스를 다시 트리거
   ```

6. **배치 크기 확인**: 프로젝트 수가 많은 경우 배치 처리 크기(최대 500개)를 초과하지 않는지 확인합니다.

### 문제 해결 예시

1. **요약 업데이트가 진행되지 않는 경우**:
   - 모든 프로젝트가 이미 7일 이내에 업데이트되었을 수 있습니다.
   - 수동으로 리셋 프로세스를 트리거하세요.

2. **API 오류 발생 시**:
   - Gemini API 키를 새로 발급받아 `.env.local` 파일을 업데이트하세요.
   - Vercel 배포 환경에서는 환경 변수도 함께 업데이트해야 합니다.

3. **Firebase 연결 오류**:
   - 서비스 계정 키가 올바른지 확인하세요.
   - Firebase 프로젝트 설정에서 웹 API 키가 활성화되어 있는지 확인하세요.

## License

[MIT](LICENSE)

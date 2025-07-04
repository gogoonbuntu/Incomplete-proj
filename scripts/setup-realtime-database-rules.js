// Firebase Realtime Database 보안 규칙 (올바른 형식)
// Firebase 콘솔 → Realtime Database → 규칙 탭에서 설정

const realtimeDatabaseRules = {
  rules: {
    // 공개 프로젝트는 모든 사용자가 읽기/쓰기 가능
    public_projects: {
      ".read": true,
      ".write": true,
    },

    // 기존 프로젝트 (호환성을 위해 유지)
    projects: {
      ".read": true,
      ".write": true,
    },

    // 사용자 데이터는 본인만 접근 가능
    users: {
      $uid: {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid",
      },
    },

    // 상호작용 데이터는 인증된 사용자만
    interactions: {
      ".read": "auth != null",
      ".write": "auth != null",
    },

    // 시스템 로그 (읽기 전용)
    system_logs: {
      ".read": true,
      ".write": false,
    },
  },
}

console.log("=== Firebase Realtime Database 보안 규칙 ===")
console.log(JSON.stringify(realtimeDatabaseRules, null, 2))
console.log("\n위 규칙을 Firebase 콘솔에서 설정하세요:")
console.log("1. Firebase 콘솔 → Realtime Database → 규칙 탭")
console.log("2. 위 JSON을 복사하여 붙여넣기")
console.log("3. '게시' 버튼 클릭")
console.log("\n⚠️ 주의: 현재 public_projects와 projects에 대해 쓰기 권한이 열려있습니다.")
console.log("   프로덕션 환경에서는 더 엄격한 규칙을 적용하세요.")

// Firebase Realtime Database 보안 규칙
// Firebase 콘솔 → Realtime Database → 규칙 탭에서 설정

const databaseRules = {
  rules: {
    // 프로젝트는 모든 사용자가 읽기 가능, 쓰기는 인증된 사용자만
    projects: {
      ".read": true,
      ".write": "auth != null",
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
  },
}

console.log("Firebase Realtime Database 규칙:")
console.log(JSON.stringify(databaseRules, null, 2))
console.log("\n위 규칙을 Firebase 콘솔 → Realtime Database → 규칙 탭에 복사하여 붙여넣으세요.")

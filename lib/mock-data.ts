import type { Project } from "@/types/project"

export const mockProjects: Project[] = [
  {
    id: "1",
    title: "React Todo App with Advanced Features",
    description:
      "고급 기능을 포함한 React 기반 할일 관리 앱입니다. 드래그 앤 드롭, 카테고리 분류, 우선순위 설정 등의 기능이 부분적으로 구현되어 있습니다.",
    language: "TypeScript",
    stars: 12,
    forks: 3,
    lastUpdate: "2024-01-15",
    githubUrl: "https://github.com/example/react-todo-advanced",
    owner: "example",
    repo: "react-todo-advanced",
    score: 8,
    scoreBreakdown: {
      commits: 2,
      popularity: 1,
      documentation: 2,
      structure: 2,
      activity: 1,
      potential: 0,
    },
    scoreReasoning: [
      "적절한 커밋 수 (18개)",
      "기본적인 인기도 (12 stars)",
      "상세한 README 문서",
      "잘 구성된 프로젝트 구조",
      "최근 활동 있음",
    ],
    todos: [
      "드래그 앤 드롭 기능 완성",
      "로컬 스토리지 연동",
      "다크 모드 구현",
      "반응형 디자인 개선",
      "테스트 코드 작성",
    ],
    readmeSummary:
      "TypeScript로 개발된 웹 애플리케이션입니다. 현재 미완성 상태이며, React를 사용하여 구현되고 있습니다. 고급 기능을 포함한 React 기반 할일 관리 앱입니다...",
    license: "MIT",
    commits: 18,
    linesOfCode: 850,
    topics: ["react", "typescript", "todo-app"],
    categories: ["web-development", "prototype"],
    views: 0,
    defaultBranch: "main",
  },
  {
    id: "2",
    title: "Python Web Scraper Dashboard",
    description:
      "웹 스크래핑 결과를 시각화하는 대시보드입니다. Flask 백엔드와 Chart.js를 사용한 프론트엔드가 기본 구조로 구현되어 있습니다.",
    language: "Python",
    stars: 8,
    forks: 2,
    lastUpdate: "2023-12-20",
    githubUrl: "https://github.com/example/scraper-dashboard",
    owner: "example",
    repo: "scraper-dashboard",
    score: 7,
    scoreBreakdown: {
      commits: 1,
      popularity: 1,
      documentation: 1,
      structure: 2,
      activity: 1,
      potential: 1,
    },
    scoreReasoning: [
      "적절한 커밋 수 (12개)",
      "기본적인 인기도 (8 stars)",
      "상세한 README 문서",
      "잘 구성된 프로젝트 구조",
      "최근 활동 있음",
    ],
    todos: ["스케줄링 기능 추가", "데이터베이스 연동", "에러 핸들링 개선", "사용자 인증 구현"],
    readmeSummary:
      "Flask를 기반으로 한 웹 스크래핑 대시보드 프로젝트입니다. BeautifulSoup을 사용한 스크래핑 모듈과 기본적인 웹 인터페이스가 구현되어 있습니다.",
    license: "Apache 2.0",
    commits: 12,
    linesOfCode: 650,
    topics: ["python", "web-scraping", "flask"],
    categories: ["web-development", "data-science"],
    views: 0,
    defaultBranch: "main",
  },
  {
    id: "3",
    title: "Go Microservice API Gateway",
    description:
      "Go로 구현된 마이크로서비스 API 게이트웨이입니다. 라우팅, 로드 밸런싱, 인증 미들웨어의 기본 구조가 완성되어 있습니다.",
    language: "Go",
    stars: 25,
    forks: 7,
    lastUpdate: "2024-02-01",
    githubUrl: "https://github.com/example/go-api-gateway",
    owner: "example",
    repo: "go-api-gateway",
    score: 9,
    scoreBreakdown: {
      commits: 2,
      popularity: 2,
      documentation: 2,
      structure: 2,
      activity: 1,
      potential: 0,
    },
    scoreReasoning: [
      "적절한 커밋 수 (22개)",
      "높은 인기도 (25 stars)",
      "상세한 README 문서",
      "잘 구성된 프로젝트 구조",
      "최근 활동 있음",
    ],
    todos: ["레이트 리미팅 구현", "모니터링 대시보드 추가", "Docker 컨테이너화", "Kubernetes 배포 설정", "문서화 완성"],
    readmeSummary:
      "Gin 프레임워크를 사용한 고성능 API 게이트웨이입니다. 기본적인 프록시 기능과 JWT 인증, 로깅 미들웨어가 구현되어 있습니다.",
    license: "MIT",
    commits: 22,
    linesOfCode: 1200,
    topics: ["go", "microservice", "api-gateway"],
    categories: ["backend", "cloud"],
    views: 0,
    defaultBranch: "main",
  },
  {
    id: "4",
    title: "Vue.js E-commerce Frontend",
    description:
      "Vue 3와 Composition API를 사용한 이커머스 프론트엔드입니다. 상품 목록, 장바구니, 결제 페이지의 UI가 부분적으로 구현되어 있습니다.",
    language: "JavaScript",
    stars: 15,
    forks: 4,
    lastUpdate: "2024-01-08",
    githubUrl: "https://github.com/example/vue-ecommerce",
    owner: "example",
    repo: "vue-ecommerce",
    score: 7,
    scoreBreakdown: {
      commits: 1,
      popularity: 1,
      documentation: 1,
      structure: 2,
      activity: 1,
      potential: 1,
    },
    scoreReasoning: [
      "적절한 커밋 수 (16개)",
      "기본적인 인기도 (15 stars)",
      "상세한 README 문서",
      "잘 구성된 프로젝트 구조",
      "최근 활동 있음",
    ],
    todos: ["결제 시스템 연동", "사용자 프로필 페이지", "주문 내역 관리", "상품 검색 기능", "반응형 디자인 완성"],
    readmeSummary:
      "Vue 3와 Pinia를 사용한 현대적인 이커머스 애플리케이션입니다. Tailwind CSS로 스타일링되어 있으며, 기본적인 상품 관리와 장바구니 기능이 구현되어 있습니다.",
    license: "MIT",
    commits: 16,
    linesOfCode: 950,
    topics: ["vuejs", "ecommerce", "frontend"],
    categories: ["web-development"],
    views: 0,
    defaultBranch: "main",
  },
  {
    id: "5",
    title: "Rust CLI Tool for File Management",
    description: "Rust로 작성된 파일 관리 CLI 도구입니다. 파일 검색, 정리, 백업 기능의 기본 구조가 구현되어 있습니다.",
    language: "Rust",
    stars: 6,
    forks: 1,
    lastUpdate: "2023-11-30",
    githubUrl: "https://github.com/example/rust-file-manager",
    owner: "example",
    repo: "rust-file-manager",
    score: 6,
    scoreBreakdown: {
      commits: 1,
      popularity: 0,
      documentation: 1,
      structure: 2,
      activity: 1,
      potential: 0,
    },
    scoreReasoning: [
      "적절한 커밋 수 (14개)",
      "낮은 인기도 (6 stars)",
      "상세한 README 문서",
      "잘 구성된 프로젝트 구조",
      "최근 활동 없음",
    ],
    todos: ["병렬 처리 최적화", "설정 파일 지원", "진행률 표시", "에러 복구 기능", "크로스 플랫폼 테스트"],
    readmeSummary:
      "Clap을 사용한 명령줄 인터페이스와 Tokio를 활용한 비동기 파일 처리 기능이 구현되어 있습니다. 기본적인 파일 검색과 정리 기능이 작동합니다.",
    license: "BSD-3-Clause",
    commits: 14,
    linesOfCode: 750,
    topics: ["rust", "cli", "file-management"],
    categories: ["cli", "utility"],
    views: 0,
    defaultBranch: "main",
  },
  {
    id: "6",
    title: "Java Spring Boot Blog API",
    description:
      "Spring Boot로 구현된 블로그 REST API입니다. 게시글 CRUD, 댓글 시스템, JWT 인증의 기본 구조가 완성되어 있습니다.",
    language: "Java",
    stars: 20,
    forks: 6,
    lastUpdate: "2024-01-25",
    githubUrl: "https://github.com/example/spring-blog-api",
    owner: "example",
    repo: "spring-blog-api",
    score: 8,
    scoreBreakdown: {
      commits: 2,
      popularity: 1,
      documentation: 2,
      structure: 2,
      activity: 1,
      potential: 0,
    },
    scoreReasoning: [
      "적절한 커밋 수 (28개)",
      "기본적인 인기도 (20 stars)",
      "상세한 README 문서",
      "잘 구성된 프로젝트 구조",
      "최근 활동 있음",
    ],
    todos: ["파일 업로드 기능", "이메일 알림 시스템", "관리자 대시보드", "API 문서화 (Swagger)", "캐싱 구현"],
    readmeSummary:
      "Spring Boot, Spring Security, JPA를 사용한 RESTful API입니다. MySQL 데이터베이스 연동과 기본적인 인증/인가 시스템이 구현되어 있습니다.",
    license: "Apache 2.0",
    commits: 28,
    linesOfCode: 1400,
    topics: ["java", "spring-boot", "rest-api"],
    categories: ["backend"],
    views: 0,
    defaultBranch: "main",
  },
]

// Realtime Database에 초기 데이터를 추가하는 함수
export async function seedMockData() {
  try {
    const { firebaseServicePromise } = await import("./services/firebase-service")

    console.log("Adding mock projects to Realtime Database...")

    const firebaseService = await firebaseServicePromise;
    for (const project of mockProjects) {
      await firebaseService.saveProject(project)
      console.log(`Added project: ${project.title}`)
    }

    console.log("Mock data seeding completed!")
  } catch (error) {
    console.error("Failed to seed mock data:", error)
  }
}

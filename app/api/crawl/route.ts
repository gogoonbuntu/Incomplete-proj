import { NextRequest, NextResponse } from "next/server";
import { rtdb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const maxDuration = 300;

// ─── 2025-2026 트렌드 기반 큐레이션 검색 전략 ────────────────
// 현재 개발 트렌드를 반영한 카테고리별 검색으로 흥미롭고 잠재력 있는
// 미완성 프로젝트를 발견합니다. 매 호출마다 카테고리를 로테이션합니다.

interface SearchCategory {
  name: string;
  queries: string[];
}

// 1년 전 날짜 계산
function oneYearAgo(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().split("T")[0];
}

const PUSHED_RECENT = `pushed:>${oneYearAgo()}`;
const BASE_FILTER = `${PUSHED_RECENT} archived:false`;
const STARS = "stars:10..500";

// ── 트렌드 카테고리 정의 ──
const CATEGORIES: SearchCategory[] = [
  {
    name: "🤖 AI / LLM / GenAI",
    queries: [
      `${STARS} ${BASE_FILTER} topic:llm`,
      `${STARS} ${BASE_FILTER} topic:generative-ai`,
      `${STARS} ${BASE_FILTER} topic:langchain`,
      `${STARS} ${BASE_FILTER} topic:openai`,
      `${STARS} ${BASE_FILTER} "RAG" in:name,description language:Python`,
      `${STARS} ${BASE_FILTER} "agent" in:name,description topic:ai`,
      `${STARS} ${BASE_FILTER} "chatbot" in:name,description language:TypeScript`,
      `${STARS} ${BASE_FILTER} topic:stable-diffusion`,
      `${STARS} ${BASE_FILTER} topic:huggingface`,
      `${STARS} ${BASE_FILTER} "fine-tuning" in:name,description`,
    ],
  },
  {
    name: "🌐 풀스택 / 웹 프레임워크",
    queries: [
      `${STARS} ${BASE_FILTER} topic:nextjs`,
      `${STARS} ${BASE_FILTER} topic:nuxt`,
      `${STARS} ${BASE_FILTER} topic:svelte`,
      `${STARS} ${BASE_FILTER} topic:astro`,
      `${STARS} ${BASE_FILTER} topic:remix`,
      `${STARS} ${BASE_FILTER} topic:htmx`,
      `${STARS} ${BASE_FILTER} "dashboard" in:name,description topic:react`,
      `${STARS} ${BASE_FILTER} "admin-panel" in:name,description`,
      `${STARS} ${BASE_FILTER} topic:tailwindcss "template" in:name,description`,
      `${STARS} ${BASE_FILTER} topic:shadcn-ui`,
    ],
  },
  {
    name: "⚙️ Rust / Go / 시스템 프로그래밍",
    queries: [
      `${STARS} ${BASE_FILTER} language:Rust topic:cli`,
      `${STARS} ${BASE_FILTER} language:Rust "tool" in:name,description`,
      `${STARS} ${BASE_FILTER} language:Go topic:cli`,
      `${STARS} ${BASE_FILTER} language:Go "api" in:name,description`,
      `${STARS} ${BASE_FILTER} language:Rust topic:wasm`,
      `${STARS} ${BASE_FILTER} language:Zig`,
      `${STARS} ${BASE_FILTER} language:Go topic:grpc`,
      `${STARS} ${BASE_FILTER} language:Rust "parser" in:name,description`,
    ],
  },
  {
    name: "📱 모바일 / 크로스플랫폼",
    queries: [
      `${STARS} ${BASE_FILTER} topic:react-native`,
      `${STARS} ${BASE_FILTER} topic:flutter`,
      `${STARS} ${BASE_FILTER} topic:expo`,
      `${STARS} ${BASE_FILTER} language:Swift topic:ios`,
      `${STARS} ${BASE_FILTER} language:Kotlin topic:android`,
      `${STARS} ${BASE_FILTER} topic:tauri`,
      `${STARS} ${BASE_FILTER} topic:electron "app" in:name,description`,
    ],
  },
  {
    name: "🔗 Web3 / 블록체인 / 크립토",
    queries: [
      `${STARS} ${BASE_FILTER} topic:solidity`,
      `${STARS} ${BASE_FILTER} topic:web3`,
      `${STARS} ${BASE_FILTER} topic:ethereum "dapp" in:name,description`,
      `${STARS} ${BASE_FILTER} topic:defi`,
      `${STARS} ${BASE_FILTER} topic:nft`,
      `${STARS} ${BASE_FILTER} "smart-contract" in:name,description`,
    ],
  },
  {
    name: "🛠️ DevOps / 인프라 / CLI 도구",
    queries: [
      `${STARS} ${BASE_FILTER} topic:docker "tool" in:name,description`,
      `${STARS} ${BASE_FILTER} topic:kubernetes "operator" in:name,description`,
      `${STARS} ${BASE_FILTER} topic:terraform`,
      `${STARS} ${BASE_FILTER} topic:github-actions`,
      `${STARS} ${BASE_FILTER} "monitoring" in:name,description topic:devops`,
      `${STARS} ${BASE_FILTER} "automation" in:name,description language:Python`,
      `${STARS} ${BASE_FILTER} topic:cli language:TypeScript`,
    ],
  },
  {
    name: "🎮 게임 / 크리에이티브",
    queries: [
      `${STARS} ${BASE_FILTER} topic:game language:Rust`,
      `${STARS} ${BASE_FILTER} topic:godot`,
      `${STARS} ${BASE_FILTER} topic:unity "tool" in:name,description`,
      `${STARS} ${BASE_FILTER} topic:threejs`,
      `${STARS} ${BASE_FILTER} "pixel" in:name,description topic:game`,
      `${STARS} ${BASE_FILTER} topic:webgl`,
    ],
  },
  {
    name: "📊 데이터 / 시각화 / 분석",
    queries: [
      `${STARS} ${BASE_FILTER} topic:data-visualization`,
      `${STARS} ${BASE_FILTER} "analytics" in:name,description language:Python`,
      `${STARS} ${BASE_FILTER} topic:pandas "tool" in:name,description`,
      `${STARS} ${BASE_FILTER} topic:d3`,
      `${STARS} ${BASE_FILTER} "scraper" in:name,description language:Python`,
      `${STARS} ${BASE_FILTER} topic:etl`,
    ],
  },
];

// 매 호출마다 카테고리를 로테이션 (시간 기반)
function selectCategories(count: number): SearchCategory[] {
  // 현재 시각의 hour를 시드로 사용하여 카테고리를 로테이션
  const hour = new Date().getHours();
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const seed = dayOfYear * 24 + hour;

  // 시간에 따라 시작 인덱스를 변경
  const startIdx = seed % CATEGORIES.length;
  const selected: SearchCategory[] = [];

  for (let i = 0; i < count; i++) {
    selected.push(CATEGORIES[(startIdx + i) % CATEGORIES.length]);
  }

  return selected;
}

// 각 카테고리에서 쿼리를 랜덤 선택
function pickQueries(category: SearchCategory, count: number): string[] {
  const shuffled = [...category.queries].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

const SORT_OPTIONS = ["updated", "stars", ""] as const;

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  updated_at: string;
  created_at: string;
  topics: string[];
  license: { name: string } | null;
  default_branch: string;
  size: number;
  open_issues_count: number;
  has_wiki: boolean;
  has_issues: boolean;
}

async function searchGitHub(
  query: string,
  token: string,
  sort: string = "stars",
  page: number = 1
): Promise<GitHubRepo[]> {
  const searchQuery = encodeURIComponent(query);
  const sortParam = sort ? `&sort=${sort}` : "";
  const url = `https://api.github.com/search/repositories?q=${searchQuery}&page=${page}&per_page=30${sortParam}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      Authorization: `token ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error("GitHub API rate limit exceeded");
    }
    if (response.status === 422) {
      return []; // 잘못된 쿼리 → 빈 결과
    }
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const data = await response.json();
  return data.items || [];
}

// ── 고품질 스코어링 ──
function scoreProject(repo: GitHubRepo): { score: number; dominated: boolean; reasoning: string[] } {
  const reasoning: string[] = [];
  let score = 0;

  // ① 인기도 (0-2.5) — 스타와 포크 종합
  if (repo.stargazers_count >= 50) {
    score += 2.5;
    reasoning.push(`High popularity (⭐${repo.stargazers_count})`);
  } else if (repo.stargazers_count >= 20) {
    score += 2;
    reasoning.push(`Good popularity (⭐${repo.stargazers_count})`);
  } else if (repo.stargazers_count >= 10) {
    score += 1.5;
    reasoning.push(`Moderate popularity (⭐${repo.stargazers_count})`);
  } else {
    return { score: 0, dominated: true, reasoning: ["Too few stars"] };
  }

  if (repo.forks_count >= 5) {
    score += 0.5;
    reasoning.push(`Has forks (🍴${repo.forks_count})`);
  }

  // ② 프로젝트 실체 (0-2) — 크기로 실제 코드가 있는지 판단
  if (repo.size >= 200 && repo.size <= 50000) {
    score += 2;
    reasoning.push("Substantial codebase");
  } else if (repo.size >= 50) {
    score += 1;
    reasoning.push("Has some code");
  } else {
    reasoning.push("Very small project");
  }

  // ③ 최근 활동도 (0-2) — 1년 내 활동
  const monthsAgo =
    (Date.now() - new Date(repo.updated_at).getTime()) / (1000 * 60 * 60 * 24 * 30);
  if (monthsAgo <= 3) {
    score += 2;
    reasoning.push("Very recently active");
  } else if (monthsAgo <= 6) {
    score += 1.5;
    reasoning.push("Recently active");
  } else if (monthsAgo <= 12) {
    score += 1;
    reasoning.push("Active within the year");
  } else {
    score += 0.5;
    reasoning.push("Not recently active");
  }

  // ④ 프로젝트 성숙도 시그널 (0-2)
  let maturity = 0;
  if (repo.license) {
    maturity += 0.5;
    reasoning.push("Has license");
  }
  if (repo.open_issues_count > 0 && repo.open_issues_count <= 50) {
    maturity += 0.5;
    reasoning.push(`Has open issues (${repo.open_issues_count})`);
  }
  if (repo.topics && repo.topics.length >= 2) {
    maturity += 0.5;
    reasoning.push(`Has topics (${repo.topics.length})`);
  }
  if (repo.description && repo.description.length >= 30) {
    maturity += 0.5;
    reasoning.push("Has detailed description");
  }
  score += Math.min(2, maturity);

  // ⑤ 흥미도 보너스 (0-1.5) — 트렌디한 토픽
  const trendyTopics = new Set([
    "ai", "llm", "gpt", "openai", "langchain", "rag", "chatbot",
    "rust", "go", "typescript", "nextjs", "svelte", "astro",
    "web3", "blockchain", "defi",
    "cli", "devtools", "developer-tools",
    "react-native", "flutter", "tauri",
    "game", "threejs", "webgl",
    "docker", "kubernetes", "terraform",
  ]);
  const matchedTrends = (repo.topics || []).filter((t) => trendyTopics.has(t.toLowerCase()));
  if (matchedTrends.length >= 2) {
    score += 1.5;
    reasoning.push(`Trending topics: ${matchedTrends.join(", ")}`);
  } else if (matchedTrends.length === 1) {
    score += 0.75;
    reasoning.push(`Trending topic: ${matchedTrends[0]}`);
  }

  // 최종 스코어 (최대 ~10.5)
  const finalScore = Math.round(score * 10) / 10;

  return { score: finalScore, dominated: false, reasoning };
}

export async function GET(request: NextRequest) {
  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return NextResponse.json({ success: false, error: "GITHUB_TOKEN not configured" }, { status: 500 });
    }
    if (!rtdb) {
      return NextResponse.json({ success: false, error: "Firebase RTDB not initialized" }, { status: 500 });
    }

    console.log("🛰️ Trend-based crawl started...");

    // 기존 프로젝트 ID 수집
    const existingSnapshot = await rtdb.ref("projects").once("value");
    const existingIds = new Set<string>();
    if (existingSnapshot.exists()) {
      existingSnapshot.forEach((child) => {
        existingIds.add(child.key || "");
        return false;
      });
    }
    console.log(`📦 DB에 ${existingIds.size}개 프로젝트 존재`);

    // 이번 호출에서 사용할 카테고리 3개 선택 (로테이션)
    const selectedCategories = selectCategories(3);
    console.log(`🎯 선택된 카테고리: ${selectedCategories.map((c) => c.name).join(", ")}`);

    const allRepos: GitHubRepo[] = [];
    let totalQueries = 0;
    const categoryResults: Array<{ name: string; queries: number; found: number }> = [];

    for (const category of selectedCategories) {
      // 각 카테고리에서 2~3개 쿼리 랜덤 선택
      const queries = pickQueries(category, 3);
      let categoryFound = 0;

      for (const query of queries) {
        try {
          const sort = SORT_OPTIONS[totalQueries % SORT_OPTIONS.length];
          const page = (totalQueries % 3) + 1; // 1, 2, 3 로테이션
          console.log(`🔍 [${category.name}] page=${page} sort=${sort || "relevance"}`);
          console.log(`   ${query.substring(0, 80)}...`);

          const repos = await searchGitHub(query, token, sort, page);
          allRepos.push(...repos);
          categoryFound += repos.length;
          totalQueries++;

          console.log(`   ✓ ${repos.length}개 발견`);
          await new Promise((resolve) => setTimeout(resolve, 2500));
        } catch (error: any) {
          console.error(`   ❌ ${error.message}`);
          if (error.message.includes("rate limit")) break;
        }
      }

      categoryResults.push({
        name: category.name,
        queries: queries.length,
        found: categoryFound,
      });
    }

    // 중복 제거
    const uniqueRepos = allRepos.filter(
      (repo, index, self) => index === self.findIndex((r) => r.id === repo.id)
    );

    // DB에 없는 것만
    const newRepos = uniqueRepos.filter(
      (repo) => !existingIds.has(String(repo.id)) && repo.stargazers_count >= 10
    );

    console.log(`🌟 고유 ${uniqueRepos.length}개 중 신규 ${newRepos.length}개`);

    // 스코어링 + 품질 필터
    const scoredRepos = newRepos
      .map((repo) => ({
        repo,
        ...scoreProject(repo),
      }))
      .filter((r) => !r.dominated && r.score >= 6) // 최소 6점 이상만
      .sort((a, b) => b.score - a.score);

    console.log(`✅ 품질 기준(6점+) 통과: ${scoredRepos.length}개`);

    // 상위 20개만 저장
    const toSave = scoredRepos.slice(0, 20);
    const updates: Record<string, any> = {};

    for (const { repo, score, reasoning } of toSave) {
      const [owner, name] = repo.full_name.split("/");

      updates[`projects/${repo.id}`] = {
        id: String(repo.id),
        title: repo.name,
        description: repo.description || "No description available",
        language: repo.language || "Unknown",
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        lastUpdate: repo.updated_at,
        createdAt: repo.created_at,
        githubUrl: repo.html_url,
        owner,
        repo: name,
        score,
        scoreBreakdown: {
          commits: score > 8 ? 2 : 1,
          popularity: repo.stargazers_count >= 50 ? 2 : repo.stargazers_count >= 20 ? 1.5 : 1,
          documentation: 2,
          structure: repo.size > 200 ? 2 : 1,
          activity: 1,
          potential: 1,
        },
        scoreReasoning: reasoning,
        readmeSummary: repo.description || "",
        enhancedDescription: repo.description || "",
        todos: [],
        topics: repo.topics || [],
        categories: [],
        license: repo.license?.name || "",
        commits: 0,
        linesOfCode: Math.floor((repo.size || 0) * 0.1),
        views: 0,
        defaultBranch: repo.default_branch || "main",
        updatedAt: new Date().toISOString(),
        addedBy: "crawl-cron",
      };
    }

    if (Object.keys(updates).length > 0) {
      await rtdb.ref().update(updates);
    }

    const savedCount = Object.keys(updates).length;

    return NextResponse.json({
      success: true,
      message: `${savedCount}개의 고품질 프로젝트 저장 완료`,
      stats: {
        totalQueries,
        totalFound: uniqueRepos.length,
        newFound: newRepos.length,
        passedQuality: scoredRepos.length,
        saved: savedCount,
        existingInDB: existingIds.size,
        categories: categoryResults,
        topSaved: toSave.slice(0, 5).map((r) => ({
          name: r.repo.full_name,
          stars: r.repo.stargazers_count,
          score: r.score,
          language: r.repo.language,
          reasoning: r.reasoning.slice(0, 3),
        })),
      },
    });
  } catch (error: any) {
    console.error("❌ Crawling failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

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

// ── 언어별 다양성 보장 검색 전략 ──
// 핵심: 모든 쿼리에 language: 필터를 명시하여 다양한 언어 프로젝트를 균등 수집

// 언어 풀 (매 크롤링마다 여기서 골고루 선택)
const LANGUAGE_POOLS = {
  tier1: ["Python", "TypeScript", "Rust", "Go"],           // 트렌디
  tier2: ["Java", "Kotlin", "Swift", "C++", "C#"],         // 주류
  tier3: ["Ruby", "PHP", "Dart", "Scala", "Elixir"],       // 확장
  tier4: ["Lua", "Haskell", "Julia", "Zig", "Shell", "R"], // 니치
};

// 토픽 키워드 (언어 쿼리에 붙여 흥미도를 높임)
const TOPIC_MODIFIERS = [
  'topic:cli', 'topic:api', 'topic:tool', 'topic:framework',
  'topic:game', 'topic:bot', 'topic:ai', 'topic:devtools',
  '"dashboard" in:name,description', '"plugin" in:name,description',
  '"template" in:name,description', '"starter" in:name,description',
  'topic:automation', 'topic:web', 'topic:app',
  '"scraper" in:name,description', '"analyzer" in:name,description',
  'topic:docker', 'topic:database', 'topic:testing',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

// 매 크롤링마다 다양한 언어를 골고루 선택하여 쿼리 생성
function generateDiverseQueries(): Array<{ query: string; label: string }> {
  const queries: Array<{ query: string; label: string }> = [];

  // Tier별로 최소 1개씩 언어를 뽑아 최소 4개 언어를 보장
  const selectedLangs: string[] = [
    pick(LANGUAGE_POOLS.tier1),
    pick(LANGUAGE_POOLS.tier2),
    pick(LANGUAGE_POOLS.tier3),
    pick(LANGUAGE_POOLS.tier4),
  ];

  // 추가로 전체 풀에서 4개 더 뽑기 (중복 제거)
  const allLangs = shuffle([
    ...LANGUAGE_POOLS.tier1,
    ...LANGUAGE_POOLS.tier2,
    ...LANGUAGE_POOLS.tier3,
    ...LANGUAGE_POOLS.tier4,
  ]);
  for (const lang of allLangs) {
    if (selectedLangs.length >= 8) break;
    if (!selectedLangs.includes(lang)) selectedLangs.push(lang);
  }

  // 각 언어별로 1개 쿼리 생성 (총 8개)
  for (const lang of selectedLangs) {
    const topic = pick(TOPIC_MODIFIERS);
    const query = `${STARS} ${BASE_FILTER} language:${lang} ${topic}`;
    queries.push({ query, label: `${lang} / ${topic.substring(0, 20)}` });
  }

  // 보너스: 언어 무관 트렌드 토픽 2개 (다양성 + 흥미도)
  const trendQueries = shuffle([
    `${STARS} ${BASE_FILTER} topic:llm`,
    `${STARS} ${BASE_FILTER} topic:generative-ai`,
    `${STARS} ${BASE_FILTER} topic:langchain`,
    `${STARS} ${BASE_FILTER} topic:web3`,
    `${STARS} ${BASE_FILTER} topic:react-native language:TypeScript`,
    `${STARS} ${BASE_FILTER} topic:flutter language:Dart`,
    `${STARS} ${BASE_FILTER} topic:godot language:C#`,
    `${STARS} ${BASE_FILTER} topic:kubernetes language:Go`,
    `${STARS} ${BASE_FILTER} topic:machine-learning language:Python`,
    `${STARS} ${BASE_FILTER} topic:wasm language:Rust`,
  ]);
  queries.push({ query: trendQueries[0], label: "🔥 Trend 1" });
  queries.push({ query: trendQueries[1], label: "🔥 Trend 2" });

  return queries;
}

// 언어별 저장 cap (한 언어가 저장을 독점하지 않도록)
const MAX_PER_LANGUAGE = 4;

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
      "User-Agent": "IncompleteProj-Crawler",
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    if (response.status === 401) {
      throw new Error(`GitHub token invalid/expired (401): ${body.substring(0, 100)}`);
    }
    if (response.status === 403) {
      const remaining = response.headers.get("x-ratelimit-remaining");
      throw new Error(`GitHub rate limit (403), remaining: ${remaining}`);
    }
    if (response.status === 422) {
      console.warn(`⚠️ Query validation failed (422): ${body.substring(0, 100)}`);
      return [];
    }
    throw new Error(`GitHub API ${response.status}: ${body.substring(0, 100)}`);
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

    console.log("🛰️ Diversity-first crawl started...");

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

    // 다양한 언어를 보장하는 쿼리 생성 (8개 언어 + 2개 트렌드)
    const diverseQueries = generateDiverseQueries();
    console.log(`🎯 ${diverseQueries.length}개 쿼리 생성: ${diverseQueries.map((q) => q.label).join(", ")}`);

    const allRepos: GitHubRepo[] = [];
    let totalQueries = 0;
    const queryResults: Array<{ label: string; found: number; error?: string }> = [];

    for (const { query, label } of diverseQueries) {
      try {
        const sort = SORT_OPTIONS[totalQueries % SORT_OPTIONS.length];
        const page = (totalQueries % 3) + 1;
        console.log(`🔍 [${label}] page=${page} sort=${sort || "relevance"}`);

        const repos = await searchGitHub(query, token, sort, page);
        allRepos.push(...repos);
        queryResults.push({ label, found: repos.length });
        totalQueries++;

        console.log(`   ✓ ${repos.length}개 발견`);
        await new Promise((resolve) => setTimeout(resolve, 2500));
      } catch (error: any) {
        const errMsg = error.message || String(error);
        console.error(`   ❌ [${label}] ${errMsg}`);
        queryResults.push({ label, found: 0, error: errMsg });
        totalQueries++;
        if (errMsg.includes("rate limit") || errMsg.includes("401")) break;
      }
    }

    // 중복 제거
    const uniqueRepos = allRepos.filter(
      (repo, index, self) => index === self.findIndex((r) => r.id === repo.id)
    );

    // DB에 없는 것만 + 최소 스타 10
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
      .filter((r) => !r.dominated && r.score >= 6)
      .sort((a, b) => b.score - a.score);

    console.log(`✅ 품질 기준(6점+) 통과: ${scoredRepos.length}개`);

    // 언어별 cap 적용하여 다양성 보장
    const langSavedCount: Record<string, number> = {};
    const toSave: typeof scoredRepos = [];

    for (const item of scoredRepos) {
      const lang = item.repo.language || "Unknown";
      const currentCount = langSavedCount[lang] || 0;

      if (currentCount >= MAX_PER_LANGUAGE) {
        console.log(`   ⏭ ${lang} cap(${MAX_PER_LANGUAGE}) 도달, ${item.repo.full_name} 건너뜀`);
        continue;
      }

      langSavedCount[lang] = currentCount + 1;
      toSave.push(item);

      if (toSave.length >= 24) break; // 최대 24개
    }

    console.log(`🌈 언어 분포: ${Object.entries(langSavedCount).map(([l, c]) => `${l}:${c}`).join(", ")}`);
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
        languageDistribution: langSavedCount,
        queryResults,
        topSaved: toSave.slice(0, 8).map((r) => ({
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

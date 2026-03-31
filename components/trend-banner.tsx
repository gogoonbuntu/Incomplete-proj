"use client"

import { useMemo, useState, useEffect } from "react"
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import type { Project } from "@/types/project"
import { TrendingUp, Sparkles } from "lucide-react"

// ── 30가지 위트있는 트렌드 문구 ──
const TREND_MESSAGES: Array<(topLang: string, topTopic: string, count: number) => string> = [
  (l) => `요즘 개발자들, ${l} 없으면 불안한가 봐요 🫣`,
  (l) => `${l}이(가) 또 1등이네요. 독주 체제 확정! 🏆`,
  (l) => `${l} 프로젝트가 쏟아지고 있어요. 우연이 아닙니다 👀`,
  (_, t) => `'${t}' 토픽이 핫해요! 다들 뭔가 만들고 있군요 🔥`,
  (l) => `GitHub은 지금 ${l} 축제 중이에요 🎪`,
  (_, __, n) => `미완성 프로젝트 ${n}개를 발견했어요. 보물이 숨어있을지도? 💎`,
  (l) => `${l} 개발자 여러분, 당신의 언어가 트렌드입니다 📈`,
  (_, t) => `${t} 관련 프로젝트가 급증 중! 무슨 일이 일어나고 있는 거죠? 🤔`,
  (l) => `또 ${l}이에요? 이쯤 되면 국민 언어 아닌가요 🇰🇷`,
  (l) => `${l} 개발자가 이렇게 많았다니... 동료를 찾았다! 🤝`,
  (_, t) => `'${t}' 프로젝트를 안 만들면 뒤처지는 시대가 왔어요 ⚡`,
  (l) => `${l}, 오늘도 당당히 인기 차트 1위 🎵`,
  (_, __, n) => `${n}개의 프로젝트 중 당신의 다음 기여작은? 🎯`,
  (l) => `${l} 좀 식을 줄 알았는데... 아직 뜨겁네요! 🌶️`,
  (_, t) => `혹시 ${t} 프로젝트 안 만들어보셨나요? 지금이 적기! ⏰`,
  (l) => `이번 달의 MVP 언어는 단연 ${l}! 이견 없으시죠? 🙅‍♂️`,
  (_, t) => `${t}에 진심인 개발자들이 모였어요 💪`,
  (l) => `${l}의 인기가 심상치 않아요. 배워둘 때가 지금! 📚`,
  (_, __, n) => `${n}개의 미완성 우주선이 조종사를 기다리고 있어요 🚀`,
  (l) => `오늘의 트렌드: ${l}! 내일의 트렌드도 아마... ${l}! 🔮`,
  (_, t) => `${t} 생태계가 빠르게 성장하고 있어요 🌱`,
  (l) => `개발판에도 유행이 있다면, 지금은 ${l} 시대 👑`,
  (_, t) => `'${t}'를 검색하면 재미있는 프로젝트가 끝도 없이 나와요 🎰`,
  (l) => `${l}로 뭐 하나 만들어볼까... 하는 분들 많으시죠? 🛠️`,
  (_, __, n) => `이 ${n}개의 프로젝트, 작은 관심이 큰 변화를 만들어요 ✨`,
  (l) => `${l} 커뮤니티가 역대급으로 활발해요! 🎉`,
  (_, t) => `요즘 뜨는 키워드? 바로 '${t}'! 메모해두세요 📝`,
  (l) => `${l} 프로젝트 비율이 압도적이네요. 대세 인정! 👏`,
  (_, t) => `${t} 분야, 아이디어만 있으면 바로 시작할 수 있어요 🏁`,
  (l) => `${l} 하나면 세상 다 만들 수 있다는 걸 증명하는 중 🌍`,
]

// ── 차트 색상 팔레트 (사이버 테마) ──
const CHART_COLORS = [
  "#00f3ff", "#a855f7", "#f472b6", "#34d399",
  "#fbbf24", "#fb923c", "#60a5fa", "#e879f9",
  "#4ade80", "#f87171",
]

interface TrendBannerProps {
  projects: Project[]
}

export function TrendBanner({ projects }: TrendBannerProps) {
  const [chartType, setChartType] = useState<"pie" | "bar">("pie")

  // 마운트 시 랜덤 차트 타입 선택
  useEffect(() => {
    setChartType(Math.random() > 0.5 ? "pie" : "bar")
  }, [])

  const stats = useMemo(() => {
    if (!projects || projects.length === 0) return null

    // 언어별 통계
    const langCount: Record<string, number> = {}
    const topicCount: Record<string, number> = {}
    let totalStars = 0

    for (const p of projects) {
      const lang = p.language || "Unknown"
      langCount[lang] = (langCount[lang] || 0) + 1
      totalStars += p.stars || 0

      if (p.topics) {
        for (const t of p.topics) {
          topicCount[t] = (topicCount[t] || 0) + 1
        }
      }
    }

    // 상위 언어 (최대 8개)
    const topLangs = Object.entries(langCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value, percent: Math.round((value / projects.length) * 100) }))

    // 상위 토픽 (최대 8개)
    const topTopics = Object.entries(topicCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value, percent: Math.round((value / projects.length) * 100) }))

    const topLang = topLangs[0]?.name || "JavaScript"
    const topTopic = topTopics[0]?.name || "open-source"

    // 랜덤 문구 선택
    const msgIdx = Math.floor(Math.random() * TREND_MESSAGES.length)
    const message = TREND_MESSAGES[msgIdx](topLang, topTopic, projects.length)

    return {
      topLangs,
      topTopics,
      topLang,
      topTopic,
      totalStars,
      message,
      projectCount: projects.length,
    }
  }, [projects])

  if (!stats || projects.length < 3) return null

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900/95 backdrop-blur-md px-3 py-2 rounded-lg border border-cyan-500/30 shadow-lg">
          <p className="text-cyan-300 font-mono text-sm">
            {payload[0].name || payload[0].payload?.name}: <span className="text-white font-bold">{payload[0].value}개</span>
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="glass-panel rounded-2xl p-6 mb-8 relative overflow-hidden group">
      {/* 배경 그라데이션 효과 */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-cyan-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/5 rounded-full blur-3xl" />

      {/* 상단: 트렌드 문구 */}
      <div className="relative z-10 mb-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-mono text-cyan-400 tracking-wider uppercase">Live Trend</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[11px] font-mono text-purple-400">{stats.projectCount}개 분석</span>
          </div>
        </div>
        <p className="text-lg md:text-xl font-medium text-white/90 leading-relaxed">
          {stats.message}
        </p>
      </div>

      {/* 하단: 차트 (파이 or 바) */}
      <div className="relative z-10 flex flex-col md:flex-row gap-6">
        {/* 언어 차트 */}
        <div className="flex-1 min-h-[200px]">
          <h4 className="text-xs font-mono text-gray-400 mb-3 tracking-widest uppercase">
            🔤 Language Distribution
          </h4>
          <ResponsiveContainer width="100%" height={200}>
            {chartType === "pie" ? (
              <PieChart>
                <Pie
                  data={stats.topLangs}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="transparent"
                >
                  {stats.topLangs.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(value: string) => <span className="text-gray-300 text-xs font-mono">{value}</span>}
                  iconSize={8}
                />
              </PieChart>
            ) : (
              <BarChart data={stats.topLangs} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#9ca3af", fontSize: 10, fontFamily: "monospace" }}
                  axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#9ca3af", fontSize: 10, fontFamily: "monospace" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,243,255,0.05)" }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {stats.topLangs.map((_, index) => (
                    <Cell key={`bar-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* 토픽 차트 (토픽 데이터가 있을 때만) */}
        {stats.topTopics.length > 0 && (
          <div className="flex-1 min-h-[200px]">
            <h4 className="text-xs font-mono text-gray-400 mb-3 tracking-widest uppercase">
              🏷️ Top Topics
            </h4>
            <ResponsiveContainer width="100%" height={200}>
              {chartType === "bar" ? (
                <PieChart>
                  <Pie
                    data={stats.topTopics}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="transparent"
                  >
                    {stats.topTopics.map((_, index) => (
                      <Cell key={`tcell-${index}`} fill={CHART_COLORS[(index + 3) % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    formatter={(value: string) => <span className="text-gray-300 text-xs font-mono">{value}</span>}
                    iconSize={8}
                  />
                </PieChart>
              ) : (
                <BarChart data={stats.topTopics} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#9ca3af", fontSize: 10, fontFamily: "monospace" }}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    tickLine={false}
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    tick={{ fill: "#9ca3af", fontSize: 10, fontFamily: "monospace" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(168,85,247,0.05)" }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {stats.topTopics.map((_, index) => (
                      <Cell key={`tbar-${index}`} fill={CHART_COLORS[(index + 3) % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 하단 요약 수치 */}
      <div className="relative z-10 mt-4 flex gap-4 flex-wrap">
        <div className="px-3 py-1.5 rounded-lg bg-black/30 border border-white/5">
          <span className="text-[11px] text-gray-500 font-mono block">총 프로젝트</span>
          <span className="text-white font-bold text-sm">{stats.projectCount}개</span>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-black/30 border border-white/5">
          <span className="text-[11px] text-gray-500 font-mono block">총 스타</span>
          <span className="text-yellow-400 font-bold text-sm">⭐ {stats.totalStars.toLocaleString()}</span>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-black/30 border border-white/5">
          <span className="text-[11px] text-gray-500 font-mono block">인기 언어</span>
          <span className="text-cyan-400 font-bold text-sm">{stats.topLang}</span>
        </div>
        {stats.topTopics.length > 0 && (
          <div className="px-3 py-1.5 rounded-lg bg-black/30 border border-white/5">
            <span className="text-[11px] text-gray-500 font-mono block">인기 토픽</span>
            <span className="text-purple-400 font-bold text-sm">#{stats.topTopic}</span>
          </div>
        )}
      </div>
    </div>
  )
}

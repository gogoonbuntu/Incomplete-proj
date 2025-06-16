"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { FilterOptions, SortOption } from "@/types/project"

interface ProjectFilterProps {
  filters: FilterOptions
  onFiltersChange: (filters: FilterOptions) => void
  sortBy: SortOption
  onSortChange: (sort: SortOption) => void
}

export function ProjectFilter({ filters, onFiltersChange, sortBy, onSortChange }: ProjectFilterProps) {
  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    })
  }

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="space-y-2">
            <Label htmlFor="language">언어</Label>
            <Select value={filters.language} onValueChange={(value) => handleFilterChange("language", value)}>
              <SelectTrigger>
                <SelectValue placeholder="언어 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="JavaScript">JavaScript</SelectItem>
                <SelectItem value="TypeScript">TypeScript</SelectItem>
                <SelectItem value="Python">Python</SelectItem>
                <SelectItem value="Java">Java</SelectItem>
                <SelectItem value="Go">Go</SelectItem>
                <SelectItem value="Rust">Rust</SelectItem>
                <SelectItem value="C++">C++</SelectItem>
                <SelectItem value="C#">C#</SelectItem>
                <SelectItem value="PHP">PHP</SelectItem>
                <SelectItem value="Ruby">Ruby</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stars">스타 수</Label>
            <Select value={filters.stars} onValueChange={(value) => handleFilterChange("stars", value)}>
              <SelectTrigger>
                <SelectValue placeholder="스타 수" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="3-10">3-10개</SelectItem>
                <SelectItem value="10-30">10-30개</SelectItem>
                <SelectItem value="30-100">30-100개</SelectItem>
                <SelectItem value="100">100개 이상</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastUpdate">최근 업데이트</Label>
            <Select value={filters.lastUpdate} onValueChange={(value) => handleFilterChange("lastUpdate", value)}>
              <SelectTrigger>
                <SelectValue placeholder="업데이트 시기" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="1m">1개월 이내</SelectItem>
                <SelectItem value="3m">3개월 이내</SelectItem>
                <SelectItem value="6m">6개월 이내</SelectItem>
                <SelectItem value="1y">1년 이내</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="score">점수</Label>
            <Select value={filters.score} onValueChange={(value) => handleFilterChange("score", value)}>
              <SelectTrigger>
                <SelectValue placeholder="최소 점수" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="6">6점 이상</SelectItem>
                <SelectItem value="7">7점 이상</SelectItem>
                <SelectItem value="8">8점 이상</SelectItem>
                <SelectItem value="9">9점 이상</SelectItem>
                <SelectItem value="10">10점 이상</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sort">정렬</Label>
            <Select value={sortBy} onValueChange={(value) => onSortChange(value as SortOption)}>
              <SelectTrigger>
                <SelectValue placeholder="정렬 기준" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score">점수순</SelectItem>
                <SelectItem value="stars">스타순</SelectItem>
                <SelectItem value="updated">업데이트순</SelectItem>
                <SelectItem value="created">생성순</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

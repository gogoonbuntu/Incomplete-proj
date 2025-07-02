"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // 관리자 권한 확인
    const checkAdmin = async () => {
      if (!user) {
        router.push("/login?redirect=/admin")
        return
      }

      try {
        const response = await fetch("/api/admin/check", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ uid: user.uid }),
        })

        const data = await response.json()
        setIsAdmin(data.isAdmin)

        if (!data.isAdmin) {
          router.push("/")
        }
      } catch (error) {
        console.error("관리자 권한 확인 중 오류:", error)
        router.push("/")
      }
    }

    if (user) {
      checkAdmin()
    }
  }, [user, router])

  if (!user || !isAdmin) {
    return <div className="flex justify-center items-center h-screen">권한 확인 중...</div>
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>관리자 도구</CardTitle>
          <CardDescription>프로젝트 관리를 위한 관리자 도구입니다.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Button asChild>
            <Link href="/admin/description-updater">프로젝트 설명 업데이터</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

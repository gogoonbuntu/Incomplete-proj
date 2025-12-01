import { NextResponse } from "next/server"

import { listServerStatuses, restartServerById } from "@/lib/services/dev-server-manager"

export async function GET() {
  try {
    const statuses = await listServerStatuses()
    return NextResponse.json({ success: true, data: statuses })
  } catch (error) {
    console.error("Failed to fetch dev server statuses", error)
    return NextResponse.json(
      {
        success: false,
        error: "서버 상태를 가져오는 중 오류가 발생했습니다.",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { id, action } = body

    if (!id || action !== "restart") {
      return NextResponse.json(
        {
          success: false,
          error: "유효하지 않은 요청입니다.",
        },
        { status: 400 },
      )
    }

    const status = await restartServerById(id)

    return NextResponse.json({
      success: true,
      data: status,
      restartedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Failed to restart dev server", error)
    return NextResponse.json(
      {
        success: false,
        error: "서버 재시작 중 오류가 발생했습니다.",
      },
      { status: 500 },
    )
  }
}

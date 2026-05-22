import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

export async function POST(req: NextRequest) {
  try {
    const { skillName, goal, rootLabel } = await req.json()

    const result = await model.generateContentStream(
      `你是學習規劃專家，只回傳 JSON，不要其他文字。
技能：${skillName}（${rootLabel ?? ''}類別）
目標：${goal?.trim() || '提升至實用水準'}

生成完整學習計畫。里程碑 label 只寫精簡主題名稱，不加序號、不加「第X週」等時程資訊。
回傳格式：
{
  "milestones": [
    {"label": "主題名稱"},
    ...（共 5–6 個，由淺入深）
  ],
  "resources": [
    {"title": "資源名稱", "url": "https://實際連結"},
    ...（共 3–4 個）
  ]
}`
    )

    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of result.stream) {
          const text = chunk.text()
          if (text) controller.enqueue(new TextEncoder().encode(text))
        }
        controller.close()
      },
    })

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

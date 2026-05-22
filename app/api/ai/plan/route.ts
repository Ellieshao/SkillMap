import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

export async function POST(req: NextRequest) {
  try {
    const { skillName, goal, rootLabel } = await req.json()

    const result = await model.generateContent(
      `你是學習規劃專家，只回傳 JSON，不要其他文字、不要 markdown。
技能：${skillName}（${rootLabel ?? ''}類別）
目標：${goal?.trim() || '提升至實用水準'}

生成 5–6 個學習里程碑（label 只寫精簡主題名稱，不加序號或時程）以及 3–4 個學習資源。

回傳純 JSON，格式如下（直接填入真實內容，不要保留範例文字）：
{"milestones":[{"label":"里程碑主題"}],"resources":[{"title":"資源名稱","url":"https://連結"}]}`
    )

    const text = result.response.text()
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ milestones: [], resources: [] })

    try {
      const parsed = JSON.parse(match[0])
      return NextResponse.json(parsed)
    } catch {
      return NextResponse.json({ milestones: [], resources: [] })
    }
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

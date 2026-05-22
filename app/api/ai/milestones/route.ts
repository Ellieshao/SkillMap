import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

export async function POST(req: NextRequest) {
  try {
    const { skillName, goal, existingMilestones } = await req.json()
    const existing = existingMilestones?.length > 0
      ? existingMilestones.join('、')
      : '（尚無）'
    const goalText = goal?.trim() ? `\n學習目標：${goal}` : ''

    const prompt = `你是學習規劃顧問，只回傳 JSON，不要其他文字。
使用者正在學習「${skillName}」。${goalText}
已有里程碑：${existing}

推薦 4–5 個學習里程碑。每個里程碑只寫精簡主題名稱（10 字以內），不加序號、不加「第X週」等時程，需互補且不重複已有里程碑，依學習順序排列。
回傳格式：{"milestones": ["主題A", "主題B", "主題C", "主題D"]}`

    const result = await model.generateContent(prompt)
    const text   = result.response.text()
    const match  = text.match(/\{[\s\S]*\}/)
    return NextResponse.json(match ? JSON.parse(match[0]) : { milestones: [] })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

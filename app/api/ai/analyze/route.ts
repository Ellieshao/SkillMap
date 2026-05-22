import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

export async function POST(req: NextRequest) {
  try {
    const { skillName, goal, weeklyHours } = await req.json()

    const result = await model.generateContent(
      `你是學習顧問，只回傳 JSON，不要其他文字。
技能：${skillName}
目標：${goal}
每週投入：${weeklyHours || '未設定'} 小時

估算達成目標所需的總學習時數，並給一句實用建議。
回傳格式：{"estimatedHours": 數字, "tip": "一句話具體建議（20字以內）"}`
    )

    const text = result.response.text()
    const match = text.match(/\{[\s\S]*\}/)
    return NextResponse.json(match ? JSON.parse(match[0]) : {})
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

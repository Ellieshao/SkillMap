import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

export async function POST(req: NextRequest) {
  try {
    const { newSkill, existingSkills, rootLabel } = await req.json()
    const others = (existingSkills as string[]).filter(s => s !== newSkill)

    const result = await model.generateContent(
      `你是學習顧問，只回傳 JSON，不要其他文字。
使用者剛加入「${newSkill}」（${rootLabel}類別）。
目前還有：${others.length > 0 ? others.join('、') : '無其他技能'}

學了「${newSkill}」之後，最值得搭配的 3 個相關技能是？
回傳格式：{"related": ["技能1", "技能2", "技能3"], "reason": "一句話關聯說明（15字以內）"}`
    )

    const text = result.response.text()
    const match = text.match(/\{[\s\S]*\}/)
    return NextResponse.json(match ? JSON.parse(match[0]) : { related: [], reason: '' })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

export async function POST(req: NextRequest) {
  try {
    const { rootLabel, existingSkills, withChildren } = await req.json()

    const existing = existingSkills?.length > 0 ? existingSkills.join('、') : '（尚無）'

    const prompt = withChildren
      ? `你是技能學習規劃顧問，只回傳 JSON，不要其他文字。
使用者正在規劃「${rootLabel}」類別的技能。
已加入的技能：${existing}

推薦 5 個最適合的「下一步」技能，每個技能附帶 3–4 個子技能（具體可學項目）。
回傳格式：{"suggestions": [{"label": "技能A", "children": ["子技能1", "子技能2", "子技能3"]}, {"label": "技能B", "children": ["子技能1", "子技能2", "子技能3"]}, ...]}`
      : `你是技能學習規劃顧問，只回傳 JSON，不要其他文字。
使用者正在規劃「${rootLabel}」類別的技能。
已加入的技能：${existing}

根據已有技能，推薦 5 個最適合的「下一步」技能（互補、不重複、考慮學習順序）。
回傳格式：{"suggestions": ["技能A", "技能B", "技能C", "技能D", "技能E"]}`

    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const match = text.match(/\{[\s\S]*\}/)
    return NextResponse.json(match ? JSON.parse(match[0]) : { suggestions: [] })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

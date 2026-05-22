'use client'

import { Fragment, useState } from 'react'
import { SUGGESTIONS, Suggestion } from '@/data/suggestions'

interface Props {
  rootId: string
  rootColor: string
  /** 直接快速新增（不經輸入欄）。parentLabel = 所屬父分支名稱（子建議項才有） */
  onQuickAdd: (label: string, isAIRecommended: boolean, parentLabel?: string) => void
  /** 點名稱 → 填入上方輸入欄 */
  onFillInput: (label: string) => void
}

export default function SuggestionList({ rootId, rootColor, onQuickAdd, onFillInput }: Props) {
  const list = SUGGESTIONS[rootId] ?? []
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  if (list.length === 0) return null

  function toggle(label: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })
  }

  return (
    <ul className="space-y-0.5">
      {list.map(s => {
        const isExp = expanded.has(s.label)
        const hasChildren = (s.children?.length ?? 0) > 0

        return (
          <Fragment key={s.label}>
            {/* First-level row */}
            <li className="flex items-center gap-1 rounded-md hover:bg-white/5 group px-1 py-1 transition-colors">
              {/* Chevron */}
              <button
                type="button"
                onClick={() => hasChildren && toggle(s.label)}
                className="w-5 h-5 flex items-center justify-center flex-shrink-0 transition-colors"
                style={{ color: hasChildren ? '#64748b' : 'transparent', cursor: hasChildren ? 'pointer' : 'default' }}
                tabIndex={hasChildren ? 0 : -1}
                aria-label={isExp ? '收合' : '展開'}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path
                    d={isExp ? 'M2 3.5l3 3 3-3' : 'M3.5 2l3 3-3 3'}
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {/* Label */}
              <button
                type="button"
                onClick={() => onFillInput(s.label)}
                className="flex-1 text-left text-sm text-slate-300 hover:text-white transition-colors truncate"
              >
                {s.label}
              </button>

              {/* Quick-add */}
              <button
                type="button"
                onClick={() => onQuickAdd(s.label, false)}
                className="w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 hover:scale-110"
                style={{ color: rootColor, background: rootColor + '22' }}
                title={`快速新增「${s.label}」`}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M5 1.5v7M1.5 5h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
            </li>

            {/* Second-level (AI recommended) */}
            {isExp && s.children?.map(child => (
              <li
                key={child.label}
                className="flex items-center gap-1 rounded-md hover:bg-white/5 group pl-6 pr-1 py-1 transition-colors"
              >
                {/* Dot */}
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0 border"
                  style={{ borderColor: rootColor + 'aa' }}
                />

                {/* Label */}
                <button
                  type="button"
                  onClick={() => onFillInput(child.label)}
                  className="flex-1 text-left text-xs text-slate-400 hover:text-slate-200 transition-colors truncate"
                >
                  {child.label}
                </button>

                {/* Quick-add */}
                <button
                  type="button"
                  onClick={() => onQuickAdd(child.label, true, s.label)}
                  className="w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 hover:scale-110"
                  style={{ color: rootColor, background: rootColor + '22' }}
                  title={`快速新增「${child.label}」（AI 推薦）`}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M5 1.5v7M1.5 5h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </button>
              </li>
            ))}
          </Fragment>
        )
      })}
    </ul>
  )
}

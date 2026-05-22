'use client'

import { useState, useEffect, useRef, Fragment } from 'react'
import { SkillNode, Milestone, Resource } from '@/types/skill'
import SuggestionList from '@/components/SuggestionList'

interface Props {
  selectedCenter: SkillNode | null
  selectedRoot: SkillNode | null
  selectedBranch: SkillNode | null
  branchParent?: SkillNode | null   // 直接父節點（root 或 branch）
  rootBranches: SkillNode[]
  isOpen: boolean
  onClose: () => void
  onAddBranch: (label: string, hours: number, description: string, isAIRecommended?: boolean, parentBranchId?: string) => string
  onUpdateBranch: (nodeId: string, updates: Partial<SkillNode>) => void
  onUpdateCenter: (updates: Partial<SkillNode>) => void
  onBranchSelect: (node: SkillNode) => void
  onDeleteBranch: (nodeId: string) => void
}

export default function DetailPanel({
  selectedCenter,
  selectedRoot,
  selectedBranch,
  branchParent,
  rootBranches,
  isOpen,
  onClose,
  onAddBranch,
  onUpdateBranch,
  onUpdateCenter,
  onBranchSelect,
  onDeleteBranch,
}: Props) {
  const accentColor = selectedCenter?.color
    ?? (selectedBranch ?? selectedRoot)?.color
    ?? '#8b5cf6'

  return (
    <div
      className="flex-shrink-0 h-full overflow-hidden transition-all duration-300"
      style={{ width: isOpen ? 320 : 0, borderLeft: isOpen ? '1px solid #ffffff18' : 'none' }}
    >
      <div className="w-80 h-full flex flex-col" style={{ background: '#12122a' }}>

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: accentColor, minHeight: 36 }} />
            <div className="min-w-0">
              <h2 className="text-white font-semibold text-base leading-tight truncate">
                {selectedCenter
                  ? '自訂中心節點'
                  : selectedBranch
                    ? selectedBranch.label
                    : selectedRoot?.label}
              </h2>
              {selectedCenter && <span className="text-slate-500 text-xs">名稱與顏色</span>}
              {!selectedCenter && selectedBranch && branchParent && (
                <button
                  type="button"
                  onClick={() => onBranchSelect(branchParent)}
                  className="text-xs mt-0.5 hover:underline truncate block"
                  style={{ color: accentColor }}
                >
                  ← {branchParent.label}
                </button>
              )}
              {!selectedCenter && !selectedBranch && selectedRoot && (
                <span className="text-slate-500 text-xs">
                  {rootBranches.filter(b => b.parentId === selectedRoot.id).length} 個技能
                </span>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white transition-colors mt-0.5 ml-2 flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 pb-6">
          {selectedCenter
            ? <CenterEditor node={selectedCenter} onUpdate={onUpdateCenter} />
            : selectedBranch
              ? <BranchPlan
                  node={selectedBranch}
                  rootLabel={selectedRoot?.label ?? ''}
                  onUpdate={(u) => onUpdateBranch(selectedBranch.id, u)}
                />
              : selectedRoot
                ? <RootManager
                    root={selectedRoot}
                    branches={rootBranches}
                    onAddBranch={onAddBranch}
                    onBranchSelect={onBranchSelect}
                    onDeleteBranch={onDeleteBranch}
                  />
                : null
          }
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   Helpers
═══════════════════════════════════════════ */

/** Strip leading numbering / week info from AI-generated milestone labels */
function cleanMileLabel(label: string): string {
  return label
    .replace(/^[\d一二三四五六七八九十百]+[.、。:：\s]+/, '')  // "1. " / "一、"
    .replace(/^第[\d一二三四五六七八九十]+[週周步階段個][：:\s]*/u, '') // "第一週："
    .replace(/^里程碑[\d一二三四五六七八九十]+[：:\s]*/u, '')           // "里程碑1："
    .replace(/^【.*?】\s*/, '')                                         // 【標題】
    .trim()
}

/** Robustly extract first JSON object from text (handles markdown code blocks) */
function extractJSON(raw: string): string | null {
  const start = raw.indexOf('{')
  if (start === -1) return null
  let depth = 0
  for (let i = start; i < raw.length; i++) {
    if (raw[i] === '{') depth++
    else if (raw[i] === '}') { depth--; if (depth === 0) return raw.slice(start, i + 1) }
  }
  return null
}

/* ─── Calendar types & constants ─── */
type CalendarView = 'year' | 'month' | 'week' | 'day'

const CAL_MONTHS = ['一','二','三','四','五','六','七','八','九','十','十一','十二']
const CAL_DOWS   = ['日','一','二','三','四','五','六']
const TIME_BLOCKS: { key: string; label: string; range: string }[] = [
  { key: 'M', label: '早', range: '06–12' },
  { key: 'A', label: '午', range: '12–18' },
  { key: 'E', label: '晚', range: '18–21' },
]

function calFmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function hasAnyOnDay(sched: Set<string>, dateStr: string): boolean {
  if (sched.has(dateStr)) return true
  for (const s of sched) { if (s.startsWith(dateStr + ':')) return true }
  return false
}

function getMonthGrid(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1)
  const last  = new Date(year, month + 1, 0)
  const rows: (Date | null)[][] = []
  let week: (Date | null)[] = Array(first.getDay()).fill(null)
  for (let d = 1; d <= last.getDate(); d++) {
    week.push(new Date(year, month, d))
    if (week.length === 7) { rows.push(week); week = [] }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null)
    rows.push(week)
  }
  return rows
}

function getWeekDays(anchor: Date): Date[] {
  const start = new Date(anchor)
  start.setDate(start.getDate() - start.getDay())
  start.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

/* ─── CalNavBar ─── */
function CalNavBar({ title, onPrev, onNext }: { title: string; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <button type="button" onClick={onPrev}
        className="w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:text-white hover:bg-white/5 transition-colors">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M7.5 2.5L4 6l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <span className="text-xs text-slate-300 font-medium">{title}</span>
      <button type="button" onClick={onNext}
        className="w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:text-white hover:bg-white/5 transition-colors">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M4.5 2.5L8 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  )
}

/* ═══════════════════════════════════════════
   Resource Card
═══════════════════════════════════════════ */
function ResourceCard({ resource, color, onDelete }: {
  resource: Resource
  color?: string
  onDelete: () => void
}) {
  const [imgErr, setImgErr] = useState(false)
  const hostname = (() => {
    try { return resource.url ? new URL(resource.url).hostname : '' }
    catch { return '' }
  })()
  const c = color ?? '#8b5cf6'

  return (
    <div className="rounded-lg group relative" style={{ background: '#0a0a1e', border: '1px solid #ffffff12' }}>
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        {/* Favicon */}
        <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ background: c + '20' }}>
          {resource.url && !imgErr ? (
            <img
              src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
              alt="" width={20} height={20}
              className="rounded"
              onError={() => setImgErr(true)}
            />
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="3" width="12" height="10" rx="1.5" stroke={c + 'aa'} strokeWidth="1.2"/>
              <path d="M5 7h6M5 10h4" stroke={c + 'aa'} strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          )}
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          {resource.url ? (
            <a href={resource.url} target="_blank" rel="noreferrer"
              className="text-xs text-slate-200 hover:text-white font-medium block truncate transition-colors">
              {resource.title}
            </a>
          ) : (
            <span className="text-xs text-slate-300 font-medium block truncate">{resource.title}</span>
          )}
          {hostname && <div className="text-[10px] text-slate-600 truncate mt-0.5">{hostname}</div>}
        </div>
        {/* Delete */}
        <button type="button" onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all text-sm leading-none flex-shrink-0 ml-1">
          ×
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   Schedule Calendar
═══════════════════════════════════════════ */
function ScheduleCalendar({
  scheduledDates,
  onChange,
  color,
}: {
  scheduledDates: string[]
  onChange: (dates: string[]) => void
  color?: string
}) {
  const [view, setView]           = useState<CalendarView>('month')
  const [focusDate, setFocusDate] = useState(() => new Date())
  const c        = color ?? '#8b5cf6'
  const sched    = new Set(scheduledDates)
  const todayStr = calFmt(new Date())

  /* toggle single slot key */
  function toggle(key: string) {
    const next = new Set(sched)
    next.has(key) ? next.delete(key) : next.add(key)
    onChange([...next])
  }

  /* toggle a whole day — clears all sub-keys if any exist */
  function toggleDay(dateStr: string) {
    const next    = new Set(sched)
    const subKeys = [...next].filter(s => s.startsWith(dateStr + ':'))
    if (!next.has(dateStr) && subKeys.length === 0) {
      next.add(dateStr)
    } else {
      next.delete(dateStr)
      subKeys.forEach(k => next.delete(k))
    }
    onChange([...next])
  }

  function navYear(d: number)  { setFocusDate(p => { const n = new Date(p); n.setFullYear(n.getFullYear() + d); return n }) }
  function navMonth(d: number) { setFocusDate(p => { const n = new Date(p); n.setMonth(n.getMonth() + d); return n }) }
  function navWeek(d: number)  { setFocusDate(p => { const n = new Date(p); n.setDate(n.getDate() + d * 7); return n }) }
  function navDay(d: number)   { setFocusDate(p => { const n = new Date(p); n.setDate(n.getDate() + d); return n }) }

  /* ── Year ── */
  const renderYear = () => {
    const year = focusDate.getFullYear()
    return (
      <>
        <CalNavBar title={`${year} 年`} onPrev={() => navYear(-1)} onNext={() => navYear(1)} />
        <div className="grid grid-cols-3 gap-1.5 mt-3">
          {Array.from({ length: 12 }, (_, m) => {
            const prefix   = `${year}-${String(m+1).padStart(2,'0')}`
            const dayCount = new Set([...sched].filter(s => s.startsWith(prefix)).map(s => s.split(':')[0])).size
            return (
              <button key={m} type="button"
                onClick={() => { setFocusDate(new Date(year, m, 1)); setView('month') }}
                className="rounded-lg py-2.5 text-center transition-all hover:bg-white/5"
                style={{
                  border: `1px solid ${dayCount > 0 ? c + '55' : '#ffffff10'}`,
                  background: dayCount > 0 ? c + '10' : 'transparent',
                }}>
                <div className="text-xs font-medium" style={{ color: dayCount > 0 ? c : '#64748b' }}>
                  {CAL_MONTHS[m]}月
                </div>
                {dayCount > 0 && (
                  <div className="text-[10px] mt-0.5" style={{ color: c + 'aa' }}>{dayCount}天</div>
                )}
              </button>
            )
          })}
        </div>
      </>
    )
  }

  /* ── Month ── */
  const renderMonth = () => {
    const y    = focusDate.getFullYear()
    const m    = focusDate.getMonth()
    const grid = getMonthGrid(y, m)
    return (
      <>
        <CalNavBar title={`${y} 年 ${m+1} 月`} onPrev={() => navMonth(-1)} onNext={() => navMonth(1)} />
        <div className="mt-3">
          <div className="grid grid-cols-7 mb-1">
            {CAL_DOWS.map(d => (
              <div key={d} className="text-center text-[10px] text-slate-600 py-0.5">{d}</div>
            ))}
          </div>
          {grid.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7">
              {week.map((date, di) => {
                if (!date) return <div key={di} />
                const key    = calFmt(date)
                const active = hasAnyOnDay(sched, key)
                const isToday = key === todayStr
                return (
                  <button key={key} type="button" onClick={() => toggleDay(key)}
                    className="aspect-square flex items-center justify-center rounded-md text-xs transition-all hover:bg-white/10"
                    style={{
                      color:      active ? '#fff' : isToday ? c : '#94a3b8',
                      background: active ? c      : 'transparent',
                      outline:    isToday && !active ? `1px solid ${c}55` : 'none',
                      outlineOffset: -1,
                    }}>
                    {date.getDate()}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </>
    )
  }

  /* ── Week ── */
  const renderWeek = () => {
    const days  = getWeekDays(focusDate)
    const title = `${days[0].getMonth()+1}/${days[0].getDate()} – ${days[6].getMonth()+1}/${days[6].getDate()}`
    return (
      <>
        <CalNavBar title={title} onPrev={() => navWeek(-1)} onNext={() => navWeek(1)} />
        <div className="mt-3">
          {/* Day headers */}
          <div className="grid grid-cols-8 mb-1.5">
            <div />
            {days.map((d, i) => {
              const isToday = calFmt(d) === todayStr
              return (
                <div key={i} className="text-center">
                  <div className="text-[10px]"  style={{ color: isToday ? c : '#475569' }}>{CAL_DOWS[d.getDay()]}</div>
                  <div className="text-xs font-medium" style={{ color: isToday ? c : '#64748b' }}>{d.getDate()}</div>
                </div>
              )
            })}
          </div>
          {/* Time blocks */}
          {TIME_BLOCKS.map(block => (
            <div key={block.key} className="grid grid-cols-8 mb-1">
              <div className="flex flex-col items-center justify-center">
                <span className="text-[10px] font-medium" style={{ color: '#64748b' }}>{block.label}</span>
                <span className="text-[9px]"              style={{ color: '#334155' }}>{block.range}</span>
              </div>
              {days.map((d, i) => {
                const slotKey = `${calFmt(d)}:${block.key}`
                const active  = sched.has(slotKey)
                const isToday = calFmt(d) === todayStr
                return (
                  <button key={i} type="button" onClick={() => toggle(slotKey)}
                    className="mx-0.5 rounded transition-all hover:opacity-80"
                    style={{
                      height:     26,
                      background: active ? c + 'cc' : '#ffffff0a',
                      border: `1px solid ${active ? c + '88' : isToday ? c + '33' : '#ffffff08'}`,
                    }} />
                )
              })}
            </div>
          ))}
        </div>
      </>
    )
  }

  /* ── Day ── */
  const renderDay = () => {
    const key = calFmt(focusDate)
    const m   = focusDate.getMonth() + 1
    const d   = focusDate.getDate()
    return (
      <>
        <CalNavBar title={`${m} 月 ${d} 日`} onPrev={() => navDay(-1)} onNext={() => navDay(1)} />
        <div className="mt-2 space-y-0.5 max-h-52 overflow-y-auto">
          {Array.from({ length: 16 }, (_, i) => {
            const h       = i + 6
            const slotKey = `${key}:${String(h).padStart(2,'0')}`
            const active  = sched.has(slotKey)
            return (
              <button key={h} type="button" onClick={() => toggle(slotKey)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-all"
                style={{
                  background: active ? c + '22' : 'transparent',
                  border: `1px solid ${active ? c + '55' : '#ffffff08'}`,
                  color: active ? c : '#475569',
                }}>
                <span className="w-9 text-right font-mono text-[11px] flex-shrink-0">
                  {String(h).padStart(2,'0')}:00
                </span>
                <div className="flex-1 h-3 rounded-sm"
                  style={{ background: active ? c + '55' : '#ffffff0a' }} />
              </button>
            )
          })}
        </div>
      </>
    )
  }

  const uniqueDays = new Set([...sched].map(s => s.split(':')[0])).size

  return (
    <div>
      {/* View tabs */}
      <div className="flex gap-0.5 mb-3 p-0.5 rounded-lg" style={{ background: '#ffffff08' }}>
        {(['year', 'month', 'week', 'day'] as CalendarView[]).map(v => (
          <button key={v} type="button" onClick={() => setView(v)}
            className="flex-1 py-1 rounded-md text-xs font-medium transition-all"
            style={{
              background: view === v ? c + '33' : 'transparent',
              color:      view === v ? c        : '#475569',
            }}>
            {v === 'year' ? '年' : v === 'month' ? '月' : v === 'week' ? '週' : '日'}
          </button>
        ))}
      </div>

      {view === 'year'  && renderYear()}
      {view === 'month' && renderMonth()}
      {view === 'week'  && renderWeek()}
      {view === 'day'   && renderDay()}

      {uniqueDays > 0 && (
        <div className="flex items-center justify-between mt-3 pt-2"
          style={{ borderTop: '1px solid #ffffff10' }}>
          <span className="text-slate-600 text-xs">已排程</span>
          <span className="text-xs font-medium" style={{ color: c }}>
            {uniqueDays} 天 · {sched.size} 個時段
          </span>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════
   Branch Planning Editor
═══════════════════════════════════════════ */
function BranchPlan({
  node,
  rootLabel,
  onUpdate,
}: {
  node: SkillNode
  rootLabel: string
  onUpdate: (u: Partial<SkillNode>) => void
}) {
  const [goal,        setGoal]        = useState(node.goal ?? '')
  const [targetDate,  setTargetDate]  = useState(node.targetDate ?? '')
  const [newMile,     setNewMile]     = useState('')
  const [newRes,      setNewRes]      = useState({ title: '', url: '' })
  const [showResForm, setShowResForm] = useState(false)
  const mileInputRef = useRef<HTMLInputElement>(null)

  // AI states
  const [isGenerating, setIsGenerating] = useState(false)
  const [genError,     setGenError]     = useState('')

  // Milestone expand & AI suggest
  const [expandedMileId, setExpandedMileId] = useState<string | null>(null)
  const [isMileSugging,  setIsMileSugging]  = useState(false)
  const [mileSugs,       setMileSugs]       = useState<string[]>([])

  useEffect(() => {
    setGoal(node.goal ?? '')
    setTargetDate(node.targetDate ?? '')
    setNewMile('')
    setShowResForm(false)
    setGenError('')
    setExpandedMileId(null)
    setMileSugs([])
  }, [node.id])

  const milestones = node.milestones ?? []
  const progress   = milestones.length > 0
    ? Math.round((milestones.filter(m => m.done).length / milestones.length) * 100)
    : (node.progress ?? 0)

  /* ── AI: 生成完整計畫 ── */
  async function generatePlan() {
    setIsGenerating(true); setGenError('')
    try {
      const res = await fetch('/api/ai/plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillName: node.label, goal, rootLabel }),
      })
      const data = await res.json()
      if (!res.ok) {
        const raw = data.error ?? ''
        if (raw.includes('429') || raw.includes('quota') || raw.includes('Quota'))
          throw new Error('AI 請求次數已達上限，請稍後再試')
        throw new Error('生成失敗，請稍後再試')
      }
      const newMilestones: Milestone[] = (data.milestones ?? []).map(
        (m: { label: string }, i: number) => ({
          id: `ai-${Date.now()}-${i}`,
          label: cleanMileLabel(m.label),
          done: false,
        })
      )
      onUpdate({ milestones: newMilestones, resources: data.resources ?? [] })
    } catch (e) {
      setGenError(e instanceof Error ? e.message : String(e))
    } finally {
      setIsGenerating(false)
    }
  }

  /* ── milestone helpers ── */
  function toggleMilestone(id: string) {
    onUpdate({ milestones: milestones.map(m => m.id === id ? { ...m, done: !m.done } : m) })
  }
  function deleteMilestone(id: string) {
    onUpdate({ milestones: milestones.filter(m => m.id !== id) })
    setExpandedMileId(prev => prev === id ? null : prev)
  }
  function updateMilestoneDetail(id: string, detail: string) {
    onUpdate({ milestones: milestones.map(m => m.id === id ? { ...m, detail } : m) })
  }
  async function fetchMileSugs() {
    setIsMileSugging(true)
    try {
      const res  = await fetch('/api/ai/milestones', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillName: node.label,
          goal: node.goal,
          existingMilestones: milestones.map(m => m.label),
        }),
      })
      const data = await res.json()
      const existing = new Set(milestones.map(m => m.label.toLowerCase()))
      setMileSugs(
        (data.milestones ?? [])
          .map((s: string) => cleanMileLabel(s))
          .filter((s: string) => s && !existing.has(s.toLowerCase()))
      )
    } finally { setIsMileSugging(false) }
  }
  function addSugMilestone(label: string) {
    onUpdate({ milestones: [...milestones, { id: Date.now().toString(), label, done: false }] })
    setMileSugs(prev => prev.filter(s => s !== label))
  }
  function addMilestone() {
    if (!newMile.trim()) return
    onUpdate({ milestones: [...milestones, { id: Date.now().toString(), label: newMile.trim(), done: false }] })
    setNewMile('')
    setTimeout(() => mileInputRef.current?.focus(), 50)
  }
  function addResource() {
    if (!newRes.title.trim()) return
    onUpdate({ resources: [...(node.resources ?? []), { title: newRes.title.trim(), url: newRes.url.trim() }] })
    setNewRes({ title: '', url: '' }); setShowResForm(false)
  }
  function deleteResource(i: number) {
    onUpdate({ resources: (node.resources ?? []).filter((_, idx) => idx !== i) })
  }

  return (
    <div className="space-y-6 pt-1">

      {/* ── 1. 學習目標 ── */}
      <Section title="學習目標" color={node.color}>
        <textarea
          value={goal}
          onChange={e => setGoal(e.target.value)}
          onBlur={() => onUpdate({ goal })}
          placeholder="你想達到什麼程度？寫下具體目標…"
          rows={3}
          className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-slate-600 outline-none resize-none transition-all"
          style={{ background: '#0a0a1e', border: `1px solid ${goal ? (node.color ?? '#8b5cf6') + '66' : '#ffffff15'}` }}
        />
        <button
          type="button"
          onClick={generatePlan}
          disabled={isGenerating}
          className="mt-3 w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: (node.color ?? '#8b5cf6') + '22', border: `1px dashed ${node.color ?? '#8b5cf6'}88`, color: node.color ?? '#a78bfa' }}
        >
          {isGenerating
            ? <><Spinner color={node.color} /> AI 生成中…</>
            : (goal.trim() ? '✦ 根據目標生成學習計畫' : '✦ AI 一鍵生成學習計畫')}
        </button>
        {genError && <p className="text-red-400 text-xs mt-1">{genError}</p>}
      </Section>

      {/* ── 2. 學習里程碑 ── */}
      <Section title="學習里程碑" color={node.color}>
        {/* Progress bar */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#ffffff12' }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: node.color ?? '#8b5cf6' }} />
          </div>
          <span className="text-slate-400 text-xs flex-shrink-0 w-7 text-right">{progress}%</span>
        </div>

        {/* Milestone list */}
        {milestones.length > 0 && (
          <ul className="space-y-0.5 mb-3">
            {milestones.map(m => {
              const isExp = expandedMileId === m.id
              const c     = node.color ?? '#8b5cf6'
              return (
                <li key={m.id} className="group/mile">
                  {/* Row */}
                  <div className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-white/5 transition-colors">
                    {/* Checkbox */}
                    <button type="button" onClick={() => toggleMilestone(m.id)}
                      className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-all"
                      style={{ background: m.done ? c : 'transparent', borderColor: m.done ? c : '#ffffff30' }}>
                      {m.done && (
                        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                          <path d="M1.5 4.5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                    {/* Label — click to expand */}
                    <button type="button" onClick={() => setExpandedMileId(isExp ? null : m.id)}
                      className={`flex-1 text-left text-sm transition-colors ${m.done ? 'line-through text-slate-500' : 'text-slate-300 hover:text-white'}`}>
                      {m.label}
                    </button>
                    {/* Expand chevron */}
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="flex-shrink-0 transition-transform"
                      style={{ color: '#475569', transform: isExp ? 'rotate(90deg)' : 'rotate(0deg)' }}
                      onClick={() => setExpandedMileId(isExp ? null : m.id)}>
                      <path d="M3.5 2l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {/* Delete */}
                    <button type="button" onClick={() => deleteMilestone(m.id)}
                      className="opacity-0 group-hover/mile:opacity-100 text-slate-600 hover:text-red-400 transition-all text-xs px-0.5">
                      ×
                    </button>
                  </div>
                  {/* Detail panel */}
                  {isExp && (
                    <div className="pl-6 pr-1 pb-2 pt-1">
                      <textarea
                        value={m.detail ?? ''}
                        onChange={e => updateMilestoneDetail(m.id, e.target.value)}
                        placeholder="記錄詳細步驟、方法、參考資源…"
                        rows={3}
                        className="w-full px-2.5 py-2 rounded-lg text-xs text-slate-300 placeholder-slate-600 outline-none resize-none leading-relaxed"
                        style={{ background: '#0a0a1e', border: `1px solid ${(node.color ?? '#8b5cf6')}33` }}
                      />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {/* Add milestone */}
        <div className="flex gap-2">
          <input
            ref={mileInputRef}
            value={newMile}
            onChange={e => setNewMile(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); addMilestone() } }}
            placeholder="新增里程碑…"
            className="flex-1 px-2.5 py-1.5 rounded-lg text-xs text-white placeholder-slate-600 outline-none"
            style={{ background: '#0a0a1e', border: '1px solid #ffffff15' }}
          />
          <button type="button" onClick={addMilestone}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90"
            style={{ background: (node.color ?? '#8b5cf6') + '33', color: node.color ?? '#a78bfa' }}>
            + 新增
          </button>
        </div>

        {/* AI 推薦里程碑 */}
        <div className="mt-3">
          {mileSugs.length > 0 ? (
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs" style={{ color: (node.color ?? '#a78bfa') + 'aa' }}>✦ AI 推薦</span>
                <button type="button" onClick={fetchMileSugs} title="重新推薦"
                  className="text-slate-600 hover:text-slate-400 transition-colors text-xs">↻</button>
                <button type="button" onClick={() => setMileSugs([])}
                  className="text-slate-600 hover:text-slate-400 transition-colors text-xs ml-auto">×</button>
              </div>
              <ul className="space-y-0.5">
                {mileSugs.map(s => (
                  <li key={s} className="group/sug flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => addSugMilestone(s)}
                    style={{ border: '1px solid #ffffff08' }}>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 border"
                      style={{ borderColor: (node.color ?? '#8b5cf6') + '88' }} />
                    <span className="flex-1 text-xs text-slate-400 group-hover/sug:text-slate-200 transition-colors">{s}</span>
                    <span className="text-slate-600 group-hover/sug:text-white transition-colors text-xs font-medium">+</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <button type="button" onClick={fetchMileSugs} disabled={isMileSugging}
              className="flex items-center gap-1.5 text-xs transition-all hover:opacity-80 disabled:opacity-50"
              style={{ color: (node.color ?? '#a78bfa') + 'bb' }}>
              {isMileSugging
                ? <><Spinner color={node.color} size={10} /> AI 推薦中…</>
                : '✦ AI 推薦里程碑'}
            </button>
          )}
        </div>
      </Section>

      {/* ── 3. 時間規劃 ── */}
      <Section title="時間規劃" color={node.color}>
        <div className="mb-3">
          <label className="block text-slate-500 text-xs mb-1">目標完成日</label>
          <input
            type="date"
            value={targetDate}
            onChange={e => { setTargetDate(e.target.value); onUpdate({ targetDate: e.target.value }) }}
            className="w-full px-2 py-1.5 rounded-lg text-xs text-white outline-none"
            style={{ background: '#0a0a1e', border: '1px solid #ffffff15', colorScheme: 'dark' }}
          />
        </div>
        <ScheduleCalendar
          key={node.id}
          scheduledDates={node.scheduledDates ?? []}
          onChange={dates => onUpdate({ scheduledDates: dates })}
          color={node.color}
        />
      </Section>

      {/* ── 4. 學習資源 ── */}
      <Section title="學習資源" color={node.color}>
        {(node.resources ?? []).length > 0 && (
          <div className="space-y-2 mb-3">
            {(node.resources ?? []).map((r, i) => (
              <ResourceCard
                key={i}
                resource={r}
                color={node.color}
                onDelete={() => deleteResource(i)}
              />
            ))}
          </div>
        )}
        {showResForm ? (
          <div className="space-y-2">
            <input
              value={newRes.title}
              onChange={e => setNewRes(v => ({ ...v, title: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation() } }}
              placeholder="資源名稱 *"
              className="w-full px-2.5 py-1.5 rounded-lg text-xs text-white placeholder-slate-600 outline-none"
              style={{ background: '#0a0a1e', border: '1px solid #ffffff15' }}
            />
            <input
              value={newRes.url}
              onChange={e => setNewRes(v => ({ ...v, url: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation() } }}
              placeholder="連結（選填）"
              className="w-full px-2.5 py-1.5 rounded-lg text-xs text-white placeholder-slate-600 outline-none"
              style={{ background: '#0a0a1e', border: '1px solid #ffffff15' }}
            />
            <div className="flex gap-2">
              <button type="button" onClick={addResource}
                className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90"
                style={{ background: node.color ?? '#8b5cf6', color: '#fff' }}>
                新增
              </button>
              <button type="button" onClick={() => { setShowResForm(false); setNewRes({ title: '', url: '' }) }}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white transition-colors"
                style={{ background: '#ffffff10' }}>
                取消
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setShowResForm(true)}
            className="text-xs transition-colors hover:opacity-90"
            style={{ color: node.color ?? '#a78bfa' }}>
            + 新增資源
          </button>
        )}
      </Section>

    </div>
  )
}

/* ═══════════════════════════════════════════
   Center Node Editor
═══════════════════════════════════════════ */
const COLOR_PRESETS = [
  { label: '紫', hex: '#7c3aed' }, { label: '靛', hex: '#4f46e5' },
  { label: '藍', hex: '#2563eb' }, { label: '青', hex: '#0891b2' },
  { label: '綠', hex: '#059669' }, { label: '琥珀', hex: '#d97706' },
  { label: '橘', hex: '#ea580c' }, { label: '紅', hex: '#dc2626' },
  { label: '粉', hex: '#db2777' }, { label: '灰', hex: '#475569' },
]

function CenterEditor({ node, onUpdate }: { node: SkillNode; onUpdate: (u: Partial<SkillNode>) => void }) {
  const [label, setLabel] = useState(node.label)
  useEffect(() => { setLabel(node.label) }, [node.label])
  const currentColor = node.color ?? '#475569'
  const isPreset = COLOR_PRESETS.some(p => p.hex === currentColor)

  return (
    <div className="space-y-6 pt-1">
      <Section title="顯示名稱" color={currentColor}>
        <div className="relative">
          <input
            value={label}
            onChange={e => { const v = e.target.value.slice(0, 8); setLabel(v); onUpdate({ label: v || '我' }) }}
            placeholder="我" maxLength={8}
            className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-slate-600 outline-none text-center font-semibold"
            style={{ background: '#0a0a1e', border: `1px solid ${currentColor}88`, fontSize: 16 }}
          />
          <span className="absolute right-2.5 bottom-2 text-slate-600 text-xs">{label.length}/8</span>
        </div>
        <div className="flex justify-center mt-3">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-white shadow-lg"
            style={{ background: currentColor, fontSize: Math.max(10, 18 - label.length * 1.5) }}
          >
            {label || '我'}
          </div>
        </div>
      </Section>

      <Section title="節點顏色" color={currentColor}>
        <div className="grid grid-cols-5 gap-2 mb-3">
          {COLOR_PRESETS.map(p => (
            <button key={p.hex} type="button" onClick={() => onUpdate({ color: p.hex })} title={p.label}
              className="w-full aspect-square rounded-full transition-all hover:scale-110 flex items-center justify-center"
              style={{ background: p.hex, outline: currentColor === p.hex ? `2px solid #fff` : '2px solid transparent', outlineOffset: 2 }}>
              {currentColor === p.hex && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2.5 2.5 3.5-4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-slate-400 text-xs">自訂顏色</span>
          <label className="relative cursor-pointer">
            <input type="color" value={currentColor} onChange={e => onUpdate({ color: e.target.value })} className="sr-only" />
            <span className="block w-8 h-8 rounded-full border-2 transition-all hover:scale-110"
              style={{ background: currentColor, borderColor: !isPreset ? '#fff' : '#ffffff44' }} />
          </label>
          {!isPreset && <span className="text-xs font-mono" style={{ color: currentColor }}>{currentColor}</span>}
        </div>
      </Section>
    </div>
  )
}

/* ═══════════════════════════════════════════
   Root Manager
═══════════════════════════════════════════ */
function RootManager({
  root,
  branches,
  onAddBranch,
  onBranchSelect,
  onDeleteBranch,
}: {
  root: SkillNode
  branches: SkillNode[]
  onAddBranch: (label: string, hours: number, description: string, isAIRecommended?: boolean, parentBranchId?: string) => string
  onBranchSelect: (node: SkillNode) => void
  onDeleteBranch: (nodeId: string) => void
}) {
  const [label,    setLabel]    = useState('')
  const [labelErr, setLabelErr] = useState('')

  // 多展開：每個分支獨立收合，互不影響
  const [expandedIds,         setExpandedIds]         = useState<Set<string>>(new Set())
  // 輸入目標：目前輸入欄針對哪個子技能父節點
  const [selectedSubParentId, setSelectedSubParentId] = useState<string | null>(null)
  const selectedSubParent = branches.find(b => b.id === selectedSubParentId) ?? null

  // 各分支的 AI 推薦子技能（按需自動載入，快取）
  const [subSugs,    setSubSugs]    = useState<Record<string, string[]>>({})
  const [subLoading, setSubLoading] = useState<Record<string, boolean>>({})

  // 根節點層級 AI 推薦技能
  const [aiSuggestions,    setAiSuggestions]    = useState<{ label: string; children: string[] }[]>([])
  const [expandedAiSug,    setExpandedAiSug]    = useState<Set<string>>(new Set())
  const [isSuggestLoading, setIsSuggestLoading] = useState(false)
  const [relateResult,     setRelateResult]     = useState<{ related: string[]; reason: string } | null>(null)
  const [lastAdded,        setLastAdded]        = useState('')

  const firstLevel = branches.filter(b => b.parentId === root.id)

  /* ── AI 根節點推薦 ── */
  async function fetchAiSuggestions() {
    setIsSuggestLoading(true); setAiSuggestions([]); setExpandedAiSug(new Set())
    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rootLabel: root.label, existingSkills: firstLevel.map(b => b.label), withChildren: true }),
      })
      const data = await res.json()
      setAiSuggestions(data.suggestions ?? [])
    } finally { setIsSuggestLoading(false) }
  }

  /* ── AI 子技能推薦（按分支自動載入，快取） ── */
  async function fetchSubSugs(branchId: string, branchLabel: string, existingLabels: string[]) {
    setSubLoading(prev => ({ ...prev, [branchId]: true }))
    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rootLabel: branchLabel, existingSkills: existingLabels }),
      })
      const data = await res.json()
      setSubSugs(prev => ({ ...prev, [branchId]: data.suggestions ?? [] }))
    } catch {
      setSubSugs(prev => ({ ...prev, [branchId]: [] }))
    } finally {
      setSubLoading(prev => ({ ...prev, [branchId]: false }))
    }
  }

  /* ── AI 關聯推薦 ── */
  async function fetchRelate(newSkill: string) {
    try {
      const res = await fetch('/api/ai/relate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newSkill, existingSkills: [...firstLevel.map(b => b.label), newSkill], rootLabel: root.label }),
      })
      const data = await res.json()
      if (data.related?.length > 0) { setRelateResult(data); setLastAdded(newSkill) }
    } catch { /* silent */ }
  }

  /* ── 展開 / 收合 / 選取邏輯 ──
     • 未展開 → 展開 + 設為輸入目標 + 自動抓 AI 子技能
     • 已展開 & 已選取 → 收合 + 取消輸入目標
     • 已展開 & 未選取 → 切換輸入目標（不收合）
  */
  function toggleBranch(b: SkillNode) {
    const isExp = expandedIds.has(b.id)
    const isSel = selectedSubParentId === b.id
    if (!isExp) {
      setExpandedIds(prev => new Set([...prev, b.id]))
      setSelectedSubParentId(b.id)
      setLabel(''); setLabelErr('')
    } else if (isSel) {
      setExpandedIds(prev => { const next = new Set(prev); next.delete(b.id); return next })
      setSelectedSubParentId(null)
      setLabel(''); setLabelErr('')
    } else {
      setSelectedSubParentId(b.id)
      setLabel(''); setLabelErr('')
    }
  }

  function clearSubParent() {
    setSelectedSubParentId(null); setLabel(''); setLabelErr('')
  }

  function doAdd() {
    if (!label.trim()) { setLabelErr('請輸入名稱'); return }
    const trimmed      = label.trim()
    const trimmedLower = trimmed.toLowerCase()

    if (selectedSubParent) {
      const subList = branches.filter(s => s.parentId === selectedSubParent.id)
      if (subList.some(s => s.label.toLowerCase() === trimmedLower)) {
        setLabelErr('此子技能已存在'); return
      }
      onAddBranch(trimmed, 0, '', false, selectedSubParent.id)
      setLabel(''); setLabelErr('')
      setSubSugs(prev => ({
        ...prev,
        [selectedSubParent.id]: (prev[selectedSubParent.id] ?? []).filter(s => s !== trimmed),
      }))
    } else {
      if (firstLevel.some(b => b.label.toLowerCase() === trimmedLower)) {
        setLabelErr('此技能已存在'); return
      }
      onAddBranch(trimmed, 0, '')
      fetchRelate(trimmed)
      setLabel(''); setLabelErr('')
      setRelateResult(null)
    }
  }

  // AI sub-skill data for whichever branch is currently selected as sub-parent
  const subAiPid      = selectedSubParent?.id ?? ''
  const subAiLabel    = selectedSubParent?.label ?? ''
  const subAiExisting = selectedSubParent
    ? branches.filter(s => s.parentId === selectedSubParent.id).map(s => s.label)
    : []
  const subAiSugs     = selectedSubParent
    ? (subSugs[selectedSubParent.id] ?? []).filter(s => !subAiExisting.includes(s))
    : []
  const subAiLoading  = selectedSubParent ? (subLoading[selectedSubParent.id] ?? false) : false
  const subAiHasCache = selectedSubParent ? selectedSubParent.id in subSugs : false

  function handleAdd(e: React.FormEvent) { e.preventDefault(); doAdd() }

  function handleQuickAdd(text: string, isAI: boolean, parentLabel?: string) {
    const textLower = text.toLowerCase()
    if (parentLabel) {
      const existingParent = branches.find(b => b.label === parentLabel)
      if (!existingParent) {
        const parentId = onAddBranch(parentLabel, 0, '', false) || undefined
        onAddBranch(text, 0, '', isAI, parentId)
      } else {
        const subList = branches.filter(s => s.parentId === existingParent.id)
        if (!subList.some(s => s.label.toLowerCase() === textLower)) {
          onAddBranch(text, 0, '', isAI, existingParent.id)
        }
      }
    } else {
      if (!firstLevel.some(b => b.label.toLowerCase() === textLower)) {
        onAddBranch(text, 0, '', isAI)
      }
    }
  }

  return (
    <div className="space-y-5 pt-1">

      {/* ── 我的技能 + 輸入 ── */}
      <div>
        {firstLevel.length > 0 && (
          <>
            <h3 className="text-slate-400 text-xs uppercase tracking-wider mb-2">我的技能</h3>
            <ul className="space-y-0.5 mb-3">
              {firstLevel.map(b => {
                const isExp   = expandedIds.has(b.id)
                const isSel   = selectedSubParentId === b.id
                const subList = branches.filter(s => s.parentId === b.id)

                return (
                  <Fragment key={b.id}>
                    {/* ── 第一層技能行 ── */}
                    <li className="flex items-center gap-0.5 group">
                      <button
                        type="button"
                        onClick={() => toggleBranch(b)}
                        className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left transition-all"
                        style={{
                          background: isSel
                            ? (root.color ?? '#8b5cf6') + '18'
                            : isExp ? '#ffffff08' : 'transparent',
                          border: `1px solid ${isSel ? (root.color ?? '#8b5cf6') + '44' : 'transparent'}`,
                        }}
                      >
                        {/* 展開箭頭 */}
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
                          style={{
                            flexShrink: 0,
                            transform: isExp ? 'rotate(90deg)' : 'rotate(0deg)',
                            transition: 'transform 150ms',
                            color: isExp ? (root.color ?? '#a78bfa') : '#475569',
                          }}>
                          <path d="M3.5 2l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: root.color }} />
                        <span className={`flex-1 truncate ${isSel ? 'text-white' : 'text-slate-200'}`}>{b.label}</span>
                        {b.hours > 0 && <span className="text-slate-500 text-xs flex-shrink-0">{b.hours}h</span>}
                        {subList.length > 0 && !isExp && (
                          <span className="text-slate-600 text-xs flex-shrink-0">{subList.length}</span>
                        )}
                      </button>
                      <DeleteBtn onClick={() => onDeleteBranch(b.id)} title="刪除此技能（連同子技能）" />
                      <NavBtn onClick={() => onBranchSelect(b)} />
                    </li>

                    {/* ── 展開內容 ── */}
                    {isExp && (
                      <>
                        {subList.map(sub => (
                          <li key={sub.id} className="flex items-center gap-0.5 pl-5 group">
                            <button type="button" onClick={() => onBranchSelect(sub)}
                              className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-left hover:bg-white/5 transition-colors">
                              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 border" style={{ borderColor: root.color + 'aa' }} />
                              <span className="text-slate-300 flex-1 truncate">{sub.label}</span>
                              {sub.hours > 0 && <span className="text-slate-600 text-xs">{sub.hours}h</span>}
                            </button>
                            <DeleteBtn onClick={() => onDeleteBranch(sub.id)} title="刪除此子技能" />
                            <NavBtn onClick={() => onBranchSelect(sub)} />
                          </li>
                        ))}
                      </>
                    )}
                  </Fragment>
                )
              })}
            </ul>
          </>
        )}

        {/* 子技能父節點提示 */}
        {selectedSubParent && (
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs mb-2"
            style={{ background: (root.color ?? '#8b5cf6') + '15', border: `1px solid ${root.color ?? '#8b5cf6'}33` }}>
            <span style={{ color: root.color }}>↳</span>
            <span className="text-slate-300 flex-1 truncate">
              新增「<strong style={{ color: root.color }}>{selectedSubParent.label}</strong>」的子技能
            </span>
            <button type="button" onClick={clearSubParent}
              className="text-slate-500 hover:text-slate-300 transition-colors">×</button>
          </div>
        )}

        {firstLevel.length === 0 && (
          <h3 className="text-slate-400 text-xs uppercase tracking-wider mb-2">新增你的第一個技能</h3>
        )}

        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            value={label}
            onChange={e => { setLabel(e.target.value); setLabelErr('') }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); doAdd() } }}
            placeholder={
              selectedSubParent
                ? `${selectedSubParent.label}的子技能…`
                : firstLevel.length === 0 ? '新增第一個技能…' : '新增技能…'
            }
            className="flex-1 px-3 py-2 rounded-lg text-sm text-white placeholder-slate-600 outline-none transition-all"
            style={{
              background: '#0a0a1e',
              border: `1px solid ${labelErr ? '#ef4444' : label ? (root.color ?? '#8b5cf6') + '88' : '#ffffff18'}`,
            }}
          />
          <button type="submit"
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95 flex-shrink-0"
            style={{ background: selectedSubParent ? (root.color ?? '#8b5cf6') + 'bb' : root.color }}>
            新增
          </button>
        </form>
        {labelErr && <p className="text-red-400 text-xs mt-1">{labelErr}</p>}

        {/* ── AI 子技能推薦（僅在新增子技能時顯示） ── */}
        {selectedSubParent && (
          <div className="mt-2 space-y-1">
            {subAiLoading && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-1 px-1">
                <Spinner color={root.color} size={10} /> AI 推薦中…
              </div>
            )}
            {!subAiLoading && !subAiHasCache && (
              <button type="button" onClick={() => fetchSubSugs(subAiPid, subAiLabel, subAiExisting)}
                className="text-xs flex items-center gap-1 transition-all hover:opacity-90 pt-1 px-1"
                style={{ color: (root.color ?? '#a78bfa') + 'bb' }}>
                ✦ AI 推薦子技能
              </button>
            )}
            {!subAiLoading && subAiHasCache && subAiSugs.length > 0 && (
              <>
                <div className="flex items-center gap-1.5 px-1 pt-1">
                  <span className="text-xs" style={{ color: (root.color ?? '#a78bfa') + 'aa' }}>✦ AI 推薦</span>
                  <button type="button" onClick={() => fetchSubSugs(subAiPid, subAiLabel, subAiExisting)}
                    className="text-slate-600 hover:text-slate-400 transition-colors text-xs" title="重新推薦">↻</button>
                </div>
                <ul className="space-y-0.5">
                  {subAiSugs.map(s => (
                    <li key={s} className="flex items-center gap-0.5 group">
                      <button type="button" onClick={() => { setLabel(s); setLabelErr('') }}
                        className="flex-1 flex items-center gap-2 px-2 py-1 rounded-lg text-xs text-left hover:bg-white/5 transition-colors">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 border" style={{ borderColor: (root.color ?? '#8b5cf6') + 'aa' }} />
                        <span className="text-slate-400 flex-1 truncate hover:text-slate-200 transition-colors">{s}</span>
                      </button>
                      <button type="button"
                        onClick={() => {
                          onAddBranch(s, 0, '', true, subAiPid)
                          setSubSugs(prev => ({ ...prev, [subAiPid]: (prev[subAiPid] ?? []).filter(x => x !== s) }))
                        }}
                        className="w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 hover:scale-110"
                        style={{ color: root.color, background: (root.color ?? '#8b5cf6') + '22' }}
                        title={`直接新增「${s}」`}>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M5 1.5v7M1.5 5h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {!subAiLoading && subAiHasCache && subAiSugs.length === 0 && (
              <div className="flex items-center gap-1.5 px-1 pt-1">
                <span className="text-slate-600 text-xs">已無新建議</span>
                <button type="button"
                  onClick={() => setSubSugs(prev => { const n = { ...prev }; delete n[subAiPid]; return n })}
                  className="text-slate-600 hover:text-slate-400 transition-colors text-xs"
                  title="清除快取，下次可重新推薦">↻</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI 關聯提示 */}
      {relateResult && (
        <div className="rounded-lg px-3 py-2.5 text-xs relative"
          style={{ background: (root.color ?? '#8b5cf6') + '15', border: `1px solid ${root.color ?? '#8b5cf6'}33` }}>
          <button type="button" onClick={() => setRelateResult(null)}
            className="absolute top-1.5 right-2 text-slate-600 hover:text-slate-400">×</button>
          <p className="font-semibold mb-1.5 pr-4" style={{ color: root.color ?? '#a78bfa' }}>
            ✦ 學了「{lastAdded}」，也考慮看看：
          </p>
          <p className="text-slate-500 mb-2">{relateResult.reason}</p>
          <div className="flex flex-wrap gap-1.5">
            {relateResult.related.map(r => (
              <button key={r} type="button"
                onClick={() => { setLabel(r); setRelateResult(null); setSelectedSubParentId(null) }}
                className="px-2 py-1 rounded text-xs transition-all hover:opacity-80"
                style={{ background: (root.color ?? '#8b5cf6') + '22', color: root.color ?? '#a78bfa', border: `1px solid ${root.color ?? '#8b5cf6'}44` }}>
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      <Divider />

      {/* 推薦技能（單一標題，AI + 固定清單） */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-slate-400 text-xs uppercase tracking-wider">推薦技能</h3>
          <button type="button" onClick={fetchAiSuggestions} disabled={isSuggestLoading}
            className="text-xs flex items-center gap-1 transition-all hover:opacity-80 disabled:opacity-50"
            style={{ color: root.color ?? '#a78bfa' }}>
            {isSuggestLoading ? <><Spinner color={root.color} size={10} /> 思考中…</> : '✦ AI 為我推薦'}
          </button>
        </div>

        {aiSuggestions.length > 0 && (
          <ul className="space-y-0.5 mb-2">
            {aiSuggestions.map(s => {
              const isExpAI = expandedAiSug.has(s.label)
              const hasKids = (s.children?.length ?? 0) > 0
              return (
                <Fragment key={s.label}>
                  <li className="flex items-center gap-1 rounded-md hover:bg-white/5 group px-1 py-1 transition-colors">
                    {/* Chevron */}
                    <button
                      type="button"
                      onClick={() => hasKids && setExpandedAiSug(prev => {
                        const next = new Set(prev)
                        next.has(s.label) ? next.delete(s.label) : next.add(s.label)
                        return next
                      })}
                      className="w-5 h-5 flex items-center justify-center flex-shrink-0 transition-colors"
                      style={{ color: hasKids ? '#64748b' : 'transparent', cursor: hasKids ? 'pointer' : 'default' }}
                      tabIndex={hasKids ? 0 : -1}
                      aria-label={isExpAI ? '收合' : '展開'}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path
                          d={isExpAI ? 'M2 3.5l3 3 3-3' : 'M3.5 2l3 3-3 3'}
                          stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                    <span className="text-xs flex-shrink-0" style={{ color: root.color }}>✦</span>
                    <button type="button"
                      onClick={() => { setLabel(s.label); setSelectedSubParentId(null) }}
                      className="flex-1 text-left text-sm text-slate-300 hover:text-white transition-colors truncate">
                      {s.label}
                    </button>
                    <button type="button" onClick={() => handleQuickAdd(s.label, true)}
                      className="w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 hover:scale-110"
                      style={{ color: root.color, background: (root.color ?? '#8b5cf6') + '22' }} title={`快速新增「${s.label}」`}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M5 1.5v7M1.5 5h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </li>
                  {isExpAI && s.children?.map(child => (
                    <li key={child} className="flex items-center gap-1 rounded-md hover:bg-white/5 group pl-6 pr-1 py-1 transition-colors">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 border" style={{ borderColor: (root.color ?? '#8b5cf6') + 'aa' }} />
                      <button type="button"
                        onClick={() => { setLabel(child); setSelectedSubParentId(null) }}
                        className="flex-1 text-left text-xs text-slate-400 hover:text-slate-200 transition-colors truncate">
                        {child}
                      </button>
                      <button type="button"
                        onClick={() => handleQuickAdd(child, true, s.label)}
                        className="w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 hover:scale-110"
                        style={{ color: root.color, background: (root.color ?? '#8b5cf6') + '22' }} title={`快速新增「${child}」`}>
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
        )}

        <SuggestionList
          rootId={root.id}
          rootColor={root.color ?? '#8b5cf6'}
          onFillInput={(text) => { setLabel(text); setLabelErr(''); setSelectedSubParentId(null) }}
          onQuickAdd={handleQuickAdd}
        />
      </div>

    </div>
  )
}

/* ─── Shared ─── */
function Section({ title, color, children }: { title: string; color?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="w-0.5 h-3 rounded-full" style={{ background: color ?? '#8b5cf6' }} />
        <h3 className="text-slate-300 text-xs font-semibold uppercase tracking-wider">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function Divider() {
  return <div className="border-t" style={{ borderColor: '#ffffff10' }} />
}

/** Reusable hover-reveal delete button (×) */
function DeleteBtn({ onClick, title }: { onClick: () => void; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="w-6 h-6 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
      style={{ color: '#64748b' }}
      onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = '#f8717115' }}
      onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'transparent' }}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    </button>
  )
}

/** Reusable navigate (›) button */
function NavBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-colors flex-shrink-0"
      title="查看學習規劃"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M4.5 2.5l3 3.5-3 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  )
}

function Spinner({ color, size = 12 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" className="animate-spin" style={{ color: color ?? '#a78bfa' }}>
      <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="14 8" />
    </svg>
  )
}

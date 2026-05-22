'use client'

import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import DetailPanel from '@/components/DetailPanel'
import { SkillNode, SkillData } from '@/types/skill'
import { initialSkillData } from '@/data/mockSkills'

/* ── Help content ── */
const HELP_SECTIONS: {
  title: string
  color: string
  items: { icon: string; title: string; desc: string }[]
}[] = [
  {
    title: '基礎操作',
    color: '#3b82f6',
    items: [
      { icon: '●', title: '中心節點「我」', desc: '點擊可自訂名稱（最多 8 字）與主題顏色，顏色會同步影響全局配色' },
      { icon: '●', title: '根節點（分類）', desc: '點擊展開或收合該分類的技能樹，同時在右側面板管理技能' },
      { icon: '●', title: '技能 / 分支節點', desc: '點擊進入學習規劃頁，可設定目標、里程碑、時間排程和學習資源' },
      { icon: '●', title: '畫布縮放移動', desc: '滑鼠滾輪縮放；按住並拖曳移動整個畫布；觸控板雙指同樣支援' },
    ],
  },
  {
    title: '管理技能樹',
    color: '#10b981',
    items: [
      { icon: '＋', title: '新增技能', desc: '展開根節點後，在輸入欄填入名稱，按「新增」按鈕或直接按 Enter' },
      { icon: '↳', title: '新增子技能', desc: '點技能行左側箭頭展開，可在下方繼續新增第二層子技能' },
      { icon: '×', title: '刪除技能', desc: 'Hover 技能後出現 × 按鈕，刪除時連同所有子技能一起移除' },
      { icon: '›', title: '進入學習規劃', desc: '點技能行右側的 › 箭頭，直接跳轉到該技能的學習規劃頁面' },
    ],
  },
  {
    title: 'AI 智慧功能',
    color: '#8b5cf6',
    items: [
      { icon: '✦', title: 'AI 推薦技能', desc: '根節點面板右上角點「✦ AI 為我推薦」，根據分類智慧推薦相關技能' },
      { icon: '✦', title: 'AI 一鍵生成計畫', desc: '技能規劃頁點生成按鈕，自動產生 5–6 個里程碑與 3–4 個學習資源' },
      { icon: '✦', title: 'AI 推薦里程碑', desc: '里程碑區塊點「✦ AI 推薦里程碑」，補充你可能遺漏的學習步驟' },
      { icon: '✦', title: '智慧關聯提示', desc: '新增技能後 AI 自動推薦可搭配學習的延伸技能，點選快速加入' },
    ],
  },
  {
    title: '學習規劃功能',
    color: '#f59e0b',
    items: [
      { icon: '◎', title: '學習目標', desc: '寫下具體想達到的程度，設定目標後 AI 生成的計畫會更精準' },
      { icon: '☑', title: '里程碑管理', desc: '勾選標記完成進度；點里程碑文字展開後，可記錄詳細步驟與筆記' },
      { icon: '📅', title: '時間規劃', desc: '年 / 月 / 週 / 日 四種視角排定學習日期，點格子切換安排狀態' },
      { icon: '🔗', title: '學習資源', desc: '儲存書籍、課程、網站連結，自動顯示網站圖示與域名方便識別' },
    ],
  },
]

const SkillTreeCanvas = dynamic(
  () => import('@/components/SkillTreeCanvas'),
  { ssr: false }
)

export default function Home() {
  const [skillData, setSkillData] = useState<SkillData>(initialSkillData)
  const [expandedRoots, setExpandedRoots] = useState<Set<string>>(new Set())
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    if (!showHelp) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setShowHelp(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [showHelp])

  // Selection states (ids only — live data derived from skillData)
  const [isCenterSelected,  setIsCenterSelected]  = useState(false)
  const [selectedRootId,    setSelectedRootId]     = useState<string | null>(null)
  const [selectedBranchId,  setSelectedBranchId]   = useState<string | null>(null)

  // Live derived nodes
  const centerNode     = skillData.nodes.find(n => n.type === 'center') ?? null
  const selectedRoot   = selectedRootId   ? (skillData.nodes.find(n => n.id === selectedRootId)   ?? null) : null
  const selectedBranch = selectedBranchId ? (skillData.nodes.find(n => n.id === selectedBranchId) ?? null) : null
  const selectedCenter = isCenterSelected ? centerNode : null

  /** 選中分支的直接父節點（可能是 root 或 branch） */
  const selectedBranchParent = selectedBranch
    ? (skillData.nodes.find(n => n.id === selectedBranch.parentId) ?? null)
    : null

  const isPanelOpen   = isCenterSelected || selectedRootId !== null || selectedBranchId !== null
  const selectedNodeId = isCenterSelected ? 'me' : selectedBranchId ?? selectedRootId ?? null

  const rootBranches = selectedRoot
    ? skillData.nodes.filter(n => {
        if (n.type !== 'branch') return false
        if (n.parentId === selectedRoot.id) return true
        // 第二層：父節點是 root 的直接子節點
        const parent = skillData.nodes.find(p => p.id === n.parentId)
        return parent?.type === 'branch' && parent.parentId === selectedRoot.id
      })
    : []

  /* ── helpers ── */
  function updateNode(nodeId: string, updates: Partial<SkillNode>) {
    setSkillData(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => n.id === nodeId ? { ...n, ...updates } : n),
    }))
  }

  /* ── Handlers ── */
  const handleCenterClick = useCallback(() => {
    setIsCenterSelected(true)
    setSelectedRootId(null)
    setSelectedBranchId(null)
  }, [])

  const handleRootClick = useCallback((rootId: string) => {
    setIsCenterSelected(false)
    setSelectedRootId(rootId)
    setSelectedBranchId(null)
    setExpandedRoots(prev => {
      const next = new Set(prev)
      if (next.has(rootId) && selectedRootId === rootId) next.delete(rootId)
      else next.add(rootId)
      return next
    })
  }, [selectedRootId])

  const handleBranchClick = useCallback((node: SkillNode) => {
    setIsCenterSelected(false)
    setSelectedBranchId(node.id)
    // 找到真正的 root（最多兩層）
    const parent = skillData.nodes.find(n => n.id === node.parentId)
    if (parent?.type === 'root')   setSelectedRootId(parent.id)
    else if (parent?.type === 'branch') setSelectedRootId(parent.parentId ?? null)
  }, [skillData.nodes])

  const handleCanvasClick = useCallback(() => {
    setIsCenterSelected(false)
    setSelectedRootId(null)
    setSelectedBranchId(null)
  }, [])

  const handleClose = useCallback(() => {
    setIsCenterSelected(false)
    setSelectedRootId(null)
    setSelectedBranchId(null)
  }, [])

  const handleAddBranch = useCallback((
    label: string,
    hours: number,
    description: string,
    isAIRecommended = false,
    parentBranchId?: string,
  ): string => {
    if (!selectedRootId) return ''
    const effectiveParentId = parentBranchId ?? selectedRootId
    const root = skillData.nodes.find(n => n.id === selectedRootId)
    if (!root) return ''
    const newId = `${selectedRootId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const newNode: SkillNode = {
      id: newId,
      label,
      type: 'branch',
      parentId: effectiveParentId,
      hours,
      isAIRecommended,
      description: description || undefined,
      progress: 0,
      color: root.color,
    }
    setSkillData(prev => ({
      nodes: [...prev.nodes, newNode],
      links: [...prev.links, { source: effectiveParentId, target: newId }],
    }))
    setExpandedRoots(prev => new Set([...prev, selectedRootId]))
    return newId
  }, [selectedRootId, skillData.nodes])

  const handleUpdateBranch = useCallback((nodeId: string, updates: Partial<SkillNode>) => {
    updateNode(nodeId, updates)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleUpdateCenter = useCallback((updates: Partial<SkillNode>) => {
    updateNode('me', updates)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDeleteBranch = useCallback((nodeId: string) => {
    setSkillData(prev => {
      // 收集要刪除的節點（含所有後代）
      const toDelete = new Set<string>([nodeId])
      let changed = true
      while (changed) {
        changed = false
        for (const node of prev.nodes) {
          if (node.parentId && toDelete.has(node.parentId) && !toDelete.has(node.id)) {
            toDelete.add(node.id)
            changed = true
          }
        }
      }
      return {
        nodes: prev.nodes.filter(n => !toDelete.has(n.id)),
        links: prev.links.filter(l =>
          !toDelete.has(l.source as string) && !toDelete.has(l.target as string)
        ),
      }
    })
    setSelectedBranchId(prev => (prev === nodeId ? null : prev))
  }, [])

  const handleBranchSelect = useCallback((node: SkillNode) => {
    if (node.type === 'branch') {
      setSelectedBranchId(node.id)
      // 同步更新 rootId，確保顯示正確
      const parent = skillData.nodes.find(n => n.id === node.parentId)
      if (parent?.type === 'root')        setSelectedRootId(parent.id)
      else if (parent?.type === 'branch') setSelectedRootId(parent.parentId ?? null)
    } else if (node.type === 'root') {
      // 從 BranchPlan ← 返回到 root manager
      setSelectedBranchId(null)
      setSelectedRootId(node.id)
    }
  }, [skillData.nodes])

  return (
    <main className="flex h-screen w-screen overflow-hidden" style={{ background: '#0a0a14' }}>

      <div className="flex-1 relative overflow-hidden">
        <SkillTreeCanvas
          skillData={skillData}
          expandedRoots={expandedRoots}
          selectedNodeId={selectedNodeId}
          onCenterClick={handleCenterClick}
          onRootClick={handleRootClick}
          onBranchClick={handleBranchClick}
          onCanvasClick={handleCanvasClick}
        />

        {/* Help modal */}
        {showHelp && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowHelp(false)}
          >
            <div
              className="w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl"
              style={{ background: '#12122a', border: '1px solid #ffffff18', boxShadow: '0 24px 64px rgba(0,0,0,0.8)' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0"
                style={{ borderBottom: '1px solid #ffffff10' }}>
                <div>
                  <h2 className="text-white font-semibold text-base tracking-tight">使用說明</h2>
                  <p className="text-slate-500 text-xs mt-0.5">SkillMap — 個人技能規劃工具</p>
                </div>
                <button type="button" onClick={() => setShowHelp(false)}
                  className="text-slate-400 hover:text-white transition-colors">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>

              {/* 2×2 section grid */}
              <div className="grid grid-cols-2" style={{ gap: 1, background: '#ffffff08' }}>
                {HELP_SECTIONS.map(section => (
                  <div key={section.title} className="p-5" style={{ background: '#12122a' }}>
                    {/* Section title */}
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-1 h-3.5 rounded-full" style={{ background: section.color }} />
                      <h3 className="text-xs font-semibold uppercase tracking-wider"
                        style={{ color: section.color }}>{section.title}</h3>
                    </div>
                    {/* Items */}
                    <div className="space-y-3.5">
                      {section.items.map(item => (
                        <div key={item.title} className="flex gap-3">
                          <span className="text-xs flex-shrink-0 w-4 text-center mt-0.5 leading-none select-none"
                            style={{ color: section.color + 'bb' }}>{item.icon}</span>
                          <div>
                            <div className="text-sm text-white font-medium leading-tight">{item.title}</div>
                            <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-6 py-3 text-center" style={{ borderTop: '1px solid #ffffff10' }}>
                <p className="text-slate-600 text-xs">
                  按 <kbd className="px-1.5 py-0.5 rounded text-slate-500 text-[10px]"
                    style={{ background: '#ffffff10', border: '1px solid #ffffff18' }}>Esc</kbd> 關閉
                  　·　資料儲存於瀏覽器本機，重新整理後保留
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ? icon button */}
        <div className="absolute bottom-4 left-4">
          <button
            type="button"
            onClick={() => setShowHelp(v => !v)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-all"
            style={{
              background: showHelp ? '#ffffff18' : '#ffffff0a',
              border: `1px solid ${showHelp ? '#ffffff30' : '#ffffff15'}`,
            }}
            title="使用說明"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M5.5 5.5a1.5 1.5 0 0 1 3 .5c0 1-1.5 1.5-1.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <circle cx="7" cy="10.5" r="0.6" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>

      <DetailPanel
        selectedCenter={selectedCenter}
        selectedRoot={selectedRoot}
        selectedBranch={selectedBranch}
        branchParent={selectedBranchParent}
        rootBranches={rootBranches}
        isOpen={isPanelOpen}
        onClose={handleClose}
        onAddBranch={handleAddBranch}
        onUpdateBranch={handleUpdateBranch}
        onUpdateCenter={handleUpdateCenter}
        onBranchSelect={handleBranchSelect}
        onDeleteBranch={handleDeleteBranch}
      />
    </main>
  )
}

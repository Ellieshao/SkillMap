'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import DetailPanel from '@/components/DetailPanel'
import { SkillNode, SkillData } from '@/types/skill'
import { initialSkillData } from '@/data/mockSkills'

const SkillTreeCanvas = dynamic(
  () => import('@/components/SkillTreeCanvas'),
  { ssr: false }
)

export default function Home() {
  const [skillData, setSkillData] = useState<SkillData>(initialSkillData)
  const [expandedRoots, setExpandedRoots] = useState<Set<string>>(new Set())
  const [showHelp, setShowHelp] = useState(false)
  const helpRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showHelp) return
    function onClickOutside(e: MouseEvent) {
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) setShowHelp(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
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

        <div ref={helpRef} className="absolute bottom-4 left-4">
          {/* Help popup */}
          {showHelp && (
            <div
              className="absolute bottom-10 left-0 mb-1 rounded-xl px-4 py-3 text-xs text-slate-300 space-y-2 whitespace-nowrap"
              style={{ background: '#1a1a2e', border: '1px solid #ffffff18', boxShadow: '0 8px 32px #00000066' }}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-slate-500">①</span>
                <span>點「<span className="text-white font-medium">我</span>」自訂名稱與顏色</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-slate-500">②</span>
                <span>點<span className="text-white font-medium">根節點</span>展開 / 新增技能</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-slate-500">③</span>
                <span>點<span className="text-white font-medium">分支節點</span>規劃學習計畫</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-slate-500">④</span>
                <span>滾輪 / 拖曳<span className="text-white font-medium">縮放移動</span>畫布</span>
              </div>
            </div>
          )}
          {/* Icon button */}
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

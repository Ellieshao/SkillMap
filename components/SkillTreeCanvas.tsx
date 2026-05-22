'use client'

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { SimNode, SimLink, SkillNode, SkillData } from '@/types/skill'

interface Props {
  skillData: SkillData
  expandedRoots: Set<string>
  selectedNodeId: string | null
  onCenterClick: () => void
  onRootClick: (rootId: string) => void
  onBranchClick: (node: SkillNode) => void
  onCanvasClick: () => void
}

const CENTER_DEFAULT = '#475569'

function nodeRadius(node: SkillNode, childCount = 0): number {
  if (node.type === 'center') return 30
  if (node.type === 'root')   return 14 + Math.sqrt(node.hours) * 1.2 + Math.sqrt(childCount) * 4
  return 7 + Math.sqrt(node.hours) * 1.5 + Math.sqrt(childCount) * 2.5
}

/** Lighten a hex colour for the gradient stop */
function lighten(hex: string, amount = 0.4): string {
  const c = parseInt(hex.slice(1), 16)
  const r = Math.min(255, ((c >> 16) & 0xff) + Math.round(255 * amount))
  const g = Math.min(255, ((c >> 8)  & 0xff) + Math.round(255 * amount))
  const b = Math.min(255, ( c        & 0xff) + Math.round(255 * amount))
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`
}

export default function SkillTreeCanvas({
  skillData,
  expandedRoots,
  selectedNodeId,
  onCenterClick,
  onRootClick,
  onBranchClick,
  onCanvasClick,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const W  = svgRef.current.clientWidth
    const H  = svgRef.current.clientHeight
    const cx = W / 2
    const cy = H / 2

    const centerNode = skillData.nodes.find(n => n.type === 'center')
    const centerColor = centerNode?.color ?? CENTER_DEFAULT

    // Visible node IDs (3 levels: center → root → branch → sub-branch)
    const visibleIds = new Set<string>()
    skillData.nodes.forEach(n => {
      if (n.type === 'center' || n.type === 'root') visibleIds.add(n.id)
      if (n.type === 'branch') {
        if (n.parentId && expandedRoots.has(n.parentId)) {
          visibleIds.add(n.id)
        } else if (n.parentId) {
          const parent = skillData.nodes.find(p => p.id === n.parentId && p.type === 'branch')
          if (parent?.parentId && expandedRoots.has(parent.parentId)) visibleIds.add(n.id)
        }
      }
    })

    const nodes: SimNode[] = skillData.nodes
      .filter(n => visibleIds.has(n.id))
      .map(n => {
        const childCount = skillData.nodes.filter(c => c.parentId === n.id).length
        return { ...n, r: nodeRadius(n, childCount) }
      })

    const links: SimLink[] = skillData.links
      .filter(l => visibleIds.has(l.source as string) && visibleIds.has(l.target as string))
      .map(l => ({ ...l }))

    // ── Defs ──
    const defs = svg.append('defs')

    // Dynamic radial gradient for center
    const grad = defs.append('radialGradient').attr('id', 'center-grad')
    grad.append('stop').attr('offset', '0%').attr('stop-color', lighten(centerColor, 0.3))
    grad.append('stop').attr('offset', '100%').attr('stop-color', centerColor)

    // Glow filter
    const filt = defs.append('filter').attr('id', 'glow')
    filt.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'blur')
    const merge = filt.append('feMerge')
    merge.append('feMergeNode').attr('in', 'blur')
    merge.append('feMergeNode').attr('in', 'SourceGraphic')

    // Selected glow (brighter)
    const filt2 = defs.append('filter').attr('id', 'glow-selected')
    filt2.append('feGaussianBlur').attr('stdDeviation', '6').attr('result', 'blur')
    const merge2 = filt2.append('feMerge')
    merge2.append('feMergeNode').attr('in', 'blur')
    merge2.append('feMergeNode').attr('in', 'SourceGraphic')

    // ── Zoomable container ──
    const g = svg.append('g').attr('class', 'canvas-root')
    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 3])
        .on('zoom', e => g.attr('transform', e.transform))
    )

    // ── Links ──
    const linkSel = g.append('g')
      .selectAll<SVGLineElement, SimLink>('line')
      .data(links)
      .join('line')
      .attr('stroke', '#ffffff20')
      .attr('stroke-width', 1.2)

    // ── Node groups ──
    const nodeSel = g.append('g')
      .selectAll<SVGGElement, SimNode>('g.node')
      .data(nodes, d => d.id)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')   // center is now also clickable

    // Circle fill
    nodeSel.append('circle')
      .attr('r', d => d.r)
      .attr('fill', d => {
        if (d.type === 'center') return 'url(#center-grad)'
        if (d.type === 'root')   return (d.color ?? '#555') + 'cc'
        if (d.isAIRecommended)  return (d.color ?? '#555') + '22'
        return (d.color ?? '#555') + '44'
      })
      .attr('stroke', d => {
        if (d.type === 'center') return selectedNodeId === d.id ? '#fff' : lighten(centerColor, 0.5)
        if (selectedNodeId === d.id) return '#fff'
        return d.color ?? '#888'
      })
      .attr('stroke-width', d => {
        if (d.type === 'center') return selectedNodeId === d.id ? 3 : 2
        return selectedNodeId === d.id ? 2.5 : 1.5
      })
      .attr('stroke-dasharray', d => d.isAIRecommended ? '6,3' : null)
      .attr('filter', d => selectedNodeId === d.id ? 'url(#glow-selected)' : null)

    // Root expand-ring
    nodeSel.filter(d => d.type === 'root' && expandedRoots.has(d.id))
      .append('circle')
      .attr('r', d => d.r + 5)
      .attr('fill', 'none')
      .attr('stroke', d => d.color ?? '#888')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.4)
      .attr('stroke-dasharray', '3,3')

    // Labels
    nodeSel.append('text')
      .text(d => d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.type === 'center' ? '0.35em' : d.r + 13)
      .attr('font-size', d => d.type === 'center' ? 13 : d.type === 'root' ? 11 : 9)
      .attr('font-weight', d => d.type !== 'branch' ? '600' : '400')
      .attr('fill', d => d.type === 'center' ? '#fff' : '#e2e8f0')
      .attr('pointer-events', 'none')

    // Tooltip
    nodeSel.append('title').text(d =>
      d.type === 'center' ? '點擊自訂名稱與顏色' :
      d.type === 'root'   ? `${d.label}（點擊展開）` :
                            `${d.label}（${d.hours}h）`
    )

    // ── Simulation ──
    const sim = d3.forceSimulation<SimNode, SimLink>(nodes)
      .force('link', d3.forceLink<SimNode, SimLink>(links)
        .id(d => d.id)
        .distance(d => {
          const s = d.source as SimNode
          const t = d.target as SimNode
          if (s.type === 'center' || t.type === 'center') return 200
          if (s.type === 'branch' && t.type === 'branch') return 75
          return 120
        })
        .strength(0.6)
      )
      .force('charge', d3.forceManyBody().strength(-320))
      .force('center', d3.forceCenter(cx, cy))
      .force('collide', d3.forceCollide<SimNode>(d => d.r + 16))
      .force('radial', d3.forceRadial<SimNode>(200, cx, cy)
        .strength(d => d.type === 'root' ? 0.4 : 0))

    sim.on('tick', () => {
      linkSel
        .attr('x1', d => (d.source as SimNode).x ?? 0)
        .attr('y1', d => (d.source as SimNode).y ?? 0)
        .attr('x2', d => (d.target as SimNode).x ?? 0)
        .attr('y2', d => (d.target as SimNode).y ?? 0)
      nodeSel.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })

    // ── Drag ──
    nodeSel.call(
      d3.drag<SVGGElement, SimNode>()
        .on('start', (event, d) => {
          if (!event.active) sim.alphaTarget(0.3).restart()
          d.fx = d.x; d.fy = d.y
        })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
        .on('end', (event, d) => {
          if (!event.active) sim.alphaTarget(0)
          d.fx = null; d.fy = null
        })
    )

    // ── Click ──
    nodeSel.on('click', (event, d) => {
      event.stopPropagation()
      if (d.type === 'center') { onCenterClick(); return }
      if (d.type === 'root')   { onRootClick(d.id); return }
      onBranchClick(d)
    })

    svg.on('click', () => onCanvasClick())

    return () => { sim.stop() }
  }, [skillData, expandedRoots, selectedNodeId, onCenterClick, onRootClick, onBranchClick, onCanvasClick])

  return (
    <svg ref={svgRef} className="w-full h-full" style={{ background: 'transparent' }} />
  )
}

export interface Milestone {
  id: string
  label: string
  done: boolean
  detail?: string   // 展開後的細節筆記
}

export interface Resource {
  title: string
  url: string
}

export interface TimeSlot {
  start: string   // "HH:MM"
  end: string     // "HH:MM"
  note?: string   // 該時段學習內容備註
}

/** 0 = 週一 … 6 = 週日 */
export type WeeklySchedule = Record<number, TimeSlot[]>

export interface SkillNode {
  id: string
  label: string
  type: 'center' | 'root' | 'branch'
  parentId?: string
  hours: number
  isAIRecommended: boolean
  color?: string
  description?: string
  goal?: string
  targetDate?: string
  weeklyHours?: number
  milestones?: Milestone[]
  resources?: Resource[]
  progress?: number
  schedule?: WeeklySchedule
  scheduledDates?: string[]  // "YYYY-MM-DD" | "YYYY-MM-DD:M/A/E" | "YYYY-MM-DD:HH"
}

export interface SkillLink {
  source: string
  target: string
}

export interface SkillData {
  nodes: SkillNode[]
  links: SkillLink[]
}

export interface SimNode extends SkillNode {
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
  vx?: number
  vy?: number
  r: number
}

export interface SimLink {
  source: SimNode | string
  target: SimNode | string
}

import { SkillData } from '@/types/skill'

export const ROOT_COLOR: Record<string, string> = {
  work:         '#3b82f6',
  finance:      '#10b981',
  language:     '#f59e0b',
  professional: '#8b5cf6',
  hobbies:      '#ec4899',
  social:       '#06b6d4',
  fitness:      '#f97316',
}

export const initialSkillData: SkillData = {
  nodes: [
    { id: 'me',           label: '我',   type: 'center', hours: 0, isAIRecommended: false, color: '#475569' },
    { id: 'work',         label: '工作', type: 'root',   hours: 0, isAIRecommended: false, color: ROOT_COLOR.work },
    { id: 'finance',      label: '財務', type: 'root',   hours: 0, isAIRecommended: false, color: ROOT_COLOR.finance },
    { id: 'language',     label: '語言', type: 'root',   hours: 0, isAIRecommended: false, color: ROOT_COLOR.language },
    { id: 'professional', label: '專業', type: 'root',   hours: 0, isAIRecommended: false, color: ROOT_COLOR.professional },
    { id: 'hobbies',      label: '興趣', type: 'root',   hours: 0, isAIRecommended: false, color: ROOT_COLOR.hobbies },
    { id: 'social',       label: '人際', type: 'root',   hours: 0, isAIRecommended: false, color: ROOT_COLOR.social },
    { id: 'fitness',      label: '運動', type: 'root',   hours: 0, isAIRecommended: false, color: ROOT_COLOR.fitness },
  ],
  links: [
    { source: 'me', target: 'work' },
    { source: 'me', target: 'finance' },
    { source: 'me', target: 'language' },
    { source: 'me', target: 'professional' },
    { source: 'me', target: 'hobbies' },
    { source: 'me', target: 'social' },
    { source: 'me', target: 'fitness' },
  ],
}

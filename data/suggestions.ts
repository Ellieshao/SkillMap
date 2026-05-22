export interface Suggestion {
  label: string
  aiRecommended?: boolean   // 第二子分支（AI 推薦）
  children?: Suggestion[]   // 點進去後展開的細項
}

export const SUGGESTIONS: Record<string, Suggestion[]> = {
  work: [
    { label: '時間管理', children: [
      { label: 'Pomodoro 技法', aiRecommended: true },
      { label: 'GTD 系統',     aiRecommended: true },
      { label: '深度工作法',   aiRecommended: true },
    ]},
    { label: '溝通力', children: [
      { label: '非暴力溝通',   aiRecommended: true },
      { label: '主動傾聽',     aiRecommended: true },
      { label: '商務寫作',     aiRecommended: true },
    ]},
    { label: '簡報技巧', children: [
      { label: '故事結構設計', aiRecommended: true },
      { label: '視覺排版',     aiRecommended: true },
      { label: 'TED 演講技巧', aiRecommended: true },
    ]},
    { label: '專案管理', children: [
      { label: 'Scrum / Sprint', aiRecommended: true },
      { label: 'Agile 方法論',   aiRecommended: true },
      { label: 'Notion 工具應用',aiRecommended: true },
    ]},
    { label: '數據分析', children: [
      { label: 'Excel / Google Sheets', aiRecommended: true },
      { label: 'SQL 基礎',              aiRecommended: true },
      { label: '資料視覺化',            aiRecommended: true },
    ]},
    { label: 'AI 工具應用', children: [
      { label: 'ChatGPT 提示工程', aiRecommended: true },
      { label: 'Midjourney 圖像',  aiRecommended: true },
      { label: 'Copilot 程式輔助', aiRecommended: true },
    ]},
    { label: '領導力', children: [
      { label: '教練式領導', aiRecommended: true },
      { label: '給予回饋',   aiRecommended: true },
      { label: '決策能力',   aiRecommended: true },
    ]},
  ],

  finance: [
    { label: '記帳', children: [
      { label: 'YNAB 零基預算',  aiRecommended: true },
      { label: '月度財務檢視',   aiRecommended: true },
      { label: '消費分類追蹤',   aiRecommended: true },
    ]},
    { label: '投資基礎', children: [
      { label: '股票基本分析',   aiRecommended: true },
      { label: '複利概念',       aiRecommended: true },
      { label: '風險評估',       aiRecommended: true },
    ]},
    { label: 'ETF 指數投資', children: [
      { label: '台股 ETF（0050）', aiRecommended: true },
      { label: '美股全市場 ETF',   aiRecommended: true },
      { label: '定期定額策略',     aiRecommended: true },
    ]},
    { label: '保險規劃', children: [
      { label: '醫療險配置',     aiRecommended: true },
      { label: '壽險需求試算',   aiRecommended: true },
      { label: '意外險入門',     aiRecommended: true },
    ]},
    { label: '稅務', children: [
      { label: '綜合所得稅申報',   aiRecommended: true },
      { label: '節稅工具（勞退自提）', aiRecommended: true },
      { label: '海外所得規定',     aiRecommended: true },
    ]},
    { label: '退休規劃', children: [
      { label: 'FIRE 財務獨立概念', aiRecommended: true },
      { label: '勞退試算',          aiRecommended: true },
      { label: '資產配置比例',      aiRecommended: true },
    ]},
  ],

  language: [
    { label: '英文', children: [
      { label: '英文口說',             aiRecommended: true },
      { label: '商務英文寫作',         aiRecommended: true },
      { label: 'IELTS / TOEFL 備考',  aiRecommended: true },
    ]},
    { label: '日文', children: [
      { label: 'JLPT 備考',           aiRecommended: true },
      { label: '日文 Shadowing',       aiRecommended: true },
      { label: '日文閱讀',             aiRecommended: true },
    ]},
    { label: '韓文', children: [
      { label: 'TOPIK 備考',          aiRecommended: true },
      { label: 'K-Drama 聽力練習',    aiRecommended: true },
      { label: '韓文口說',             aiRecommended: true },
    ]},
    { label: '西班牙文', children: [
      { label: '西語口說',             aiRecommended: true },
      { label: 'DELE 認證',           aiRecommended: true },
      { label: '拉美文化理解',         aiRecommended: true },
    ]},
    { label: '法文', children: [
      { label: 'DELF 備考',           aiRecommended: true },
      { label: '法語口說',             aiRecommended: true },
      { label: '法國文化',             aiRecommended: true },
    ]},
    { label: '中文寫作', children: [
      { label: '文案寫作', aiRecommended: true },
      { label: '新聞寫作', aiRecommended: true },
      { label: '散文創作', aiRecommended: true },
    ]},
  ],

  professional: [
    { label: '程式設計', children: [
      { label: 'Python',                     aiRecommended: true },
      { label: 'JavaScript / TypeScript',    aiRecommended: true },
      { label: '後端開發（Node.js / Go）',   aiRecommended: true },
      { label: 'App 開發（Flutter）',        aiRecommended: true },
    ]},
    { label: '電子 / 硬體', children: [
      { label: 'Arduino 專題',   aiRecommended: true },
      { label: 'Raspberry Pi',   aiRecommended: true },
      { label: '電路設計',       aiRecommended: true },
      { label: '感測器應用',     aiRecommended: true },
    ]},
    { label: '資料結構與演算法', children: [
      { label: 'LeetCode 練習',    aiRecommended: true },
      { label: '排序 / 搜尋演算法', aiRecommended: true },
      { label: '圖論基礎',          aiRecommended: true },
    ]},
    { label: '設計（UI/UX）', children: [
      { label: 'Figma',             aiRecommended: true },
      { label: '使用者研究',        aiRecommended: true },
      { label: '色彩與排版理論',    aiRecommended: true },
    ]},
    { label: '數據科學 / AI', children: [
      { label: '機器學習基礎',        aiRecommended: true },
      { label: 'Python 數據分析',     aiRecommended: true },
      { label: '大型語言模型應用',    aiRecommended: true },
    ]},
    { label: '行銷', children: [
      { label: '社群媒體行銷', aiRecommended: true },
      { label: 'SEO',          aiRecommended: true },
      { label: '內容行銷',     aiRecommended: true },
    ]},
    { label: '寫作', children: [
      { label: '技術寫作',   aiRecommended: true },
      { label: '部落格經營', aiRecommended: true },
      { label: '文案寫作',   aiRecommended: true },
    ]},
    { label: '影音剪輯', children: [
      { label: 'Premiere Pro / Final Cut', aiRecommended: true },
      { label: '短影音（Reels / TikTok）', aiRecommended: true },
      { label: 'YouTube 頻道經營',         aiRecommended: true },
    ]},
  ],

  hobbies: [
    { label: '音樂', children: [
      { label: '鋼琴',     aiRecommended: true },
      { label: '吉他',     aiRecommended: true },
      { label: '樂理',     aiRecommended: true },
      { label: '作曲 / 編曲', aiRecommended: true },
    ]},
    { label: '攝影', children: [
      { label: '人像攝影',             aiRecommended: true },
      { label: '風景攝影',             aiRecommended: true },
      { label: '後製（Lightroom）',    aiRecommended: true },
      { label: '街頭攝影',             aiRecommended: true },
    ]},
    { label: '烹飪 / 烘焙', children: [
      { label: '麵包製作', aiRecommended: true },
      { label: '蛋糕裝飾', aiRecommended: true },
      { label: '中式料理', aiRecommended: true },
      { label: '異國料理', aiRecommended: true },
    ]},
    { label: '繪畫 / 插畫', children: [
      { label: '水彩',                     aiRecommended: true },
      { label: '數位繪圖（Procreate）',    aiRecommended: true },
      { label: '素描',                     aiRecommended: true },
    ]},
    { label: '閱讀', children: [
      { label: '速讀技巧',   aiRecommended: true },
      { label: '讀書筆記法', aiRecommended: true },
      { label: '非小說閱讀', aiRecommended: true },
    ]},
    { label: '旅行', children: [
      { label: '自助旅行規劃', aiRecommended: true },
      { label: '背包客技巧',   aiRecommended: true },
      { label: '旅行攝影',     aiRecommended: true },
    ]},
    { label: '電影 / 戲劇', children: [
      { label: '電影分析', aiRecommended: true },
      { label: '影評寫作', aiRecommended: true },
      { label: '短片製作', aiRecommended: true },
    ]},
    { label: '桌遊 / 益智', children: [
      { label: '策略桌遊', aiRecommended: true },
      { label: '西洋棋',   aiRecommended: true },
      { label: '圍棋',     aiRecommended: true },
    ]},
  ],

  social: [
    { label: '傾聽力', children: [
      { label: '主動傾聽技巧', aiRecommended: true },
      { label: '非語言溝通',   aiRecommended: true },
      { label: '同理心練習',   aiRecommended: true },
    ]},
    { label: '公開演講', children: [
      { label: '即興演講',     aiRecommended: true },
      { label: 'TED 風格演講', aiRecommended: true },
      { label: '辯論技巧',     aiRecommended: true },
    ]},
    { label: '情緒管理', children: [
      { label: '正念冥想', aiRecommended: true },
      { label: '壓力管理', aiRecommended: true },
      { label: '情緒日記', aiRecommended: true },
    ]},
    { label: '衝突處理', children: [
      { label: '協商技巧',   aiRecommended: true },
      { label: '邊界設立',   aiRecommended: true },
      { label: '非暴力溝通', aiRecommended: true },
    ]},
    { label: '人脈建立', children: [
      { label: 'LinkedIn 經營', aiRecommended: true },
      { label: '社群活動參與',  aiRecommended: true },
      { label: '職場社交技巧',  aiRecommended: true },
    ]},
  ],

  fitness: [
    { label: '重訓', children: [
      { label: '飲食控制 / 增肌減脂', aiRecommended: true },
      { label: '有氧心肺補充',        aiRecommended: true },
      { label: '筋膜放鬆 / 恢復',     aiRecommended: true },
      { label: '健身課程設計',         aiRecommended: true },
    ]},
    { label: '跑步', children: [
      { label: '間歇訓練',   aiRecommended: true },
      { label: '馬拉松備賽', aiRecommended: true },
      { label: '足部保護',   aiRecommended: true },
    ]},
    { label: '游泳', children: [
      { label: '衝浪',       aiRecommended: true },
      { label: '救生員訓練', aiRecommended: true },
      { label: '鐵人三項',   aiRecommended: true },
    ]},
    { label: '球類運動', children: [
      { label: '籃球', aiRecommended: true },
      { label: '桌球', aiRecommended: true },
      { label: '羽球', aiRecommended: true },
      { label: '足球', aiRecommended: true },
      { label: '網球', aiRecommended: true },
    ]},
    { label: '武術 / 格鬥', children: [
      { label: '柔道',     aiRecommended: true },
      { label: '跆拳道',   aiRecommended: true },
      { label: '拳擊',     aiRecommended: true },
      { label: '巴西柔術', aiRecommended: true },
    ]},
    { label: '瑜伽 / 伸展', children: [
      { label: '皮拉提斯', aiRecommended: true },
      { label: '冥想',     aiRecommended: true },
      { label: '呼吸練習', aiRecommended: true },
    ]},
    { label: '戶外冒險', children: [
      { label: '衝浪',     aiRecommended: true },
      { label: '攀岩',     aiRecommended: true },
      { label: '登山 / 健行', aiRecommended: true },
      { label: '單車',     aiRecommended: true },
    ]},
  ],
}

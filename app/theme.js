// WannaLog デザイントークン
// ダーク/ライトの2テーマ。色は「役割」で持つ（背景・面・文字・差し色…）。

export const palettes = {
  dark: {
    mode: 'dark',
    bg: '#0F1115',          // 画面の地
    surface: '#1A1D24',     // カード・面
    surface2: '#252A33',    // 一段明るい面（チップ等）
    text: '#F4F2EE',        // メイン文字
    sub: '#969CA8',         // サブ文字
    line: 'rgba(255,255,255,0.09)',
    accent: '#FF6B4A',      // 差し色（コーラル）
    gold: '#F2B544',        // 達成
    tabbar: 'rgba(16,17,21,0.92)',
    overlay: 'rgba(0,0,0,0.35)',
    shadeTop: 'rgba(0,0,0,0)',
    shadeBottom: 'rgba(0,0,0,0.72)',
  },
  light: {
    mode: 'light',
    bg: '#FAF7F2',
    surface: '#FFFFFF',
    surface2: '#F1ECE4',
    text: '#2B2724',
    sub: '#9A9088',
    line: 'rgba(43,39,36,0.10)',
    accent: '#FF6B4A',
    gold: '#F2B544',
    tabbar: 'rgba(255,255,255,0.94)',
    overlay: 'rgba(0,0,0,0.30)',
    shadeTop: 'rgba(0,0,0,0)',
    shadeBottom: 'rgba(0,0,0,0.62)',
  },
};

// カテゴリ：Ionicons のアイコン名 + 色（絵文字は廃止）
export const CATEGORIES = [
  { key: 'eat', label: '食べたい', icon: 'restaurant', color: '#FF6B4A' },
  { key: 'go', label: '行きたい', icon: 'location', color: '#3A8DDE' },
  { key: 'see', label: '見たい', icon: 'film', color: '#7C5CE7' },
  { key: 'want', label: '欲しい', icon: 'pricetag', color: '#C86DD7' },
  { key: 'do', label: 'やりたい', icon: 'barbell', color: '#43A047' },
  { key: 'know', label: '知りたい', icon: 'book', color: '#F29624' },
];

export function getCategory(key) {
  return CATEGORIES.find((c) => c.key === key) || CATEGORIES[0];
}

// 通知の文面（カテゴリごとに“わくわく再点火”のトーン。絵文字なし）
export function reminderBody(categoryKey) {
  switch (categoryKey) {
    case 'eat': return 'まだ食べてないね。今週末どう？';
    case 'go': return 'まだ行けてないね。次の休み、行っちゃう？';
    case 'see': return 'まだ観てないね。今夜どう？';
    case 'want': return 'まだ手に入れてないね。ちょっと見てみる？';
    case 'do': return '少しだけやってみない？一歩で前に進むよ。';
    case 'know': return '気になってたこと、調べてみる？';
    default: return 'これ、まだ楽しみにしてるよね？';
  }
}

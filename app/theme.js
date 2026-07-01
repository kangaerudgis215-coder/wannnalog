// WannaLog デザイントークン
// ダーク/ライトの2テーマ。色は「役割」で持つ（背景・面・文字・差し色…）。

export const palettes = {
  dark: {
    mode: 'dark',
    bg: '#1F1B17',          // 純黒でなく温かみを残した暖色系ダーク
    surface: '#2A2420',     // カード・面
    surface2: '#35302B',    // 一段明るい面（チップ等）
    text: '#F5EFE6',        // メイン文字
    sub: '#B0A79C',         // サブ文字
    line: 'rgba(255,255,255,0.08)',
    accent: '#FF7A59',      // ブランドアクセント（グラデ始点）
    accent2: '#FFB259',     // ブランドアクセント（グラデ終点）
    gold: '#F2B544',        // 達成
    capsule: 'rgba(255,122,89,0.16)', // ヘッダーの統計カプセル背景
    tabbar: 'rgba(31,27,23,0.94)',
    overlay: 'rgba(0,0,0,0.35)',
    shadeTop: 'rgba(0,0,0,0)',
    shadeBottom: 'rgba(0,0,0,0.72)',
  },
  light: {
    mode: 'light',
    bg: '#FFFBF3',          // 温かみのあるクリーム
    surface: '#FFFFFF',
    surface2: '#F3ECE0',
    text: '#2B2622',
    sub: '#8A8178',
    line: 'rgba(43,38,34,0.08)',
    accent: '#FF7A59',
    accent2: '#FFB259',
    gold: '#F2B544',
    capsule: '#FFF3E8',
    tabbar: 'rgba(255,251,243,0.95)',
    overlay: 'rgba(0,0,0,0.30)',
    shadeTop: 'rgba(0,0,0,0)',
    shadeBottom: 'rgba(0,0,0,0.62)',
  },
};

// カテゴリ：アイコン + 3色（soft=パステル背景 / tint=濃色アイコン・文字 / glow=極薄グロー影）
// 「原色はアイコン一点だけ、背景はパステル、影は極薄」で上品に見せる（キャンディボックス）。
export const CATEGORIES = [
  { key: 'eat', label: '食べたい', icon: 'restaurant', color: '#FF6F5E', soft: '#FFE4DE', darkSoft: 'rgba(255,111,94,0.16)', tint: '#FF6F5E', glow: 'rgba(255,111,94,0.35)' },
  { key: 'cook', label: '作りたい', icon: 'chef-hat', iconSet: 'mci', color: '#F2A93B', soft: '#FFECD1', darkSoft: 'rgba(242,169,59,0.16)', tint: '#F2A93B', glow: 'rgba(242,169,59,0.35)' },
  { key: 'go', label: '行きたい', icon: 'location', color: '#4FA3D1', soft: '#DCEEFB', darkSoft: 'rgba(79,163,209,0.16)', tint: '#4FA3D1', glow: 'rgba(79,163,209,0.35)' },
  { key: 'see', label: '見たい', icon: 'film', color: '#8B7CF6', soft: '#E7E2FF', darkSoft: 'rgba(139,124,246,0.16)', tint: '#8B7CF6', glow: 'rgba(139,124,246,0.35)' },
  { key: 'want', label: '欲しい', icon: 'pricetag', color: '#D66BC7', soft: '#F8DFF5', darkSoft: 'rgba(214,107,199,0.16)', tint: '#D66BC7', glow: 'rgba(214,107,199,0.35)' },
  { key: 'do', label: 'やりたい', icon: 'barbell', color: '#4FAF77', soft: '#DDF3E4', darkSoft: 'rgba(79,175,119,0.16)', tint: '#4FAF77', glow: 'rgba(79,175,119,0.35)' },
  { key: 'know', label: '知りたい', icon: 'book', color: '#D99A1F', soft: '#FDECC8', darkSoft: 'rgba(217,154,31,0.16)', tint: '#D99A1F', glow: 'rgba(217,154,31,0.35)' },
];

export function getCategory(key) {
  return CATEGORIES.find((c) => c.key === key) || CATEGORIES[0];
}

// カテゴリのチップ/プレースホルダー背景：ライトはパステル、ダークはカテゴリ色の薄いオーバーレイ。
export function catSoft(cat, mode) {
  if (!cat) return mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#EFEAE1';
  return mode === 'dark' ? cat.darkSoft : cat.soft;
}

// 「誰と」タグ：プライベートな相手をスタイリッシュなアイコンで（任意・1つ選ぶ）
export const WITH_OPTIONS = [
  { key: 'solo', label: 'ひとり', icon: 'person' },
  { key: 'partner', label: '恋人と', icon: 'heart' },
  { key: 'friend', label: '友達と', icon: 'people' },
  { key: 'family', label: '家族と', icon: 'home' },
];

export function getWith(key) {
  return WITH_OPTIONS.find((w) => w.key === key) || null;
}

// 通知の文面（カテゴリごとに“わくわく再点火”のトーン。絵文字なし）
export function reminderBody(categoryKey) {
  switch (categoryKey) {
    case 'eat': return 'まだ食べてないね。今週末どう？';
    case 'cook': return 'あの料理、作ってみない？レシピを見てみる？';
    case 'go': return 'まだ行けてないね。次の休み、行っちゃう？';
    case 'see': return 'まだ観てないね。今夜どう？';
    case 'want': return 'まだ手に入れてないね。ちょっと見てみる？';
    case 'do': return '少しだけやってみない？一歩で前に進むよ。';
    case 'know': return '気になってたこと、調べてみる？';
    default: return 'これ、まだ楽しみにしてるよね？';
  }
}

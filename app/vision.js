// ビジョン（欲求のストック）の純粋ロジック v2
// データは「カテゴリ（種別）」→「ビジョン（1つの願い）」の2階層のみ。
// ビジョン: { id, categoryId, title, timing, status, imageUri, memo, font, createdAt, achievedAt, order }
//   status: 'want'(叶えたい) / 'doing'(叶えている最中) / 'done'(叶った)
//   timing: null | { kind:'preset', key } | { kind:'label', text } | { kind:'date', date:'YYYY-MM-DD' }

// ビジョンカードの字体（3パターン）。字体名は App.js の FONT と対応。
export const VISION_FONTS = [
  { key: 'mincho', label: '明朝', family: 'ZenOldMincho_700Bold', spacing: 2 },
  { key: 'round', label: '丸ゴ', family: 'ZenMaruGothic_700Bold', spacing: 0.5 },
  { key: 'pop', label: 'ポップ', family: 'MochiyPopOne_400Regular', spacing: 1 },
];
export function visionFont(key) {
  return VISION_FONTS.find((f) => f.key === key) || VISION_FONTS[0];
}

// カテゴリの初期テンプレ（増減・改名・色変更は自由）。
export const VISION_CATEGORY_SEED = [
  { id: 'life', name: '生活習慣', color: '#FF7A45' },
  { id: 'career', name: 'キャリア&お金', color: '#D4AF6A' },
  { id: 'growth', name: '自己成長&学習', color: '#6E7FE0' },
  { id: 'play', name: '娯楽&旅行', color: '#23B39E' },
];
// カテゴリ追加時に選べる色（パステル寄り・被りにくい8色）。
export const CATEGORY_COLORS = ['#FF7A45', '#D4AF6A', '#6E7FE0', '#23B39E', '#E5679E', '#8E63C6', '#4FA3D1', '#7FB04B'];

// 3段階ステータス。'done' はボードから外れ「叶った夢」ページへ。
export const VISION_STAGES = [
  { key: 'want', label: '叶えたい', icon: 'sparkles-outline' },
  { key: 'doing', label: '叶えている最中', icon: 'flame' },
  { key: 'done', label: '叶った', icon: 'checkmark-circle' },
];
export function visionStage(key) {
  return VISION_STAGES.find((x) => x.key === key) || VISION_STAGES[0];
}
// ステータスのアクセント色（叶えている最中＝炎グラデ／叶えたい＝青紫／叶った＝金）。
export function stageAccent(status) {
  if (status === 'doing') return { grad: ['#FF7A45', '#FFB648'], icon: 'flame' };
  if (status === 'want') return { grad: ['#6E7FE0', '#93A6FF'], icon: 'sparkles' };
  if (status === 'done') return { grad: ['#D4AF6A', '#F0D28B'], icon: 'checkmark' };
  return null;
}

// 時期プリセット（数値管理はしない。ゆるく持たせる）。
export const TIMING_PRESETS = [
  { key: 'thisMonth', label: '今月中' },
  { key: 'thisYear', label: '今年中' },
  { key: 'halfYear', label: '半年以内' },
  { key: 'someday', label: 'いつか' },
];
// timing オブジェクトを表示用の文字列にする（無ければ null）。
export function timingLabel(timing) {
  if (!timing) return null;
  if (timing.kind === 'preset') {
    const p = TIMING_PRESETS.find((x) => x.key === timing.key);
    return p ? p.label : null;
  }
  if (timing.kind === 'label') return (timing.text || '').trim() || null;
  if (timing.kind === 'date') return formatTimingDate(timing.date);
  return null;
}
// 'YYYY-MM-DD' → '2026/8/30' のように整形（不正なら元の文字列）。
export function formatTimingDate(dateStr) {
  if (!dateStr) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return dateStr;
  return `${Number(m[1])}/${Number(m[2])}/${Number(m[3])}`;
}

// 願ってから叶うまでの日数（createdAt→achievedAt）。演出コピー用。
export function daysToAchieve(vision) {
  if (!vision || vision.createdAt == null || vision.achievedAt == null) return null;
  const DAY = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.round((vision.achievedAt - vision.createdAt) / DAY));
}

// 旧スロット（v1）を新ビジョン（v2）へ移行。v2ならそのまま返す。
export function migrateVision(slot, now = Date.now()) {
  if (!slot) return slot;
  if (slot.title !== undefined && slot.createdAt !== undefined && slot.status !== 'planning') return slot; // 既にv2
  const status = slot.status === 'doing' ? 'doing' : (slot.status === 'want' || slot.status === 'done' ? slot.status : 'want');
  return {
    id: slot.id,
    categoryId: slot.categoryId ?? null,
    title: slot.title ?? slot.label ?? '',
    timing: slot.timing ?? null,
    status,
    imageUri: slot.imageUri ?? null,
    memo: slot.memo ?? slot.detail ?? '',
    favorite: slot.favorite ?? false,
    font: slot.font ?? 'mincho',
    createdAt: slot.createdAt ?? now,
    achievedAt: slot.achievedAt ?? (status === 'done' ? now : null),
    order: slot.order ?? 0,
  };
}
export function migrateVisions(list, now = Date.now()) {
  return (list || []).map((s) => migrateVision(s, now));
}

// アクティブなビジョンを「表紙(hero)」「カテゴリ別セクション」に、達成分を「done」に分ける。
// hero は『叶えている最中』の写真つきを優先、無ければ写真つき先頭。空セクションは除く。
export function buildVisionBoard(visions, categories = []) {
  const list = visions || [];
  const active = list.filter((v) => v.status !== 'done');
  const done = list.filter((v) => v.status === 'done').slice().sort((a, b) => (b.achievedAt || 0) - (a.achievedAt || 0));
  const withImg = active.filter((v) => v.imageUri);
  const hero = withImg.find((v) => v.status === 'doing') || withImg[0]
    || active.find((v) => v.status === 'doing') || active[0] || null;
  const rest = active.filter((v) => !hero || v.id !== hero.id);
  const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0);
  const sections = categories
    .map((c) => ({ ...c, items: rest.filter((v) => v.categoryId === c.id).slice().sort(byOrder) }))
    .filter((sec) => sec.items.length > 0);
  const known = new Set(categories.map((c) => c.id));
  const uncategorized = rest.filter((v) => !v.categoryId || !known.has(v.categoryId)).slice().sort(byOrder);
  if (uncategorized.length) sections.push({ id: '__none', name: '未分類', color: '#9A938A', items: uncategorized });
  return { hero, sections, done };
}

// 「叶った夢」一覧：達成日の新しい順。カテゴリ指定があればそれだけに絞る。
export function achievedGallery(visions, categoryId = null) {
  return (visions || [])
    .filter((v) => v.status === 'done' && (!categoryId || v.categoryId === categoryId))
    .slice()
    .sort((a, b) => (b.achievedAt || 0) - (a.achievedAt || 0));
}

export function getCategoryById(categories, id) {
  return (categories || []).find((c) => c.id === id) || null;
}

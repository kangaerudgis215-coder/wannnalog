// タイトル文字列から「カテゴリ」を推測する純粋関数（テストしやすい形）。
// 将来のOCR自動入力（写真の文字→自動でカテゴリ・タイトルを埋める）の下ごしらえ。
// 今はSaveModalで、タイトル入力に合わせてカテゴリ候補を自動選択するのに使う。

import { CATEGORIES } from './theme';

// カテゴリごとの手がかりキーワード。一致数が一番多いカテゴリを採用する。
const CATEGORY_KEYWORDS = {
  eat: ['食べ', 'ランチ', 'ディナー', 'カフェ', 'レストラン', 'ラーメン', '寿司', '焼肉', 'スイーツ', 'グルメ', '定食', '居酒屋', 'ケーキ'],
  cook: ['レシピ', '作り方', '手作り', 'クックパッド', '下ごしらえ'],
  go: ['行きたい', '旅行', '観光', 'ホテル', '温泉', 'ビーチ', '旅館', '絶景', 'ツアー'],
  see: ['映画', '上映', '配信', 'ドラマ', 'アニメ', 'ライブ', 'コンサート', '展覧会', '舞台', '公演'],
  want: ['欲しい', '購入', '通販', 'セール', 'グッズ', 'コスメ', 'ガジェット'],
  do: ['やってみたい', '体験', 'チャレンジ', '挑戦', '習い事', 'ワークショップ', 'レッスン'],
  know: ['知りたい', '調べる', 'とは', '解説', '仕組み'],
};

// テキストに最も手がかりが多いカテゴリのキーを返す（一致無しは null＝推測しない）
export function guessCategory(text) {
  const t = (text || '').trim();
  if (!t) return null;
  let best = null;
  let bestScore = 0;
  for (const cat of CATEGORIES) {
    const words = CATEGORY_KEYWORDS[cat.key] || [];
    const score = words.reduce((n, w) => (t.includes(w) ? n + 1 : n), 0);
    if (score > bestScore) { bestScore = score; best = cat.key; }
  }
  return best;
}

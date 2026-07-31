// テキストからの自動入力（下ごしらえ）
// 将来、写真の文字読み取り（OCR）や共有シートで受け取った文章からも
// タイトル・カテゴリを自動で埋められるように、判定ロジックを先に純粋関数として用意する。
// いまは「タイトルを自分で書いたとき」のカテゴリ自動推測にも使う（ネットワーク不要・無料）。

// カテゴリ推測に使うキーワード（優先度順＝先に書いたカテゴリが勝つ）
const CATEGORY_KEYWORDS = [
  { key: 'eat', words: ['食べたい', 'ランチ', 'ディナー', 'グルメ', '居酒屋', 'レストラン', 'カフェ', 'ラーメン', '焼肉', '寿司', 'スイーツ', '食べログ'] },
  { key: 'cook', words: ['作りたい', 'レシピ', '作り方', 'クックパッド', '手作り'] },
  { key: 'go', words: ['行きたい', '旅行', '観光', '温泉', '美術館', '神社', '遊園地'] },
  { key: 'see', words: ['見たい', '映画', 'ドラマ', 'アニメ', '配信', '上映'] },
  { key: 'want', words: ['欲しい', '購入', '買いたい', 'セール', '新作'] },
  { key: 'do', words: ['やりたい', '挑戦', '体験', '習い事'] },
  { key: 'know', words: ['知りたい', '調べたい', '講座'] },
];

// テキスト（自分で書いた文章・OCR結果など）からカテゴリを推測（純粋関数）
export function guessCategoryFromText(text) {
  const s = (text || '').trim();
  if (!s) return null;
  for (const { key, words } of CATEGORY_KEYWORDS) {
    if (words.some((w) => s.includes(w))) return key;
  }
  return null;
}

// SNSのおまけ文言だけの行（いいね数・シェア等）を除くための判定
const NOISE_LINE = /^[\d,]+\s*(いいね|件の(コメント|返信)|フォロワー|フォロー中|シェア|リツイート)$/;

// 複数行のテキスト（写真から読み取った文章の貼り付け等）から、タイトルらしい1行を取り出す（純粋関数）
// ハッシュタグだけの行・数字や日付だけの行・SNSのおまけ文言は飛ばす。
export function extractTitleFromText(text) {
  const s = (text || '').trim();
  if (!s) return null;
  const lines = s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (NOISE_LINE.test(line)) continue;
    if (/^#/.test(line)) continue;
    if (/^[\d\s.:/\-]+$/.test(line)) continue;
    const cleaned = line.replace(/#\S+/g, '').trim();
    if (cleaned) return cleaned.length > 40 ? cleaned.slice(0, 40).trim() : cleaned;
  }
  return null;
}

// タイトル・カテゴリをまとめて推測（純粋関数）
export function parseQuickText(text) {
  return { title: extractTitleFromText(text), category: guessCategoryFromText(text) };
}

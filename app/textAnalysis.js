// 貼り付けたテキスト（スクショの文字をiPhoneの「テキストを選択」でコピーした物など）から
// タイトル・カテゴリを推測する。抽出ロジックは純粋関数にしてテストできる形にする。
// 将来のOCR自動入力（画像→文字→この解析）の下ごしらえも兼ねる。

const CATEGORY_KEYWORDS = {
  cook: ['レシピ', '作り方', '材料', '大さじ', '小さじ', '下ごしらえ', 'クックパッド'],
  eat: ['ランチ', 'ディナー', '居酒屋', 'カフェ', 'レストラン', 'グルメ', '定食', 'ラーメン', '焼肉', '食べ放題', '食べログ'],
  go: ['観光', '旅行', 'スポット', '絶景', '美術館', '神社', '温泉', 'アクセス', '営業時間', '営業案内'],
  see: ['映画', 'ドラマ', 'アニメ', '配信中', '予告編', 'あらすじ', 'シーズン', '公開日'],
  want: ['欲しい', '購入', 'セール', '在庫', '送料無料', 'クーポン', 'カラー展開'],
  do: ['やってみたい', '体験', '教室', 'レッスン', '習い事'],
  know: ['とは', 'まとめ', 'やり方', '仕組み'],
};

// テキスト中のキーワード出現数がいちばん多いカテゴリを返す（純粋関数）
export function guessCategoryFromText(text) {
  if (!text) return null;
  let best = null;
  let bestScore = 0;
  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = words.reduce((n, w) => (text.includes(w) ? n + 1 : n), 0);
    if (score > bestScore) { best = cat; bestScore = score; }
  }
  return best;
}

// 記号だけ・極端に短い行を除いた「タイトルらしい1行」を選ぶ
function isNoisyLine(line) {
  return line.length < 2 || /^[-=・*#>]+$/.test(line);
}

// 複数行の貼り付けテキストから、タイトルに使えそうな1行を取り出す（純粋関数）
export function extractTitleFromText(text) {
  if (!text) return null;
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return null;
  const candidate = lines.find((l) => !isNoisyLine(l)) || lines[0];
  // 「タイトル - サイト名」「タイトル｜サイト名」の区切りは前半だけ採用
  let title = candidate.split(/\s+[-–]\s+|\s*[|｜]\s*/)[0].trim();
  // 長すぎる場合は句読点の区切りで自然に切る
  if (title.length > 40) {
    const cut = title.slice(0, 40);
    const punctIdx = Math.max(cut.lastIndexOf('。'), cut.lastIndexOf('、'));
    title = punctIdx > 10 ? cut.slice(0, punctIdx) : cut;
  }
  return title || null;
}

// タイトル推測とカテゴリ推測をまとめて行う
export function analyzeText(text) {
  return {
    title: extractTitleFromText(text),
    category: guessCategoryFromText(text),
  };
}

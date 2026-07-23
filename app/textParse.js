// 自由入力テキスト（手入力・将来のOCR読み取り結果）から「したい」カテゴリを推測する。
// 純粋関数＝テストしやすい形にする。ネイティブビルドが要るOCR自体は未実装だが、
// 「テキスト→カテゴリ」の解析だけは今から作れて、OCR実装後すぐに配線できる（機能バックログA参照）。
import { CATEGORIES } from './theme';

// トピックのキーワード（カテゴリの動詞自体が書かれていない場合のフォールバック）
const TOPIC_KEYWORDS = {
  eat: /グルメ|ランチ|ディナー|ラーメン|寿司|焼肉|カフェ|居酒屋|レストラン|スイーツ|ケーキ|定食|弁当|食べ放題/,
  cook: /レシピ|作り方|手作り/,
  go: /旅行|観光|温泉|旅館|水族館|動物園|美術館|神社|ビーチ/,
  see: /映画|ドラマ|アニメ|配信|舞台|ミュージカル|ライブ|コンサート|展覧会/,
  want: /新作|セール|購入/,
  know: /資格|セミナー|講座|勉強/,
  do: /ジム|ヨガ|ダイビング|キャンプ|登山|マラソン/,
};

export function guessCategoryFromText(text) {
  const s = (text || '').trim();
  if (!s) return null;
  // 「食べたい」「行きたい」など、カテゴリ名そのものが書かれていればそれを優先
  const byLabel = CATEGORIES.find((c) => s.includes(c.label));
  if (byLabel) return byLabel.key;
  for (const c of CATEGORIES) {
    const re = TOPIC_KEYWORDS[c.key];
    if (re && re.test(s)) return c.key;
  }
  return null;
}

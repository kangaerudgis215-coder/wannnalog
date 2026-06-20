// カテゴリ別の「行動への導線」リンク（純粋関数＝テストしやすい）
// 方針：日本語クエリでも確実に動く経路（Googleマップ／Google検索／楽天／Amazon）を使う。
// 文字化けやトップページ止まりを避けるため、ブランド固有の不安定な検索URLは使わない。

const enc = encodeURIComponent;
const google = (q) => `https://www.google.com/search?q=${enc(q)}`;
const maps = (q) => `https://www.google.com/maps/search/?api=1&query=${enc(q)}`;

export function actionLinks(categoryKey, title) {
  const t = (title || '').trim();
  switch (categoryKey) {
    case 'eat':
      return [
        { label: '🗺️ 地図で店を探す', url: maps(t) },
        { label: '🍴 食べログで探す', url: google(t + ' 食べログ') },
      ];
    case 'go':
      return [
        { label: '🗺️ 地図で探す', url: maps(t) },
        { label: '🔎 ネットで調べる', url: google(t) },
      ];
    case 'want':
      return [
        { label: '🛍️ 楽天で探す', url: `https://search.rakuten.co.jp/search/mall/${enc(t)}/` },
        { label: '📦 Amazonで探す', url: `https://www.amazon.co.jp/s?k=${enc(t)}` },
      ];
    case 'see':
      return [
        { label: '🎬 配信を探す', url: google(t + ' 配信') },
        { label: '🔎 ネットで調べる', url: google(t) },
      ];
    case 'know':
    case 'do':
    default:
      return [
        { label: '🔎 ネットで調べる', url: google(t) },
      ];
  }
}

// 期限タグの表示名（純粋関数）
export function dueLabel(dueTag) {
  switch (dueTag) {
    case 'today': return '今日';
    case 'thisWeek': return '今週';
    case 'nextWeek': return '来週';
    case 'thisMonth': return '今月';
    case 'q1': return 'Q1';
    case 'q2': return 'Q2';
    case 'q3': return 'Q3';
    case 'q4': return 'Q4';
    default: return null;
  }
}

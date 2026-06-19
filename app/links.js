// カテゴリ別の「行動への導線」リンクを返す（純粋関数＝テストしやすい形）
// タイトルから検索リンクを組み立てる。MVPは「検索リンク」で十分（予約APIは将来）。

const enc = encodeURIComponent;

export function actionLinks(categoryKey, title) {
  const t = (title || '').trim();
  switch (categoryKey) {
    case 'eat':
      return [
        { label: '🍴 食べログで探す', url: `https://www.tabelog.com/rstLst/?sw=${enc(t)}` },
        { label: '🗺️ Googleマップで探す', url: `https://www.google.com/maps/search/?api=1&query=${enc(t)}` },
      ];
    case 'go':
      return [
        { label: '🗺️ Googleマップで探す', url: `https://www.google.com/maps/search/?api=1&query=${enc(t)}` },
        { label: '🏨 じゃらんで探す', url: `https://www.jalan.net/uw/uwp2011/uww2011init.do?keyword=${enc(t)}` },
      ];
    case 'want':
      return [
        { label: '🛍️ 楽天で探す', url: `https://search.rakuten.co.jp/search/mall/${enc(t)}/` },
        { label: '📦 Amazonで探す', url: `https://www.amazon.co.jp/s?k=${enc(t)}` },
      ];
    case 'see':
      return [
        { label: '🎬 配信を探す', url: `https://www.google.com/search?q=${enc(t + ' 配信')}` },
      ];
    case 'know':
    case 'do':
    default:
      return [
        { label: '🔎 Googleで調べる', url: `https://www.google.com/search?q=${enc(t)}` },
      ];
  }
}

// 期限タグの表示名（純粋関数）
export function dueLabel(dueTag) {
  switch (dueTag) {
    case 'thisWeek': return '今週';
    case 'thisMonth': return '今月';
    default: return null;
  }
}

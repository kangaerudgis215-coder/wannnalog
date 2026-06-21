// アフィリエイトURL生成（純粋関数・Webページ専用）。
// ※重要：アプリ内では使わない（Apple 3.2.2 回避のため）。
//   将来の「ギフト共有Webページ」でのみ使用する想定の土台。
//   実運用では「もしもアフィリエイト LinkSwitch」がWeb側で自動変換する手もある。

function appendParam(url, key, val) {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}${key}=${encodeURIComponent(val)}`;
}

// 元リンク → アフィリリンク。対応外や ID 未設定はそのまま返す。
// ids: { rakuten?: 'アフィリID', amazon?: 'アソシエイトタグ' }
export function buildAffiliateUrl(rawUrl, ids = {}) {
  if (!rawUrl || typeof rawUrl !== 'string') return rawUrl || null;

  // 楽天：アフィリエイトリンク経由
  if (/rakuten\.co\.jp/i.test(rawUrl) && ids.rakuten) {
    return `https://hb.afl.rakuten.co.jp/hgc/${ids.rakuten}/?pc=${encodeURIComponent(rawUrl)}&m=${encodeURIComponent(rawUrl)}`;
  }
  // Amazon：アソシエイトタグ付与
  if (/(amazon\.co\.jp|amzn\.to)/i.test(rawUrl) && ids.amazon) {
    return appendParam(rawUrl, 'tag', ids.amazon);
  }
  // それ以外はそのまま（Web側 LinkSwitch が自動変換する想定）
  return rawUrl;
}

// 商品名から「買える検索リンク」を作る（ギフトページ用の素のURL）。
// これを buildAffiliateUrl に通すとアフィリ化される。
export function shopSearchUrl(store, query) {
  const q = encodeURIComponent(query || '');
  if (store === 'rakuten') return `https://search.rakuten.co.jp/search/mall/${q}/`;
  return `https://www.amazon.co.jp/s?k=${q}`; // 既定は Amazon
}

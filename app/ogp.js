// URL保存のための補助。OGP（リンク先のタイトル・画像・説明）を取得する。
// 抽出ロジックは純粋関数にしてテストできる形にする。

export function isUrl(text) {
  if (!text) return false;
  return /^https?:\/\/\S+$/i.test(text.trim());
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

// HTML文字列から og:title / 画像 / description を抜き出す（純粋関数）
// 画像は og:image → twitter:image → <link rel="image_src"> の順でフォールバック。
export function parseOgp(html) {
  if (!html) return { title: null, image: null, description: null };
  const pick = (re) => {
    const m = html.match(re);
    return m ? decodeEntities(m[1].trim()) : null;
  };
  const metaContent = (prop) =>
    pick(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i')) ||
    pick(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, 'i'));

  const title = metaContent('og:title') || pick(/<title[^>]*>([^<]+)<\/title>/i);
  const image =
    metaContent('og:image') ||
    metaContent('twitter:image') ||
    metaContent('twitter:image:src') ||
    pick(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i);
  const description = metaContent('og:description') || metaContent('description');
  return { title, image, description };
}

// 画像URLを絶対URLに解決（プロトコル相対・ルート相対・パス相対に対応）。純粋関数。
export function resolveImage(image, baseUrl) {
  if (!image) return null;
  if (image.startsWith('//')) return 'https:' + image;
  if (/^https?:\/\//i.test(image)) return image;
  const m = (baseUrl || '').match(/^(https?:\/\/[^/]+)(\/[^?#]*)?/i);
  if (!m) return image;
  const origin = m[1];
  if (image.startsWith('/')) return origin + image;
  const basePath = (m[2] || '/').replace(/[^/]*$/, '');
  return origin + basePath + image;
}

// 実際にリンク先を取得して OGP を返す（失敗しても落ちない）
// ブラウザに近いヘッダーにすると、OGPを返すサイトが増える（成功率が少し上がる）。
export async function fetchOgp(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en;q=0.8',
      },
    });
    const html = await res.text();
    const ogp = parseOgp(html);
    // res.url はリダイレクト後の最終URL。短縮マップURL（maps.app.goo.gl）でも店名を拾える。
    const finalUrl = res.url || url;
    return { ...ogp, image: resolveImage(ogp.image, finalUrl), finalUrl };
  } catch (e) {
    return { title: null, image: null, description: null, finalUrl: url };
  }
}

// Googleマップのリンク判定（og:image が汎用ピンなので画像は使わない）
export function isMapsUrl(url) {
  return /google\.[^/]+\/maps|maps\.google\.|goo\.gl\/maps|maps\.app\.goo\.gl/i.test(url || '');
}

// ドメインから「したい」カテゴリを推測（純粋関数・保存時の初期選択に使う）
export function guessCategoryFromUrl(url) {
  const u = (url || '').toLowerCase();
  if (/amazon\.|amzn\.|rakuten\.|zozo\.jp|zozotown|mercari\.|paypaymall|shopping\.yahoo|uniqlo|gu-global|shein\.|qoo10|buyma/.test(u)) return 'want';
  if (/youtube\.|youtu\.be|netflix\.|hulu\.|disneyplus|primevideo|eiga\.|filmarks/.test(u)) return 'see';
  if (/tabelog\.|gurunavi\.|hotpepper|retty\.|foodie/.test(u)) return 'eat';
  if (isMapsUrl(u)) return 'go';
  return null;
}

// 汎用タイトル（店名でない）の判定
const GENERIC_TITLE = /^(google\s*マップ|google\s*maps|マップ|ストリートビュー)$/i;

// Googleマップ等のURLから店名/場所名を復元（純粋関数）
export function extractPlaceFromUrl(url) {
  if (!url) return null;
  const m = url.match(/\/maps\/place\/([^/@?]+)/i);
  if (!m) return null;
  try {
    const name = decodeURIComponent(m[1].replace(/\+/g, ' ')).trim();
    return name || null;
  } catch (e) {
    return m[1].replace(/\+/g, ' ').trim() || null;
  }
}

// 取得タイトルを「店名/品名」に整える（純粋関数）
// 優先：良い非汎用タイトル > URL由来の店名 > fallback（入力）
export function cleanTitle(rawTitle, url, fallback) {
  const place = extractPlaceFromUrl(url);
  let t = (rawTitle || '').trim();
  // 「店名 - Google マップ」→ 先頭の店名
  if (t.includes(' - ')) {
    const head = t.split(' - ')[0].trim();
    if (head && !GENERIC_TITLE.test(head)) t = head;
  }
  if (!t || GENERIC_TITLE.test(t)) {
    return place || (fallback || '').trim() || null;
  }
  return t;
}

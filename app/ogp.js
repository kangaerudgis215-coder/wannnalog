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
export async function fetchOgp(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await res.text();
    const ogp = parseOgp(html);
    return { ...ogp, image: resolveImage(ogp.image, url) };
  } catch (e) {
    return { title: null, image: null, description: null };
  }
}

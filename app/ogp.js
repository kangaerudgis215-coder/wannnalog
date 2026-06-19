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

// HTML文字列から og:title / og:image / description を抜き出す（純粋関数）
export function parseOgp(html) {
  if (!html) return { title: null, image: null, description: null };
  const pick = (re) => {
    const m = html.match(re);
    return m ? decodeEntities(m[1].trim()) : null;
  };
  const title =
    pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
    pick(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i) ||
    pick(/<title[^>]*>([^<]+)<\/title>/i);
  const image =
    pick(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
    pick(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  const description =
    pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
    pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  return { title, image, description };
}

// プロトコル相対URL（//example.com/x.jpg）を https に正規化
export function normalizeImage(image) {
  if (!image) return null;
  if (image.startsWith('//')) return 'https:' + image;
  return image;
}

// 実際にリンク先を取得して OGP を返す（失敗しても落ちない）
export async function fetchOgp(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await res.text();
    const ogp = parseOgp(html);
    return { ...ogp, image: normalizeImage(ogp.image) };
  } catch (e) {
    return { title: null, image: null, description: null };
  }
}

// SNSリンクの解析（純粋関数・無料）。
// 対応：YouTube / X(Twitter) / Instagram / TikTok
// サムネ画像URLは「API不要で作れる YouTube のみ」対応。
// それ以外はリンクを保存しつつ、写真は手動 or プレースホルダー。

// プラットフォームごとの表示名とアイコン（Ionicons 名）
const META = {
  youtube: { label: 'YouTube', icon: 'logo-youtube' },
  x: { label: 'X', icon: 'logo-twitter' },
  instagram: { label: 'Instagram', icon: 'logo-instagram' },
  tiktok: { label: 'TikTok', icon: 'logo-tiktok' },
};

// プラットフォームキー → 表示名/アイコン（不明・汎用リンクは「リンク」）
export function snsMeta(platform) {
  return META[platform] || { label: 'リンク', icon: 'link' };
}

// URL からホスト名を取り出す（www. は除去）。URLでなければ null。
// React Native(Hermes) の URL 実装に依存しないよう、正規表現で取り出す。
function hostOf(url) {
  const m = /^https?:\/\/([^/?#]+)/i.exec(url || '');
  return m ? m[1].replace(/^www\./i, '').toLowerCase() : null;
}

// YouTube の動画ID を URL から取り出す（watch / youtu.be / shorts / embed / live）。
export function youtubeId(url) {
  if (!url || typeof url !== 'string') return null;
  let m = url.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
  if (m) return m[1];
  m = url.match(/[?&]v=([A-Za-z0-9_-]{6,})/);
  if (m) return m[1];
  m = url.match(/\/(?:shorts|embed|v|live)\/([A-Za-z0-9_-]{6,})/);
  if (m) return m[1];
  return null;
}

// SNSリンクを解析。対応外・非URLは null。
// 返り値：{ platform, url, thumbnail }（thumbnail は YouTube のみ。他は null）
export function parseSnsLink(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const url = raw.trim();
  const host = hostOf(url);
  if (!host) return null;

  if (host === 'youtu.be' || host.endsWith('youtube.com')) {
    const id = youtubeId(url);
    return { platform: 'youtube', url, thumbnail: id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null };
  }
  if (host === 'x.com' || host === 'twitter.com' || host.endsWith('.twitter.com')) {
    return { platform: 'x', url, thumbnail: null };
  }
  if (host === 'instagram.com' || host.endsWith('.instagram.com')) {
    return { platform: 'instagram', url, thumbnail: null };
  }
  if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) {
    return { platform: 'tiktok', url, thumbnail: null };
  }
  return null;
}

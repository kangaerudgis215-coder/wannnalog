// 保存する項目データの組み立て（純粋関数＝テストしやすい）

// クイック保存（写真/リンクから）の下書きを、保存用のアイテムに変換
export function buildQuickCaptureItem(d) {
  return {
    title: (d.title || '').trim() || '（無題）',
    category: d.category || null,
    imageUri: d.imageUri || null,
    heat: 2,
    due: 'none',
    withWho: null,
    reminder: { remind: '3days' },
    link: d.link ? { url: d.link, platform: null } : null,
  };
}

// 保存シートの「画像」「リンク情報」を、選択画像とSNS認識結果から決める
export function resolveSaveImageAndLink({ image, sns, link }) {
  const imageUri = image || (sns ? sns.thumbnail : null);
  const linkInfo = sns
    ? { url: sns.url, platform: sns.platform }
    : ((link || '').trim() ? { url: link.trim(), platform: null } : null);
  return { imageUri, linkInfo };
}

// 新規アイテムの組み立て：保存フォームの入力値から、保存用アイテムを作る（通知IDは未予約でnull）
export function buildNewItem(data, now = Date.now()) {
  const d = data || {};
  const { title, category, due, imageUri, heat, reminder, link, withWho } = d;
  const rem = reminder || { remind: '3days' };
  return {
    id: String(now), title, category: category || null, dueTag: due || 'none', imageUri: imageUri || null,
    heat: heat || 2, withWho: withWho || null, sourceUrl: link?.url || null, sourcePlatform: link?.platform || null,
    ...rem, notifId: null, createdAt: now, doneAt: null,
  };
}

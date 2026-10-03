// バックアップ書き出し・読み込み用のデータ組み立て・検証（純粋関数）。

// 読み込んだJSONがWannaLogのバックアップとして扱える形か確認する。
export function isValidBackupPayload(data) {
  return !!data && Array.isArray(data.items);
}

export function buildBackupPayload(state, now = Date.now()) {
  const { items, visionSlots, visionTitle, visionCats, timingLabels, profileName, garden, mode, density } = state;
  return {
    app: 'WannaLog', version: 1, exportedAt: new Date(now).toISOString(),
    items, vision: { slots: visionSlots, title: visionTitle, categories: visionCats, timingLabels },
    profile: { name: profileName }, garden,
    prefs: { theme: mode, density },
  };
}

// 読み込んだバックアップから、復元に使う値を取り出す（無い項目は null / 既定値）。
export function restoreValuesFromBackup(data) {
  const v = data.vision;
  return {
    vision: v ? { slots: v.slots, categories: v.categories, timingLabels: v.timingLabels, title: v.title || 'MY VISION' } : null,
    profileName: data.profile?.name || null,
    garden: data.garden || null,
    theme: data.prefs?.theme || null,
    density: data.prefs?.density || null,
  };
}

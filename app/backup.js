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

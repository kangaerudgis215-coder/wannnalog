// バックアップ書き出し用のデータ組み立て（純粋関数）。

export function buildBackupPayload(state, now = Date.now()) {
  const { items, visionSlots, visionTitle, visionCats, timingLabels, profileName, garden, mode, density } = state;
  return {
    app: 'WannaLog', version: 1, exportedAt: new Date(now).toISOString(),
    items, vision: { slots: visionSlots, title: visionTitle, categories: visionCats, timingLabels },
    profile: { name: profileName }, garden,
    prefs: { theme: mode, density },
  };
}

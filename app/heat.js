// 熱量（欲しい度・本気度）の純粋ロジック。テストしやすい形。
// 1=気になる / 2=中(既定) / 3=本気。弱い欲求(気になる)も拾い、通知を出し分ける燃料。

export const HEAT_OPTIONS = [
  { key: 1, label: '気になる' },
  { key: 2, label: '中' },
  { key: 3, label: '本気' },
];

export function heatLabel(h) {
  const o = HEAT_OPTIONS.find((x) => x.key === h);
  return o ? o.label : '中';
}

// 熱量から「思い出す（通知）」の既定を出し分け：
// 本気=明日そっと / 中=3日後 / 気になる=通知なし（将来は値下がり時だけ）
export function defaultRemindForHeat(h) {
  switch (h) {
    case 3: return 'tomorrow';
    case 1: return 'none';
    default: return '3days';
  }
}

// 並べ替え用：熱量が高いものを上に、同じなら新しい順
export function byHeatThenNew(a, b) {
  const ha = a.heat || 2; const hb = b.heat || 2;
  if (hb !== ha) return hb - ha;
  return (b.createdAt || 0) - (a.createdAt || 0);
}

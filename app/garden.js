// 箱庭：達成数から植物の成長段階を出す（純粋ロジック・テストしやすい形）。
// G1は1種「星灯樹」を5段階で育てる最小ループ。
// アートは将来「同梱PNG」に差し替える前提（ここは数値ロジックのみ）。

export const PLANT = {
  key: 'startree',
  name: '星灯樹',
  reading: 'ほしともしぎ',
  desc: '叶えるたびに光をためる木。夜空にひとつ、あなただけの星を。',
  // 各段階：到達に必要な「累計達成数」と段階名
  stages: [
    { lv: 1, need: 0, label: '種' },
    { lv: 2, need: 1, label: '双葉' },
    { lv: 3, need: 3, label: '幼木' },
    { lv: 4, need: 6, label: '成木' },
    { lv: 5, need: 10, label: '幻想樹' },
  ],
};

function norm(count) { return Math.max(0, Math.floor(count || 0)); }

// 累計達成数 → 現在の段階(1〜5)
export function stageForCount(count) {
  const c = norm(count);
  let lv = 1;
  for (const s of PLANT.stages) if (c >= s.need) lv = s.lv;
  return lv;
}

// 次の段階までの進捗
// 返り値：{ lv, label, maxed, remaining, ratio(0-1), nextLabel? }
export function growthProgress(count) {
  const c = norm(count);
  const lv = stageForCount(c);
  const cur = PLANT.stages[lv - 1];
  const next = PLANT.stages[lv]; // lv が5なら undefined
  if (!next) return { lv, label: cur.label, maxed: true, remaining: 0, ratio: 1 };
  const span = next.need - cur.need;
  const done = c - cur.need;
  return {
    lv, label: cur.label, maxed: false,
    remaining: next.need - c,
    ratio: span > 0 ? Math.min(1, Math.max(0, done / span)) : 1,
    nextLabel: next.label,
  };
}

// コイン（達成1回 = 10コイン。将来ショップでインテリア等と交換）
export function coinsForCount(count) { return norm(count) * 10; }

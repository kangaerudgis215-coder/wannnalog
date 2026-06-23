// 箱庭：成長ロジック（純粋関数・テストしやすい形）。
// G2：成長は「水やり（1日5回まで・毎日の癒し）」＋「達成ボーナス（叶えると大きく伸びる）」の合わせ技。
//      → WannaLog の核（叶える）と癒し（育てる）を両立させる。
// アートは将来「同梱ドット絵PNG」に差し替える前提（ここは数値と時刻ロジックのみ）。

export const WATER_MAX = 5;     // 1日に水やりできる回数
export const ACHIEVE_GAIN = 3;  // 達成1回でたまる成長（ボーナス）
// 水やり1回 = +1 成長

export const PLANT = {
  key: 'startree',
  name: '星灯樹',
  reading: 'ほしともしぎ',
  desc: '叶えるたび、水をやるたびに光をためる木。夜空にひとつ、あなただけの星を。',
  // 到達に必要な「累計成長ポイント」と段階名
  stages: [
    { lv: 1, need: 0, label: '種' },
    { lv: 2, need: 5, label: '双葉' },
    { lv: 3, need: 15, label: '幼木' },
    { lv: 4, need: 30, label: '成木' },
    { lv: 5, need: 50, label: '幻想樹' },
  ],
};

function norm(n) { return Math.max(0, Math.floor(n || 0)); }

// 累計成長ポイント → 現在の段階(1〜5)
export function stageForCount(points) {
  const c = norm(points);
  let lv = 1;
  for (const s of PLANT.stages) if (c >= s.need) lv = s.lv;
  return lv;
}

// 次の段階までの進捗 { lv, label, maxed, remaining, ratio, nextLabel? }
export function growthProgress(points) {
  const c = norm(points);
  const lv = stageForCount(c);
  const cur = PLANT.stages[lv - 1];
  const next = PLANT.stages[lv];
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

// コイン（達成1回 = 10コイン。将来ショップでインテリアと交換）
export function coinsForCount(doneCount) { return norm(doneCount) * 10; }

// 今日のキー（日付が変わったら水やり回数をリセットするために使う）
export function todayKey(d = new Date()) { return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }

// 今日あと何回 水やりできるか
export function remainingWaterToday(state, key = todayKey()) {
  const used = state && state.waterDate === key ? norm(state.waterCount) : 0;
  return Math.max(0, WATER_MAX - used);
}

// 時刻 → 朝昼夕夜（外の光・あいさつ・空の色）
export function dayPeriod(hour = new Date().getHours()) {
  const h = ((hour % 24) + 24) % 24;
  if (h < 5) return { key: 'night', greet: 'こんばんは', icon: 'moon', sky: '#1B2447' };
  if (h < 10) return { key: 'morning', greet: 'おはよう', icon: 'partly-sunny', sky: '#BFE0FF' };
  if (h < 17) return { key: 'day', greet: 'こんにちは', icon: 'sunny', sky: '#9FD0FF' };
  if (h < 20) return { key: 'evening', greet: 'おつかれさま', icon: 'partly-sunny', sky: '#FFB27A' };
  return { key: 'night', greet: 'こんばんは', icon: 'moon', sky: '#1B2447' };
}

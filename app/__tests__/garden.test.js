import {
  PLANT, stageForCount, growthProgress, coinsForCount,
  WATER_MAX, ACHIEVE_GAIN, todayKey, remainingWaterToday, waterGarden, dayPeriod,
} from '../garden';

describe('stageForCount', () => {
  test('累計成長ポイントに応じた段階', () => {
    expect(stageForCount(0)).toBe(1);
    expect(stageForCount(5)).toBe(2);
    expect(stageForCount(14)).toBe(2);
    expect(stageForCount(15)).toBe(3);
    expect(stageForCount(30)).toBe(4);
    expect(stageForCount(50)).toBe(5);
    expect(stageForCount(999)).toBe(5);
  });
  test('マイナス・未定義は0扱い', () => {
    expect(stageForCount(-5)).toBe(1);
    expect(stageForCount(undefined)).toBe(1);
  });
});

describe('growthProgress', () => {
  test('種(Lv1)→双葉(need5)', () => {
    const p = growthProgress(0);
    expect(p.lv).toBe(1);
    expect(p.remaining).toBe(5);
    expect(p.ratio).toBe(0);
    expect(p.nextLabel).toBe('双葉');
  });
  test('途中段階の進捗', () => {
    const p = growthProgress(20); // 幼木(15)→成木(30)、span15 done5
    expect(p.lv).toBe(3);
    expect(p.remaining).toBe(10);
    expect(p.ratio).toBeCloseTo(1 / 3, 5);
  });
  test('最大段階は maxed', () => {
    const p = growthProgress(50);
    expect(p.maxed).toBe(true);
    expect(p.ratio).toBe(1);
  });
});

describe('coinsForCount', () => {
  test('達成1回=10コイン', () => {
    expect(coinsForCount(0)).toBe(0);
    expect(coinsForCount(5)).toBe(50);
  });
});

describe('水やり', () => {
  test('定数', () => {
    expect(WATER_MAX).toBe(5);
    expect(ACHIEVE_GAIN).toBe(3);
  });
  test('今日の残り回数（日付が同じなら使った分を引く）', () => {
    const key = todayKey();
    expect(remainingWaterToday({ waterDate: key, waterCount: 0 })).toBe(5);
    expect(remainingWaterToday({ waterDate: key, waterCount: 2 })).toBe(3);
    expect(remainingWaterToday({ waterDate: key, waterCount: 5 })).toBe(0);
  });
  test('日付が違えばリセット（満タン）', () => {
    expect(remainingWaterToday({ waterDate: '2000-1-1', waterCount: 5 }, todayKey())).toBe(5);
    expect(remainingWaterToday(undefined)).toBe(5);
  });
});

describe('waterGarden', () => {
  const now = new Date(2026, 8, 7, 10, 0, 0);
  const key = todayKey(now);
  test('今日まだ水やり可能なら成長ポイント+1して回数を記録', () => {
    const next = waterGarden({ points: 4, waterDate: key, waterCount: 2 }, now);
    expect(next).toEqual({ points: 5, waterDate: key, waterCount: 3 });
  });
  test('日付が変わっていれば回数は0から+1（前日の分は引き継がない）', () => {
    const next = waterGarden({ points: 4, waterDate: '2000-1-1', waterCount: 5 }, now);
    expect(next).toEqual({ points: 5, waterDate: key, waterCount: 1 });
  });
  test('今日すでに上限まで使っていればnull（水やりできない）', () => {
    expect(waterGarden({ points: 4, waterDate: key, waterCount: WATER_MAX }, now)).toBeNull();
  });
  test('状態未定義でも今日の1回目として動く', () => {
    expect(waterGarden(undefined, now)).toEqual({ points: 1, waterDate: key, waterCount: 1 });
  });
  test('今日すでに水やり済みだがwaterCountが0（例外的な保存データ）でも1回目として動く', () => {
    expect(waterGarden({ points: 0, waterDate: key, waterCount: 0 }, now)).toEqual({ points: 1, waterDate: key, waterCount: 1 });
  });
  test('nowを省略しても現在時刻で動く', () => {
    expect(waterGarden(undefined)).toEqual({ points: 1, waterDate: todayKey(), waterCount: 1 });
  });
});

describe('dayPeriod', () => {
  test('時間帯の判定', () => {
    expect(dayPeriod(7).key).toBe('morning');
    expect(dayPeriod(13).key).toBe('day');
    expect(dayPeriod(18).key).toBe('evening');
    expect(dayPeriod(23).key).toBe('night');
    expect(dayPeriod(2).key).toBe('night');
  });
  test('引数省略時は現在時刻を使う', () => {
    const keys = ['night', 'morning', 'day', 'evening'];
    expect(keys).toContain(dayPeriod().key);
  });
});

describe('PLANT', () => {
  test('5段階そろっている', () => {
    expect(PLANT.stages).toHaveLength(5);
    expect(PLANT.stages[4].label).toBe('幻想樹');
  });
});

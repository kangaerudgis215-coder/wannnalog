import { PLANT, stageForCount, growthProgress, coinsForCount } from '../garden';

describe('stageForCount', () => {
  test('累計達成数に応じた段階', () => {
    expect(stageForCount(0)).toBe(1);
    expect(stageForCount(1)).toBe(2);
    expect(stageForCount(2)).toBe(2);
    expect(stageForCount(3)).toBe(3);
    expect(stageForCount(6)).toBe(4);
    expect(stageForCount(10)).toBe(5);
    expect(stageForCount(99)).toBe(5);
  });
  test('マイナス・未定義は0扱い', () => {
    expect(stageForCount(-5)).toBe(1);
    expect(stageForCount(undefined)).toBe(1);
  });
});

describe('growthProgress', () => {
  test('次の段階までの残りと進捗', () => {
    const p = growthProgress(0); // 種(Lv1)、次は双葉(need1)
    expect(p.lv).toBe(1);
    expect(p.label).toBe('種');
    expect(p.maxed).toBe(false);
    expect(p.remaining).toBe(1);
    expect(p.ratio).toBe(0);
    expect(p.nextLabel).toBe('双葉');
  });
  test('途中段階の進捗', () => {
    const p = growthProgress(4); // 幼木(Lv3:need3)→成木(need6)、span3 done1
    expect(p.lv).toBe(3);
    expect(p.remaining).toBe(2);
    expect(p.ratio).toBeCloseTo(1 / 3, 5);
  });
  test('最大段階は maxed', () => {
    const p = growthProgress(10);
    expect(p.lv).toBe(5);
    expect(p.maxed).toBe(true);
    expect(p.ratio).toBe(1);
    expect(p.remaining).toBe(0);
  });
});

describe('coinsForCount', () => {
  test('達成1回=10コイン', () => {
    expect(coinsForCount(0)).toBe(0);
    expect(coinsForCount(5)).toBe(50);
    expect(coinsForCount(-3)).toBe(0);
  });
});

describe('PLANT', () => {
  test('5段階そろっている', () => {
    expect(PLANT.stages).toHaveLength(5);
    expect(PLANT.stages[4].label).toBe('幻想樹');
  });
});

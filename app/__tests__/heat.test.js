import { HEAT_OPTIONS, heatLabel, defaultRemindForHeat, byHeatThenNew } from '../heat';

describe('heatLabel', () => {
  test('キー→表示名', () => {
    expect(heatLabel(1)).toBe('気になる');
    expect(heatLabel(2)).toBe('中');
    expect(heatLabel(3)).toBe('本気');
    expect(heatLabel(undefined)).toBe('中');
  });
  test('HEAT_OPTIONS は3つ', () => { expect(HEAT_OPTIONS).toHaveLength(3); });
});

describe('defaultRemindForHeat', () => {
  test('熱量で通知を出し分け', () => {
    expect(defaultRemindForHeat(3)).toBe('tomorrow'); // 本気=こまめに
    expect(defaultRemindForHeat(2)).toBe('3days');    // 中
    expect(defaultRemindForHeat(1)).toBe('none');     // 気になる=通知なし
  });
});

describe('byHeatThenNew', () => {
  test('熱量が高い順、同じなら新しい順', () => {
    const items = [
      { id: 'a', heat: 1, createdAt: 100 },
      { id: 'b', heat: 3, createdAt: 100 },
      { id: 'c', heat: 3, createdAt: 200 },
      { id: 'd', createdAt: 50 }, // heat未設定=中(2)扱い
    ];
    const sorted = [...items].sort(byHeatThenNew).map((x) => x.id);
    expect(sorted).toEqual(['c', 'b', 'd', 'a']);
  });
});

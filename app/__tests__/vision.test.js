import { VISION_FONTS, VISION_STATUS, visionFont, visionStatus } from '../vision';

describe('visionFont', () => {
  test('存在するkeyなら対応する字体を返す', () => {
    expect(visionFont('mincho')).toBe(VISION_FONTS[0]);
    expect(visionFont('round')).toBe(VISION_FONTS[1]);
    expect(visionFont('pop')).toBe(VISION_FONTS[2]);
  });

  test('未知のkeyや未指定なら先頭（明朝）にフォールバックする', () => {
    expect(visionFont('unknown')).toBe(VISION_FONTS[0]);
    expect(visionFont(undefined)).toBe(VISION_FONTS[0]);
    expect(visionFont(null)).toBe(VISION_FONTS[0]);
  });
});

describe('visionStatus', () => {
  test('存在するkeyなら対応する進み具合タグを返す', () => {
    expect(visionStatus('planning')).toBe(VISION_STATUS[0]);
    expect(visionStatus('doing')).toBe(VISION_STATUS[1]);
  });

  test('未知のkeyや未指定ならnullを返す（タグなし表示）', () => {
    expect(visionStatus('unknown')).toBeNull();
    expect(visionStatus(undefined)).toBeNull();
    expect(visionStatus(null)).toBeNull();
  });
});

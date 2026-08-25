import { VISION_FONTS, VISION_STATUS, visionFont, visionStatus, buildVisionBoard } from '../vision';

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

describe('buildVisionBoard', () => {
  test('枠が無ければ表紙(hero)も棚もすべて空', () => {
    expect(buildVisionBoard([])).toEqual({ hero: null, shelves: [] });
  });

  test('写真つきの枠が無ければ表紙は選ばれず、全枠が棚に振り分けられる', () => {
    const slots = [{ id: 'a', status: 'doing' }, { id: 'b', status: 'planning' }];
    const { hero, shelves } = buildVisionBoard(slots);
    expect(hero).toBeNull();
    expect(shelves.map((sec) => sec.key)).toEqual(['doing', 'planning']);
  });

  test('表紙は「実行中」の写真つき枠を優先する（並び順に関わらず）', () => {
    const slots = [
      { id: 'a', imageUri: 'a.jpg', status: 'planning' },
      { id: 'b', imageUri: 'b.jpg', status: 'doing' },
    ];
    const { hero } = buildVisionBoard(slots);
    expect(hero.id).toBe('b');
  });

  test('「実行中」が無ければ写真つき枠の先頭を表紙にする', () => {
    const slots = [
      { id: 'a', imageUri: 'a.jpg', status: 'planning' },
      { id: 'b', imageUri: 'b.jpg' },
    ];
    const { hero } = buildVisionBoard(slots);
    expect(hero.id).toBe('a');
  });

  test('表紙に選ばれた枠は棚には出ない。空の棚（該当ゼロ）は結果に含めない', () => {
    const slots = [
      { id: 'a', imageUri: 'a.jpg', status: 'doing' },
      { id: 'b', status: 'doing' },
      { id: 'c' },
    ];
    const { hero, shelves } = buildVisionBoard(slots);
    expect(hero.id).toBe('a');
    expect(shelves).toEqual([
      { key: 'doing', emoji: '🔥', label: '実行中の夢', match: expect.any(Function), items: [{ id: 'b', status: 'doing' }] },
      { key: 'other', emoji: '✨', label: 'そのほかの夢', match: expect.any(Function), items: [{ id: 'c' }] },
    ]);
  });
});

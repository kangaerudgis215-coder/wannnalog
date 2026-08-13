import { CATEGORIES, NEUTRAL_CATEGORY, getCategory, catSoft, WITH_OPTIONS, getWith, reminderBody } from '../theme';

describe('getCategory', () => {
  test('登録済みのキーならそのカテゴリを返す', () => {
    expect(getCategory('eat')).toBe(CATEGORIES.find((c) => c.key === 'eat'));
  });

  test('キーが未指定・none・不明のときは未設定カテゴリを返す', () => {
    expect(getCategory(undefined)).toBe(NEUTRAL_CATEGORY);
    expect(getCategory(null)).toBe(NEUTRAL_CATEGORY);
    expect(getCategory('none')).toBe(NEUTRAL_CATEGORY);
    expect(getCategory('nonexistent')).toBe(NEUTRAL_CATEGORY);
  });
});

describe('catSoft', () => {
  test('カテゴリ未指定のときはモードごとの既定色を返す', () => {
    expect(catSoft(null, 'dark')).toBe('rgba(255,255,255,0.06)');
    expect(catSoft(null, 'light')).toBe('#EFEAE1');
  });

  test('ダークモードはdarkSoft、ライトモードはsoftを返す', () => {
    const cat = getCategory('eat');
    expect(catSoft(cat, 'dark')).toBe(cat.darkSoft);
    expect(catSoft(cat, 'light')).toBe(cat.soft);
  });
});

describe('getWith', () => {
  test('登録済みのキーならその項目を返す', () => {
    expect(getWith('partner')).toBe(WITH_OPTIONS.find((w) => w.key === 'partner'));
  });

  test('未指定・不明なキーはnullを返す', () => {
    expect(getWith(undefined)).toBeNull();
    expect(getWith('nonexistent')).toBeNull();
  });
});

describe('reminderBody', () => {
  test('カテゴリごとに専用の文面を返す', () => {
    expect(reminderBody('eat')).toMatch(/食べて/);
    expect(reminderBody('go')).toMatch(/行けて/);
    expect(reminderBody('see')).toMatch(/観て/);
    expect(reminderBody('want')).toMatch(/手に入れて/);
  });

  test('未設定・不明なカテゴリは共通の文面を返す', () => {
    const fallback = reminderBody('none');
    expect(reminderBody(undefined)).toBe(fallback);
    expect(reminderBody('nonexistent')).toBe(fallback);
  });
});

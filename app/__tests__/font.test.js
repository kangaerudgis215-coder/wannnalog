import { baseFamily, BASE_FAMILIES } from '../font';

describe('baseFamily', () => {
  test('未指定なら通常の太さ(base)を返す', () => {
    expect(baseFamily(undefined)).toBe(BASE_FAMILIES.base);
    expect(baseFamily(null)).toBe(BASE_FAMILIES.base);
  });

  test('400未満・400台はbase', () => {
    expect(baseFamily('300')).toBe(BASE_FAMILIES.base);
    expect(baseFamily('400')).toBe(BASE_FAMILIES.base);
    expect(baseFamily(400)).toBe(BASE_FAMILIES.base);
  });

  test('500〜600台はmed', () => {
    expect(baseFamily('500')).toBe(BASE_FAMILIES.med);
    expect(baseFamily('600')).toBe(BASE_FAMILIES.med);
  });

  test('700台はbold', () => {
    expect(baseFamily('700')).toBe(BASE_FAMILIES.bold);
    expect(baseFamily('750')).toBe(BASE_FAMILIES.bold);
  });

  test('800以上はxbold', () => {
    expect(baseFamily('800')).toBe(BASE_FAMILIES.xbold);
    expect(baseFamily('900')).toBe(BASE_FAMILIES.xbold);
  });

  test('数値に変換できない太さはbase扱い（400のデフォルト）', () => {
    expect(baseFamily('bold')).toBe(BASE_FAMILIES.base);
    expect(baseFamily('')).toBe(BASE_FAMILIES.base);
  });
});

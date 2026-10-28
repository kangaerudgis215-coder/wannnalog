// vision.js の「入力が空・欠けているとき」の安全な既定値を確かめるテスト。
import {
  timingLabel, formatTimingDate, migrateVision, migrateVisions, achievedGallery,
  getCategoryById, visionStagePatch, buildNewVision, buildNewCategory,
  removeCategoryPatch, visionAchievedResult, buildVisionTabView, addTimingLabel,
} from '../vision';

describe('空・欠けた入力でも落ちない', () => {
  test('timingLabel: 空の独自ラベル・日付なしはnull', () => {
    expect(timingLabel({ kind: 'label' })).toBeNull();
    expect(timingLabel({ kind: 'label', text: '  ' })).toBeNull();
    expect(timingLabel({ kind: 'preset', key: 'ない' })).toBeNull();
    expect(timingLabel({ kind: 'date' })).toBeNull();
  });
  test('formatTimingDate: 形式が違えばそのまま返す', () => {
    expect(formatTimingDate('来年')).toBe('来年');
    expect(formatTimingDate('2026-08-03')).toBe('2026/8/3');
  });
  test('migrateVision: 空はそのまま、旧スロットは既定値で埋める', () => {
    expect(migrateVision(null)).toBeNull();
    const v = migrateVision({ id: 'a', status: 'done' }, 100);
    expect(v).toMatchObject({
      id: 'a', categoryId: null, title: '', timing: null, status: 'done', imageUri: null,
      memo: '', favorite: false, font: 'mincho', createdAt: 100, achievedAt: 100, order: 0,
    });
    expect(migrateVision({ id: 'b', label: 'L', detail: 'D', status: 'planning' }, 1))
      .toMatchObject({ title: 'L', memo: 'D', status: 'want', achievedAt: null });
    expect(migrateVisions(undefined)).toEqual([]);
  });
  test('achievedGallery / getCategoryById: 一覧が無くても空', () => {
    expect(achievedGallery(undefined)).toEqual([]);
    expect(getCategoryById(undefined, 'x')).toBeNull();
  });
  test('visionStagePatch: ビジョンが無ければnull、叶った→他は達成日をクリア', () => {
    expect(visionStagePatch(null, 'want')).toBeNull();
    expect(visionStagePatch({ status: 'done' }, 'want')).toEqual({ status: 'want', achievedAt: null });
    expect(visionStagePatch({ status: 'want' }, 'doing')).toEqual({ status: 'doing' });
  });
  test('buildNewVision: データ無しでも既定値で作る', () => {
    expect(buildNewVision(undefined, undefined, 5)).toEqual({
      id: '5', categoryId: null, title: '', timing: null, status: 'want', imageUri: null,
      memo: '', font: 'mincho', createdAt: 5, achievedAt: null, order: 1,
    });
  });
  test('buildNewCategory: 名前が空なら「カテゴリ」', () => {
    expect(buildNewCategory('  ', undefined, 3)).toMatchObject({ id: 'c3', name: 'カテゴリ' });
    expect(buildNewCategory('旅', '#123456', 3)).toMatchObject({ name: '旅', color: '#123456' });
  });
  test('removeCategoryPatch / visionAchievedResult / addTimingLabel の空入力', () => {
    expect(removeCategoryPatch(undefined, undefined, 'x')).toEqual({ visions: [], categories: [] });
    expect(visionAchievedResult(undefined, 'x')).toBeNull();
    expect(addTimingLabel([], undefined)).toBeNull();
  });
  test('buildVisionTabView: データ無しでも空の表示データ', () => {
    expect(buildVisionTabView(undefined, undefined)).toEqual({
      shown: [], sections: [], filterOptions: [{ id: 'all', name: 'すべて', count: 0 }],
    });
  });
  test('buildVisionTabView: createdAtが無くても並べ替えられる', () => {
    const view = buildVisionTabView([{ id: '1', status: 'want' }, { id: '2', status: 'want', createdAt: 5 }], [], 'all', 'oldest');
    expect(view.shown.map((v) => v.id)).toEqual(['1', '2']);
  });
});

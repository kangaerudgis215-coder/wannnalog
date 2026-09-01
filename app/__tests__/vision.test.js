import {
  VISION_FONTS, visionFont, VISION_STAGES, visionStage, stageAccent,
  TIMING_PRESETS, timingLabel, formatTimingDate, daysToAchieve,
  migrateVision, migrateVisions, buildVisionBoard, buildVisionTabView, achievedGallery, getCategoryById,
  VISION_CATEGORY_SEED,
} from '../vision';

describe('visionFont', () => {
  test('存在するkeyなら対応する字体を返す', () => {
    expect(visionFont('mincho')).toBe(VISION_FONTS[0]);
    expect(visionFont('pop')).toBe(VISION_FONTS[2]);
  });
  test('未知・未指定は先頭（明朝）にフォールバック', () => {
    expect(visionFont('x')).toBe(VISION_FONTS[0]);
    expect(visionFont(undefined)).toBe(VISION_FONTS[0]);
  });
});

describe('visionStage / stageAccent', () => {
  test('3段階を返し、未知は先頭(叶えたい)', () => {
    expect(visionStage('doing').label).toBe('叶えている最中');
    expect(visionStage('done').label).toBe('叶った');
    expect(visionStage('???')).toBe(VISION_STAGES[0]);
  });
  test('アクセント色：doing=炎 / want=青紫 / done=金 / それ以外null', () => {
    expect(stageAccent('doing').grad.length).toBe(2);
    expect(stageAccent('want').icon).toBe('sparkles');
    expect(stageAccent('done').icon).toBe('checkmark');
    expect(stageAccent(null)).toBeNull();
  });
});

describe('timingLabel / formatTimingDate', () => {
  test('プリセット/ラベル/日付を表示文字列に', () => {
    expect(timingLabel({ kind: 'preset', key: 'thisYear' })).toBe('今年中');
    expect(timingLabel({ kind: 'label', text: '30歳まで' })).toBe('30歳まで');
    expect(timingLabel({ kind: 'date', date: '2026-08-05' })).toBe('2026/8/5');
  });
  test('無し・不正は null', () => {
    expect(timingLabel(null)).toBeNull();
    expect(timingLabel({ kind: 'preset', key: 'zzz' })).toBeNull();
    expect(timingLabel({ kind: 'label', text: '   ' })).toBeNull();
  });
  test('プリセットは4種', () => {
    expect(TIMING_PRESETS.map((p) => p.key)).toEqual(['thisMonth', 'thisYear', 'halfYear', 'someday']);
  });
});

describe('daysToAchieve', () => {
  test('作成日→達成日の日数', () => {
    const DAY = 24 * 60 * 60 * 1000;
    expect(daysToAchieve({ createdAt: 0, achievedAt: 10 * DAY })).toBe(10);
    expect(daysToAchieve({ createdAt: 0, achievedAt: null })).toBeNull();
    expect(daysToAchieve(null)).toBeNull();
  });
});

describe('migrateVision', () => {
  test('旧スロット(label/detail/status)を新スキーマへ', () => {
    const v = migrateVision({ id: '1', label: '週3ジム', detail: 'メモ', status: 'doing', imageUri: 'x.jpg' }, 1000);
    expect(v.title).toBe('週3ジム');
    expect(v.memo).toBe('メモ');
    expect(v.status).toBe('doing');
    expect(v.createdAt).toBe(1000);
    expect(v.categoryId).toBeNull();
    expect(v.achievedAt).toBeNull();
  });
  test('旧statusのplanning/未設定は「叶えたい(want)」に', () => {
    expect(migrateVision({ id: 'a', label: 'x', status: 'planning' }).status).toBe('want');
    expect(migrateVision({ id: 'b', label: 'y' }).status).toBe('want');
  });
  test('既にv2ならそのまま返す', () => {
    const v2 = { id: '1', title: 't', status: 'want', createdAt: 5, categoryId: 'life', memo: '', imageUri: null };
    expect(migrateVision(v2)).toBe(v2);
  });
  test('migrateVisions は配列を丸ごと変換', () => {
    const out = migrateVisions([{ id: '1', label: 'a' }, { id: '2', label: 'b', status: 'doing' }], 1);
    expect(out.map((v) => v.status)).toEqual(['want', 'doing']);
  });
});

describe('buildVisionBoard', () => {
  const cats = VISION_CATEGORY_SEED;
  test('空なら hero=null / sections=[] / done=[]', () => {
    expect(buildVisionBoard([], cats)).toEqual({ hero: null, sections: [], done: [] });
  });
  test('達成(done)はボードから外れ done に入り、達成日の新しい順', () => {
    const visions = [
      { id: 'a', categoryId: 'life', status: 'done', achievedAt: 100 },
      { id: 'b', categoryId: 'life', status: 'done', achievedAt: 200 },
      { id: 'c', categoryId: 'life', status: 'want' },
    ];
    const { sections, done } = buildVisionBoard(visions, cats);
    expect(done.map((v) => v.id)).toEqual(['b', 'a']);
    // hero が c を拾うので、残りセクションは空 → sections は空
    expect(sections).toEqual([]);
  });
  test('hero は「叶えている最中」の写真つきを優先', () => {
    const visions = [
      { id: 'a', categoryId: 'life', status: 'want', imageUri: 'a.jpg' },
      { id: 'b', categoryId: 'life', status: 'doing', imageUri: 'b.jpg' },
    ];
    expect(buildVisionBoard(visions, cats).hero.id).toBe('b');
  });
  test('カテゴリ別にセクション化し、未知カテゴリは「未分類」に', () => {
    const visions = [
      { id: 'h', categoryId: 'life', status: 'doing', imageUri: 'h.jpg' }, // hero
      { id: 'x', categoryId: 'career', status: 'want' },
      { id: 'y', categoryId: 'zzz', status: 'want' },
    ];
    const { hero, sections } = buildVisionBoard(visions, cats);
    expect(hero.id).toBe('h');
    const ids = sections.map((s) => s.id);
    expect(ids).toContain('career');
    expect(ids).toContain('__none');
  });
});

describe('achievedGallery', () => {
  const visions = [
    { id: 'a', categoryId: 'life', status: 'done', achievedAt: 1 },
    { id: 'b', categoryId: 'play', status: 'done', achievedAt: 3 },
    { id: 'c', categoryId: 'life', status: 'want' },
  ];
  test('達成のみ・新しい順', () => {
    expect(achievedGallery(visions).map((v) => v.id)).toEqual(['b', 'a']);
  });
  test('カテゴリ指定で絞れる', () => {
    expect(achievedGallery(visions, 'life').map((v) => v.id)).toEqual(['a']);
  });
});

describe('buildVisionTabView', () => {
  const cats = VISION_CATEGORY_SEED;
  test('達成(done)は除外し、未達成のみ対象', () => {
    const visions = [
      { id: 'a', categoryId: 'life', status: 'done', createdAt: 1 },
      { id: 'b', categoryId: 'life', status: 'want', createdAt: 2 },
    ];
    const { shown } = buildVisionTabView(visions, cats);
    expect(shown.map((v) => v.id)).toEqual(['b']);
  });
  test('sortMode: newest(既定)は作成日が新しい順、oldestは古い順', () => {
    const visions = [
      { id: 'a', categoryId: 'life', status: 'want', createdAt: 1 },
      { id: 'b', categoryId: 'life', status: 'want', createdAt: 3 },
      { id: 'c', categoryId: 'life', status: 'want', createdAt: 2 },
    ];
    expect(buildVisionTabView(visions, cats).shown.map((v) => v.id)).toEqual(['b', 'c', 'a']);
    expect(buildVisionTabView(visions, cats, 'all', 'oldest').shown.map((v) => v.id)).toEqual(['a', 'c', 'b']);
  });
  test('filterでカテゴリ絞り込み（__noneは未分類）', () => {
    const visions = [
      { id: 'a', categoryId: 'life', status: 'want', createdAt: 1 },
      { id: 'b', categoryId: 'career', status: 'want', createdAt: 2 },
      { id: 'c', categoryId: 'zzz', status: 'want', createdAt: 3 },
    ];
    expect(buildVisionTabView(visions, cats, 'life').shown.map((v) => v.id)).toEqual(['a']);
    expect(buildVisionTabView(visions, cats, '__none').shown.map((v) => v.id)).toEqual(['c']);
  });
  test('カテゴリ別にセクション化し、空の段は出さない・未知カテゴリは未分類へ', () => {
    const visions = [
      { id: 'a', categoryId: 'life', status: 'want', createdAt: 1 },
      { id: 'b', categoryId: 'zzz', status: 'want', createdAt: 2 },
    ];
    const { sections } = buildVisionTabView(visions, cats);
    const ids = sections.map((s) => s.id);
    expect(ids).toEqual(['life', '__none']);
    expect(sections.find((s) => s.id === '__none').items.map((v) => v.id)).toEqual(['b']);
  });
  test('filterOptionsは「すべて」＋件数のあるカテゴリのみ、件数つき', () => {
    const visions = [
      { id: 'a', categoryId: 'life', status: 'want', createdAt: 1 },
      { id: 'b', categoryId: 'life', status: 'want', createdAt: 2 },
      { id: 'c', categoryId: 'career', status: 'done', createdAt: 3 },
    ];
    const { filterOptions } = buildVisionTabView(visions, cats);
    expect(filterOptions).toEqual([
      { id: 'all', name: 'すべて', count: 2 },
      { id: 'life', name: '生活習慣', count: 2, color: '#FF7A45' },
    ]);
  });
});

describe('getCategoryById', () => {
  test('idからカテゴリを引く', () => {
    expect(getCategoryById(VISION_CATEGORY_SEED, 'career').name).toBe('キャリア&お金');
    expect(getCategoryById(VISION_CATEGORY_SEED, 'nope')).toBeNull();
  });
});

import { buildBackupPayload } from '../backup';

describe('buildBackupPayload', () => {
  const state = {
    items: [{ id: 'i1', title: '鎌倉の海カフェ' }],
    visionSlots: [{ id: 'v1', title: 'いつか行きたい' }],
    visionTitle: 'MY VISION',
    visionCats: [{ id: 'c1', name: '旅行', color: '#fff' }],
    timingLabels: ['来年'],
    profileName: 'かんがえ',
    garden: { points: 10, waterCount: 2 },
    mode: 'dark',
    density: 'compact',
  };

  test('アプリ名・バージョン・書き出し日時を含む', () => {
    const payload = buildBackupPayload(state, 1000);
    expect(payload.app).toBe('WannaLog');
    expect(payload.version).toBe(1);
    expect(payload.exportedAt).toBe(new Date(1000).toISOString());
  });

  test('したい一覧をそのまま含む', () => {
    expect(buildBackupPayload(state, 1000).items).toBe(state.items);
  });

  test('ビジョン（一覧・タイトル・カテゴリ・時期ラベル）をまとめる', () => {
    expect(buildBackupPayload(state, 1000).vision).toEqual({
      slots: state.visionSlots, title: 'MY VISION', categories: state.visionCats, timingLabels: state.timingLabels,
    });
  });

  test('プロフィール名・箱庭・設定（テーマ/密度）を含む', () => {
    const payload = buildBackupPayload(state, 1000);
    expect(payload.profile).toEqual({ name: 'かんがえ' });
    expect(payload.garden).toBe(state.garden);
    expect(payload.prefs).toEqual({ theme: 'dark', density: 'compact' });
  });

  test('nowを省略しても現在時刻で動く', () => {
    const before = Date.now();
    const payload = buildBackupPayload(state);
    expect(new Date(payload.exportedAt).getTime()).toBeGreaterThanOrEqual(before);
  });
});

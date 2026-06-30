// データのバックアップ（書き出し）を作る純粋ロジック。
// このアプリは端末内（AsyncStorage）にしかデータを持たないため、
// 機種変更やアプリ削除に備えて「したい」リストをテキストで書き出せるようにする。

export function buildBackupPayload(items, now = Date.now()) {
  const list = items || [];
  return {
    app: 'WannaLog',
    version: 1,
    exportedAt: now,
    count: list.length,
    items: list,
  };
}

export function buildBackupText(items, now = Date.now()) {
  return JSON.stringify(buildBackupPayload(items, now), null, 2);
}

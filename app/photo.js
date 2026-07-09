// 写真がまだ付いていない「したい」の判定（純粋関数）。
// ホームの「画像なし」フィルタ・バッジに使う＝仕上げ待ちに気づきやすくする。

// 達成済みは「仕上げ待ち」に含めない（もう終わったことなので）。
export function needsPhoto(item) {
  return !item.doneAt && !item.imageUri;
}

export function countNeedsPhoto(items) {
  return items.filter(needsPhoto).length;
}

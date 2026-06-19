// アイテム一覧に対する純粋な操作（テストしやすいようApp.jsから分離）

export function removeItem(items, id) {
  return items.filter((it) => it.id !== id);
}

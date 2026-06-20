// 将来の「スペース（共有グループ）」対応に備えた軽量スキーマ拡張。
// 今はUIなし。既存データに静かに既定値を付与するだけ。
export const PERSONAL_SPACE_ID = 'personal';

export function withSpaceId(list) {
  return list.map((it) => (it.spaceId ? it : { ...it, spaceId: PERSONAL_SPACE_ID }));
}

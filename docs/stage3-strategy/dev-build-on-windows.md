# Windowsだけで iPhone にアプリを入れる（Expo Go 以外）

Mac は不要。**EAS Build（Expoのクラウドビルド）** が iOS アプリをクラウドで作るので、Windows だけで自分の iPhone に「アプリとして」入れられる。

## 2つの入れ方（どちらもExpo Go不要）

- **開発ビルド（Dev Client・おすすめ）**：一度インストールすれば、あとは `expo start --dev-client` で**JSを即反映**（Expo Goと同じ感覚だが“自分専用”。Skia等のネイティブ機能も動く＝夢の地図の土台になる）。
- **プレビュービルド**：単体アプリ（.ipa）。ライブ反映は無いが「ただ入れて使う」だけならこれが一番シンプル。

## 大事な前提（iPhoneの場合）
- **Apple Developer Program（$99/年）が必要**。iPhone実機に入れるには署名と端末登録が要り、EASがクラウドで代行する（Macは不要）。
- 既にApple Developerアカウントがあるなら、その Apple ID を使えばすぐ。
- （参考）Androidなら $99 不要で APK を直接入れられる。

## 手順（Dev Client・iOS）

`app` フォルダ（`C:\...\wannalog\app`）で、上から順に：

```
npm install -g eas-cli
eas login                     # Expoアカウントでログイン
eas init                      # プロジェクトを紐付け（projectIdを作成）
npx expo install expo-dev-client
eas build --profile development --platform ios
```

- `eas build` の途中で **Apple にログイン** → **この iPhone を登録**（UDIDの案内が出る）→ クラウドで署名・ビルド。
- 完了すると **QR/リンク** が出る → iPhoneの **Safari** で開いて「WannaLog（dev）」をインストール。
- 端末の「設定 → 一般 → VPNとデバイス管理」で、自分の開発者証明書を**信頼**する（初回のみ）。

インストール後の毎回の開発：
```
npx expo start --dev-client
```
→ インストールした WannaLog アプリで QR を読む（Expo Go は使わない）。JSの変更が即反映される。

## 「ただ使いたいだけ」なら（プレビュー）
```
eas build --profile preview --platform ios
```
→ 単体アプリが出来る。ライブ反映は無いが、更新したいときに再ビルドすればよい。

## バンドルID（app.json）
- 現在 `com.wannalog.app` を仮設定（`app.json` の `ios.bundleIdentifier` / `android.package`）。
- 既存のApple登録や希望のIDがあれば、**最初のビルド前に**ここを書き換える（例：`com.<あなた>.wannalog`）。一度App Storeに出すと変えにくいので、最初に決める。

## つまずきポイント
- Node は LTS（v20/v22）。非LTS（v24等）は不可。
- `eas.json` は既に `development` / `preview` / `production` を用意済み（`distribution: internal` = 端末に直接配布）。
- ネット不調時の起動は `npx expo start --dev-client --offline`（Dev Client 版）も可。

## この先（夢の地図＝Skia版）
- 開発ビルド（Dev Client）が動けば、`@shopify/react-native-skia` や `react-native-reanimated` を入れて「夢の地図」を実装できる（Expo Goでは不可だったもの）。
- 手順は `docs/stage2-design/08_vision-dream-map-v4.md` に記載。

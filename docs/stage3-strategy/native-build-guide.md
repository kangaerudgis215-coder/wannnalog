# 7月：Mac無しで“本物のアプリ”にする手順（やさしい版）

> Windows だけ・Mac不要。クラウド（EAS Build）でビルドし、TestFlightで自分のiPhoneに入れる。
> 専門用語は最小限。詰まったら秘書（AI）に聞く。

## 事前に必要なもの
- **Apple Developer Program（$99/年・有料）** … これが無いとiPhoneに“本物アプリ”を入れられない。
- **Expo アカウント**（無料）… ビルドの実行に使う。
- Node は LTS（v20 か v22）。

## ステップ（上から順に）
1. **Apple Developer 登録**（$99）: https://developer.apple.com/programs/
2. **EAS CLI を入れる**（PowerShellで）:
   ```
   npm install -g eas-cli
   eas login
   ```
3. **バンドルID を決める**（初回だけ・後で変えられないので慎重に）:
   - 例 `com.あなたの名前.wannalog`。決めたら `app/app.json` の `ios.bundleIdentifier` に入れる。
   - ※これはアプリの“住所”。公開後は変更不可。決めるときは秘書に相談してOK。
4. **ビルド設定は用意済み**（`app/eas.json` にあります）。まずは配布用の preview を作る:
   ```
   cd app
   eas build --platform ios --profile preview
   ```
   - 途中でApppleログインやバンドルID・証明書の質問が出る → 基本は指示どおり進めればEASが自動作成。
5. **TestFlight で自分のiPhoneに入れる**:
   - できあがった .ipa を `eas submit --platform ios --profile production`（または preview を内部配布）でApp Store Connectへ。
   - iPhoneに **TestFlight** アプリを入れ、招待から自分のアプリをインストール。
   - これで**ホーム画面に、自分のアイコンで**アプリが入り、常に起動できる。

## 大事な注意
- **Expo Go のデータは本物アプリに引き継がれません。** 事前に「マイページ → バックアップ → 書き出す」でデータを保存し、本物アプリ側で「読み込む」で復元する（※写真そのものは含まれない）。
- **通知**は本物アプリのほうが安定して動く（Expo Goは制限あり）。ネイティブ化後に鳴り方を再確認。
- OCR自動入力・共有シートは**このネイティブ化の後**に実装できる（Expo Goでは動かないため）。

## まとめ
1) $99登録 → 2) eas login → 3) バンドルID決定 → 4) eas build(preview) → 5) TestFlightで自分に配布。
分からない所は、その画面のスクショを秘書に見せれば案内します。

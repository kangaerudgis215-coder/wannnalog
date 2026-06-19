# アプリの「新しい版」をPCで動かす方法（更新手順）

秘書（AI）がコードを更新したあと、その最新版をあなたのPC＆iPhoneで動かすための手順です。
初心者向けに、できるだけやさしく書いています。

> 📌 大事：保存した「したい」のデータは **iPhoneのExpo Go側**にあります。コードを更新しても**消えません**。

---

## いちばんラクな方法：Git で取り込む（おすすめ・初回だけ準備）

一度 Git を入れておくと、次からは **1コマンド（`git pull`）** で最新版にできます。

### 初回だけ（準備）
1. **Git をインストール**：https://git-scm.com/download/win →（ずっとNextでOK）
2. PowerShell を開いて、置きたい場所で**コピーを取得**（短い場所がおすすめ）：
   ```
   cd $HOME
   git clone <リポジトリのURL> wl2
   ```
   > `<リポジトリのURL>` は GitHub のページの緑色「Code」ボタンに出る `https://...git` のことです。分からなければ秘書に聞いてください。
3. アプリのフォルダへ移動して部品を入れる：
   ```
   cd "$HOME\wl2\app"
   npm install
   ```
4. 起動：
   ```
   npx expo start --tunnel
   ```
   → QRをiPhoneのカメラで読む（同じWi-Fi）。

### 2回目以降（更新するとき）
PowerShell で：
```
cd "$HOME\wl2\app"
git pull
npm install
npx expo start --tunnel
```
> `git pull` で最新コードを取り込み、`npm install` で足りない部品を補い、起動するだけ。

---

## Git を使わない方法（ZIP再ダウンロード）

1. 最新の ZIP を再ダウンロード（リンクは秘書が案内します）
2. 展開（解凍）
3. その中の `app` フォルダで：
   ```
   npm install
   npx expo start --tunnel
   ```

---

## うまくいかない時のメモ
- QRが繋がらない → `npx expo start --tunnel`（トンネル）を使う。`y`でngrok導入を許可。
- `npx expo start` 中はQRが有効。**他のコマンドを打つと止まる**ので、止めたい時は Ctrl+C。
- 画面が固まった（入力できない）→ まず Esc、ダメなら Ctrl+C、それでもダメなら閉じて開き直す。
- バージョン不可エラー → SDKが Expo Go と合っていない合図。秘書に伝えてください（今は SDK 54 で合わせています）。

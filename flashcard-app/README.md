# AWS SAP-C02 フラッシュカード

AWS SAP-C02試験対策用のAnki風フラッシュカードアプリケーションです。

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| **フロントエンド** | HTML5, CSS3, JavaScript (ES Modules) |
| **バックエンド** | Node.js + Express |
| **ビルドツール** | Vite |
| **フォント** | Noto Sans JP (Google Fonts) |
| **データ形式** | JSON |
| **ストレージ** | Web Storage API (localStorage) |

## プロジェクト構成

```
flashcard-app/
├── package.json                  # プロジェクト設定・npm scripts
├── vite.config.js                # Vite設定
├── server/                       # バックエンド（Express API）
│   ├── index.js                  # サーバーエントリーポイント
│   └── routes/
│       └── questions.js          # 問題データAPI
├── src/                          # フロントエンドソース
│   ├── index.html                # エントリーポイント
│   ├── css/
│   │   └── styles.css            # スタイルシート
│   ├── js/
│   │   ├── main.js               # アプリ初期化
│   │   ├── app.js                # メインアプリケーションロジック
│   │   ├── api.js                # APIクライアント
│   │   └── storage.js            # ローカルストレージ管理
│   └── data/
│       └── questions.json        # 問題データ（529問）
├── scripts/
│   └── convert_csv_to_json.js    # CSV→JSON変換スクリプト
└── README.md
```

## セットアップ

```bash
# リポジトリをクローン後
cd flashcard-app

# 依存パッケージのインストール
npm install
```

## 使い方

### 開発サーバーの起動

```bash
npm run dev
```

これにより以下が同時に起動します：
- **Vite開発サーバー**: http://localhost:5173 （フロントエンド + HMR）
- **Express APIサーバー**: http://localhost:3001 （バックエンドAPI）

ブラウザで http://localhost:5173 にアクセスしてください。

### その他のコマンド

| コマンド | 説明 |
|----------|------|
| `npm run dev` | 開発サーバー起動（フロント + API同時） |
| `npm run dev:client` | フロントエンドのみ起動 |
| `npm run dev:server` | APIサーバーのみ起動 |
| `npm run build` | 本番用ビルド |
| `npm run start` | 本番サーバー起動（ビルド後） |
| `npm run preview` | ビルド結果のプレビュー |
| `npm run convert` | CSVから問題データを再生成 |

## API エンドポイント

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/questions` | 全問題を取得（`limit`, `offset`, `ids` パラメータ対応） |
| GET | `/api/questions/:id` | 指定IDの問題を取得 |
| GET | `/api/questions/random?count=N` | ランダムにN問取得 |
| POST | `/api/questions/cache/clear` | サーバーキャッシュをクリア |

## 機能

| 機能 | 説明 |
|------|------|
| ランダム出題 | 全529問からランダムに出題 |
| 選択肢シャッフル | 選択肢の順序をランダム化 |
| マーク機能 | 復習したい問題をマークして管理 |
| 出題頻度調整 | マークした問題の出現率を2〜5倍に設定可能 |
| 進捗保存 | ローカルストレージに学習状況を保持 |
| フィルター | すべて/マーク済み/間違えた問題/未回答で絞り込み |
| 統計表示 | 進捗、正解率、マーク数をリアルタイム表示 |
| 原文表示 | 問題の英語原文を確認可能 |

## 操作方法

| 操作 | 説明 |
|------|------|
| 選択肢をクリック | 回答を選択（複数選択対応） |
| 「回答する」ボタン | 選択した回答を送信し、正誤を確認 |
| 「次の問題」ボタン | 次のランダムな問題へ進む |
| 「← 前の問題」ボタン | 前の問題に戻る |
| ⭐ボタン | 現在の問題をマーク（復習用） |
| 「原文を表示」ボタン | 問題の英語原文を表示 |

## 設定

右上の「⚙️ 設定」ボタンから以下の設定が可能です：

- **マークした問題を優先**: ONにするとマークした問題が優先的に出題
- **選択肢をシャッフル**: ONにすると選択肢の順序がランダム化
- **マーク問題の出現率**: 2倍/3倍/5倍から選択

### データ管理

- **進捗をリセット**: 学習進捗をすべてクリア
- **データをエクスポート**: 学習データをエクスポート

## データの更新

CSVファイルから問題データを再生成する場合：

```bash
npm run convert
```

## 本番デプロイ

```bash
# ビルド
npm run build

# 本番サーバー起動
NODE_ENV=production npm run start
```

ビルド成果物は `dist/` に出力され、Expressサーバーが静的ファイルとAPIの両方を配信します。

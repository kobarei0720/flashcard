---
description: 修正後のGit push手順（自動実行）
---

# Git Push ワークフロー

修正作業が完了したら、以下の手順でGitにpushする。

// turbo-all

## 手順

1. `git status` で変更内容を確認する
2. 変更内容に基づいて適切なコミットメッセージを作成し、`git add`, `git commit`, `git push` を自動実行する
3. push完了後、結果（変更されたファイル一覧とコミットメッセージ）をユーザーに報告する

## ルール

- **ユーザーの確認なしに自動でpushを実行する**
- コミットメッセージは日本語で、変更内容を簡潔に記述する
- 不要になったファイルは適切に削除または移動し、ディレクトリをクリーンに保つ

## コミットメッセージのフォーマット

```text
[カテゴリ] 変更概要

- 変更点1
- 変更点2

Co-authored-by: gemini-code-assist[bot] <176961590+gemini-code-assist[bot]@users.noreply.github.com>
```

カテゴリ例: `feat`, `fix`, `refactor`, `docs`, `chore`, `style`

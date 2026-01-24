#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Anki互換性向上版CSVファイル作成
CSV内の改行を削除し、Ankiが確実にインポートできる形式に修正
"""

import csv
import os
import re

def fix_anki_csv(input_csv: str, output_csv: str):
    """
    Anki互換性を向上させたCSVを作成

    Args:
        input_csv: 入力CSVファイル
        output_csv: 出力CSVファイル
    """

    print("=" * 70)
    print("Anki互換性向上版CSVファイル作成")
    print("=" * 70)
    print(f"\n入力ファイル: {input_csv}")
    print(f"出力ファイル: {output_csv}")

    fixed_rows = []

    with open(input_csv, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)

        for i, row in enumerate(reader, 1):
            if len(row) < 2:
                continue

            # 各フィールドからHTML内の改行を削除（<br>は保持）
            front = remove_newlines_preserve_html(row[0])
            back = remove_newlines_preserve_html(row[1])
            tags = row[2] if len(row) >= 3 else ""

            fixed_rows.append([front, back, tags])

    # 修正版CSVを書き込み（QUOTE_ALL を使用して確実にエスケープ）
    with open(output_csv, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f, quoting=csv.QUOTE_ALL)
        writer.writerows(fixed_rows)

    print(f"\n✓ 処理完了: {len(fixed_rows)}問を修正しました")

    # ファイルサイズ比較
    input_size = os.path.getsize(input_csv)
    output_size = os.path.getsize(output_csv)

    print(f"\n【ファイルサイズ】")
    print(f"元のファイル: {input_size:,} bytes ({input_size/1024/1024:.2f} MB)")
    print(f"修正版:       {output_size:,} bytes ({output_size/1024/1024:.2f} MB)")

    # 修正内容を確認
    verify_csv(output_csv)


def remove_newlines_preserve_html(html_text: str) -> str:
    """
    HTML内の実際の改行を削除（HTMLタグは保持）

    Args:
        html_text: HTMLテキスト

    Returns:
        改行を削除したHTMLテキスト
    """
    # 改行を半角スペースに置き換え
    text = html_text.replace('\n', ' ')

    # 連続する空白を1つに
    text = re.sub(r'\s+', ' ', text)

    # タグの前後の空白を整理
    text = re.sub(r'\s*<\s*', '<', text)
    text = re.sub(r'\s*>\s*', '>', text)

    return text.strip()


def verify_csv(csv_path: str):
    """
    CSVファイルの検証
    """
    print(f"\n【検証結果】")

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        rows = list(reader)

    print(f"総レコード数: {len(rows)}")

    # 各レコードの列数を確認
    column_counts = {}
    for row in rows:
        col_count = len(row)
        column_counts[col_count] = column_counts.get(col_count, 0) + 1

    print(f"列数の分布:")
    for col_count, count in sorted(column_counts.items()):
        print(f"  {col_count}列: {count}レコード")

    # 改行が残っていないか確認
    newline_count = 0
    for row in rows:
        for field in row:
            if '\n' in field:
                newline_count += 1

    if newline_count == 0:
        print(f"\n✓ フィールド内の改行: なし（正常）")
    else:
        print(f"\n⚠ フィールド内の改行: {newline_count}個検出")

    # サンプル表示
    print(f"\n【サンプル（1行目）】")
    if rows:
        row = rows[0]
        print(f"Front（最初の150文字）: {row[0][:150]}...")
        print(f"Back（最初の150文字）: {row[1][:150]}...")
        print(f"Tags: {row[2] if len(row) >= 3 else ''}")


def main():
    """
    メイン実行関数
    """
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.join(script_dir, '..')

    input_csv = os.path.join(project_root, 'files', 'anki_aws_sap_c02_optimized.csv')
    output_csv = os.path.join(project_root, 'files', 'anki_aws_sap_c02_fixed.csv')

    # 入力ファイルの存在確認
    if not os.path.exists(input_csv):
        print(f"エラー: 入力ファイルが見つかりません: {input_csv}")
        return

    # 修正版CSVを作成
    fix_anki_csv(input_csv, output_csv)

    print("\n" + "=" * 70)
    print("Ankiへのインポート手順（修正版）")
    print("=" * 70)
    print(f"""
1. Anki Desktopを開く

2. ファイル → インポート を選択

3. 以下のファイルを選択:
   {output_csv}

4. インポート設定:
   ✓ フィールド区切り: カンマ
   ✓ テキストをHTMLとして扱う: オン（チェック）
   ✓ 最初のフィールドが一致したらノートを更新: オフ
   ✓ 既存のノートを許可する: オン

5. フィールドマッピング:
   フィールド1（列1）→ Front
   フィールド2（列2）→ Back
   フィールド3（列3）→ Tags

6. インポート実行

7. インポート後、デッキを確認:
   - カード数が529枚になっているか確認
   - いくつかのカードを開いて表示を確認

【トラブルシューティング】
もしまだ問題がある場合:
- Ankiのバージョンを確認（最新版を推奨）
- インポート時のエラーメッセージを確認
- 「既存のノートを許可する」をオフにしてみる
    """)

    print("=" * 70)


if __name__ == "__main__":
    main()

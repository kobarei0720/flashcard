#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Anki Desktop用 最適化CSVファイル作成スクリプト
問題文・選択肢の重複を削除し、ファイルサイズを50%削減
"""

import csv
import re
import os

def create_optimized_csv(input_csv: str, output_csv: str):
    """
    最適化されたAnki用CSVファイルを作成

    Args:
        input_csv: 元のCSVファイルパス
        output_csv: 出力CSVファイルパス
    """

    print("=" * 70)
    print("Anki Desktop用 最適化CSVファイル作成")
    print("=" * 70)
    print(f"\n入力ファイル: {input_csv}")
    print(f"出力ファイル: {output_csv}")

    optimized_rows = []

    with open(input_csv, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)

        for i, row in enumerate(reader, 1):
            if len(row) < 2:
                continue

            front = row[0]
            back = row[1]
            tags = row[2] if len(row) >= 3 else ""

            # Frontはそのまま使用（問題文 + 選択肢）
            optimized_front = front

            # Backを最適化：正解情報のみを抽出
            optimized_back = create_optimized_back(back)

            optimized_rows.append([optimized_front, optimized_back, tags])

    # 最適化版CSVを書き込み
    with open(output_csv, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerows(optimized_rows)

    # 結果を表示
    print(f"\n✓ 処理完了: {len(optimized_rows)}問を変換しました")

    # ファイルサイズ比較
    input_size = os.path.getsize(input_csv)
    output_size = os.path.getsize(output_csv)
    reduction = ((input_size - output_size) / input_size) * 100

    print(f"\n【ファイルサイズ比較】")
    print(f"元のファイル:     {input_size:,} bytes ({input_size/1024/1024:.2f} MB)")
    print(f"最適化版:         {output_size:,} bytes ({output_size/1024/1024:.2f} MB)")
    print(f"削減率:           {reduction:.1f}%")
    print(f"削減サイズ:       {(input_size - output_size):,} bytes ({(input_size - output_size)/1024/1024:.2f} MB)")


def create_optimized_back(back_html: str) -> str:
    """
    Backの内容を最適化：正解情報のみを抽出

    Args:
        back_html: 元のBack HTML

    Returns:
        最適化されたBack HTML
    """

    # 正解を抽出（例: "正解: A" または "正解: ADF"）
    correct_match = re.search(r"<div class='answer'>正解:\s*<b>([A-F]+)</b></div>", back_html)
    correct_answer = correct_match.group(1) if correct_match else ""

    # 正解の選択肢のテキストを抽出
    correct_choices = []
    for letter in correct_answer:
        # 正解の選択肢を探す（class='choice correct'のもの）
        choice_pattern = rf"<div class='choice correct'><b>{letter}\.</b>\s*(.*?)</div>"
        choice_match = re.search(choice_pattern, back_html, re.DOTALL)
        if choice_match:
            correct_choices.append({
                'letter': letter,
                'text': choice_match.group(1).strip()
            })

    # コミュニティ投票を抽出
    community_vote_match = re.search(r"<div class='community-vote'>(.*?)</div>", back_html, re.DOTALL)
    community_vote = community_vote_match.group(1).strip() if community_vote_match else ""

    # 最適化されたBack HTMLを構築
    optimized_html = "<div class='answer-section'>"

    # 正解表示
    optimized_html += f"<div class='correct-answer'><b>正解: {correct_answer}</b></div><br>"

    # 正解の選択肢を表示
    if correct_choices:
        optimized_html += "<div class='correct-choices'>"
        for choice in correct_choices:
            optimized_html += f"<div class='choice-item'><b>{choice['letter']}.</b> {choice['text']}</div>"
        optimized_html += "</div>"

    # コミュニティ投票
    if community_vote:
        optimized_html += f"<br><div class='community-vote'>{community_vote}</div>"

    optimized_html += "</div>"

    return optimized_html


def main():
    """
    メイン実行関数
    """
    # ファイルパス設定
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.join(script_dir, '..')

    input_csv = os.path.join(project_root, 'files', 'anki_aws_sap_c02.csv')
    output_csv = os.path.join(project_root, 'files', 'anki_aws_sap_c02_optimized.csv')

    # 入力ファイルの存在確認
    if not os.path.exists(input_csv):
        print(f"エラー: 入力ファイルが見つかりません: {input_csv}")
        return

    # 最適化CSVを作成
    create_optimized_csv(input_csv, output_csv)

    print("\n" + "=" * 70)
    print("使用方法")
    print("=" * 70)
    print(f"""
1. Anki Desktopを開く
2. ファイル → インポート を選択
3. 以下のファイルを選択:
   {output_csv}
4. インポート設定:
   - フィールド区切り: カンマ
   - ノートタイプ: 基本（または新規作成）
   - デッキ: AWS SAP-C02（または任意）
5. インポート実行

【スタイリング】
カードテンプレートのスタイル設定に、以下のCSSを追加することを推奨:
    """)

    # スタイルファイルも作成
    create_style_file(project_root)

    print("✓ スタイルファイルも作成しました:")
    print(f"  {os.path.join(project_root, 'files', 'anki_optimized_style.css')}")
    print("\n" + "=" * 70)


def create_style_file(project_root: str):
    """
    最適化版用のスタイルファイルを作成
    """
    style_path = os.path.join(project_root, 'files', 'anki_optimized_style.css')

    css_content = """/* Anki Desktop用 最適化版スタイル */

/* 問題面（Front） */
.card {
    font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', Meiryo, sans-serif;
    font-size: 16px;
    line-height: 1.6;
    color: #333;
    padding: 20px;
    max-width: 800px;
    margin: 0 auto;
}

.question {
    background-color: #f8f9fa;
    padding: 15px;
    border-left: 4px solid #007bff;
    margin-bottom: 20px;
    border-radius: 4px;
}

.question b {
    color: #007bff;
    font-size: 18px;
}

.choices {
    margin-top: 15px;
}

.choice {
    background-color: #ffffff;
    padding: 12px;
    margin: 8px 0;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    transition: all 0.2s;
}

.choice:hover {
    background-color: #f8f9fa;
    border-color: #007bff;
}

.choice b {
    color: #495057;
    margin-right: 8px;
}

/* 解答面（Back） */
.answer-section {
    background-color: #f8f9fa;
    padding: 20px;
    border-radius: 4px;
}

.correct-answer {
    background-color: #28a745;
    color: white;
    padding: 12px;
    border-radius: 4px;
    text-align: center;
    font-size: 18px;
    margin-bottom: 15px;
}

.correct-choices {
    background-color: #d4edda;
    border: 2px solid #28a745;
    border-radius: 4px;
    padding: 15px;
    margin: 10px 0;
}

.choice-item {
    padding: 8px;
    margin: 5px 0;
}

.choice-item b {
    color: #28a745;
    font-size: 16px;
    margin-right: 8px;
}

.community-vote {
    background-color: #fff3cd;
    border-left: 4px solid #ffc107;
    padding: 10px;
    margin-top: 15px;
    border-radius: 4px;
    font-size: 14px;
    color: #856404;
}

/* レスポンシブ対応 */
@media (max-width: 600px) {
    .card {
        font-size: 14px;
        padding: 10px;
    }

    .question b {
        font-size: 16px;
    }
}
"""

    with open(style_path, 'w', encoding='utf-8') as f:
        f.write(css_content)


if __name__ == "__main__":
    main()

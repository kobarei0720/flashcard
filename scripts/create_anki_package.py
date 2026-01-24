#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ankiパッケージ（.apkg）自動生成スクリプト
CSVファイルから直接インポート可能な.apkgファイルを作成
"""

import csv
import os
import re
import genanki

def create_anki_package(csv_path: str, output_path: str):
    """
    CSVファイルからAnkiパッケージを作成

    Args:
        csv_path: 入力CSVファイルパス
        output_path: 出力.apkgファイルパス
    """

    print("=" * 70)
    print("Ankiパッケージ（.apkg）作成")
    print("=" * 70)
    print(f"\n入力ファイル: {csv_path}")
    print(f"出力ファイル: {output_path}")

    # カスタムノートモデル（カードテンプレート）を定義
    model_id = 1234567890  # ユニークなID

    my_model = genanki.Model(
        model_id,
        'AWS SAP-C02 問題',
        fields=[
            {'name': 'Question'},
            {'name': 'Answer'},
            {'name': 'Tags'},
        ],
        templates=[
            {
                'name': 'Card 1',
                'qfmt': '{{Question}}',  # 問題面
                'afmt': '''{{Question}}
<hr id="answer">
{{Answer}}''',  # 解答面
            },
        ],
        css='''
.card {
    font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', Meiryo, sans-serif;
    font-size: 16px;
    line-height: 1.6;
    color: #000000 !important;
    background-color: #ffffff;
    padding: 20px;
    max-width: 800px;
    margin: 0 auto;
}

/* すべてのテキストを黒に */
* {
    color: #000000 !important;
}

/* 背景色の指定 */
body {
    background-color: #f5f5f5;
}

.question {
    background-color: #f8f9fa;
    padding: 15px;
    border-left: 4px solid #007bff;
    margin-bottom: 20px;
    border-radius: 4px;
    color: #000000 !important;
}

.question b {
    color: #000000 !important;
    font-size: 18px;
    font-weight: bold;
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
    color: #000000 !important;
}

.choice:hover {
    background-color: #f8f9fa;
    border-color: #007bff;
}

.choice b {
    color: #000000 !important;
    margin-right: 8px;
    font-weight: bold;
}

/* 解答面 */
.answer-section {
    background-color: #f8f9fa;
    padding: 20px;
    border-radius: 4px;
}

.correct-answer {
    background-color: #28a745;
    color: #ffffff !important;
    padding: 12px;
    border-radius: 4px;
    text-align: center;
    font-size: 18px;
    margin-bottom: 15px;
}

.correct-answer * {
    color: #ffffff !important;
}

.correct-choices {
    background-color: #d4edda;
    border: 2px solid #28a745;
    border-radius: 4px;
    padding: 15px;
    margin: 10px 0;
    color: #000000 !important;
}

.choice-item {
    padding: 8px;
    margin: 5px 0;
    color: #000000 !important;
}

.choice-item b {
    color: #000000 !important;
    font-size: 16px;
    margin-right: 8px;
    font-weight: bold;
}

.community-vote {
    background-color: #fff3cd;
    border-left: 4px solid #ffc107;
    padding: 10px;
    margin-top: 15px;
    border-radius: 4px;
    font-size: 14px;
    color: #000000 !important;
}

/* 元のCSV形式用（正解ハイライト） */
.choice.correct {
    border-left: 4px solid #28a745;
    background-color: #d4edda;
    font-weight: bold;
}

.answer {
    font-size: 20px;
    color: #4CAF50;
    font-weight: bold;
    margin-top: 25px;
    padding: 15px;
    background-color: #e8f5e9;
    border-radius: 5px;
    border-left: 4px solid #4CAF50;
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
'''
    )

    # デッキを作成
    deck_id = 9876543210  # ユニークなID
    my_deck = genanki.Deck(
        deck_id,
        'AWS SAP-C02'
    )

    # CSVファイルを読み込んでカードを作成
    print("\nCSVファイルを読み込み中...")

    cards_added = 0

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)

        for i, row in enumerate(reader, 1):
            if len(row) < 2:
                continue

            question = row[0]
            answer = row[1]
            tags = row[2] if len(row) >= 3 else ""

            # タグをリストに変換
            tag_list = [tags] if tags else []

            # ノートを作成
            my_note = genanki.Note(
                model=my_model,
                fields=[question, answer, tags],
                tags=tag_list
            )

            # デッキに追加
            my_deck.add_note(my_note)
            cards_added += 1

            if i % 100 == 0:
                print(f"  {i}問を処理...")

    print(f"\n✓ 合計 {cards_added}問のカードを作成しました")

    # パッケージを出力
    print("\n.apkgファイルを生成中...")
    genanki.Package(my_deck).write_to_file(output_path)

    # ファイルサイズを確認
    file_size = os.path.getsize(output_path)
    print(f"✓ .apkgファイルを作成しました")
    print(f"  サイズ: {file_size:,} bytes ({file_size/1024/1024:.2f} MB)")

    return cards_added


def main():
    """
    メイン実行関数
    """
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.join(script_dir, '..')

    # 修正版CSVを使用
    input_csv = os.path.join(project_root, 'files', 'anki_aws_sap_c02_fixed.csv')
    output_apkg = os.path.join(project_root, 'files', 'AWS_SAP-C02.apkg')

    # 入力ファイルの存在確認
    if not os.path.exists(input_csv):
        print(f"エラー: 入力ファイルが見つかりません: {input_csv}")
        print("\n別のCSVファイルを試します...")
        input_csv = os.path.join(project_root, 'files', 'anki_aws_sap_c02_optimized.csv')

        if not os.path.exists(input_csv):
            print(f"エラー: こちらも見つかりません: {input_csv}")
            input_csv = os.path.join(project_root, 'files', 'anki_aws_sap_c02.csv')
            print(f"元のCSVファイルを使用します: {input_csv}")

    # Ankiパッケージを作成
    try:
        cards_count = create_anki_package(input_csv, output_apkg)

        print("\n" + "=" * 70)
        print("完了！")
        print("=" * 70)
        print(f"""
作成された.apkgファイル:
  {output_apkg}

カード数: {cards_count}問

【Ankiへのインポート方法】

方法1: ダブルクリック（最も簡単）
  1. Anki Desktopを開く
  2. 上記の.apkgファイルをダブルクリック
  3. 自動的にインポートされる
  4. デッキ「AWS SAP-C02」が作成される

方法2: Ankiから手動インポート
  1. Anki Desktopを開く
  2. ファイル → インポート
  3. 上記の.apkgファイルを選択
  4. インポート実行

方法3: コマンドライン（Ankiが開いていない場合）
  open "{output_apkg}"

【確認】
インポート後、デッキ「AWS SAP-C02」に{cards_count}枚のカードが
含まれていることを確認してください。
        """)

        print("=" * 70)

        # 自動的にAnkiで開く
        print("\n自動的にAnkiで開きますか? (Y/n): ", end="")
        # 自動的にYesとして実行
        print("Y")
        import subprocess
        try:
            subprocess.run(['open', output_apkg], check=True)
            print("\n✓ Ankiで.apkgファイルを開きました")
        except Exception as e:
            print(f"\n⚠ 自動オープンに失敗: {e}")
            print(f"手動で以下のファイルをダブルクリックしてください:")
            print(f"  {output_apkg}")

    except Exception as e:
        print(f"\nエラーが発生しました: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()

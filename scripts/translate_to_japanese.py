#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AWS SAP-C02問題を日本語に翻訳
すべての英語問題文と選択肢を日本語に翻訳します
"""

import csv
import os
import re
import time
from deep_translator import GoogleTranslator

def is_english(text: str) -> bool:
    """
    テキストが主に英語かどうかを判定
    """
    if not text:
        return False

    # 英語文字の割合を計算
    english_chars = len(re.findall(r'[a-zA-Z]', text))
    total_chars = len(text.strip())

    if total_chars == 0:
        return False

    return (english_chars / total_chars) > 0.5


def translate_text(text: str, translator) -> str:
    """
    テキストを日本語に翻訳
    """
    if not text or not is_english(text):
        return text

    try:
        # HTMLタグを保護
        html_pattern = r'(<[^>]+>)'
        parts = re.split(html_pattern, text)

        translated_parts = []
        for part in parts:
            if part.startswith('<') and part.endswith('>'):
                # HTMLタグはそのまま
                translated_parts.append(part)
            elif part.strip():
                # テキスト部分を翻訳（長すぎる場合は分割）
                if len(part) > 4500:
                    # 4500文字ごとに分割
                    chunks = [part[i:i+4500] for i in range(0, len(part), 4500)]
                    translated_chunk = ""
                    for chunk in chunks:
                        translated_chunk += translator.translate(chunk)
                        time.sleep(0.5)  # レート制限対策
                    translated_parts.append(translated_chunk)
                else:
                    translated = translator.translate(part)
                    translated_parts.append(translated)
                    time.sleep(0.3)  # レート制限対策
            else:
                translated_parts.append(part)

        return ''.join(translated_parts)

    except Exception as e:
        print(f"  翻訳エラー: {str(e)[:100]}")
        return text  # エラーの場合は元のテキストを返す


def translate_csv(input_csv: str, output_csv: str):
    """
    CSVファイルを翻訳
    """
    print("=" * 70)
    print("AWS SAP-C02問題 日本語翻訳")
    print("=" * 70)
    print(f"\n入力ファイル: {input_csv}")
    print(f"出力ファイル: {output_csv}")

    # 翻訳器を初期化
    translator = GoogleTranslator(source='en', target='ja')

    # CSVファイルを読み込み
    print("\nCSVファイルを読み込み中...")

    translated_rows = []

    with open(input_csv, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        rows = list(reader)

    print(f"✓ {len(rows)}問を読み込みました")

    # 各行を翻訳
    print("\n翻訳を開始します...")
    print("（これには数分かかります。進捗を表示します）")
    print("")

    # 進捗ログファイル
    progress_log = '/tmp/translate_progress.txt'

    for i, row in enumerate(rows, 1):
        if len(row) < 2:
            translated_rows.append(row)
            continue

        front = row[0]
        back = row[1]
        tags = row[2] if len(row) >= 3 else ""

        # 進捗表示（%で表示）
        progress_percent = (i / len(rows)) * 100

        if i % 10 == 0 or i == 1:
            progress_msg = f"  {i}/{len(rows)} 問目を翻訳中... ({progress_percent:.1f}%)"
            print(progress_msg)

            # 進捗ファイルに書き込み
            with open(progress_log, 'a') as f:
                f.write(f"{progress_msg}\n")

        # Frontを翻訳
        translated_front = translate_text(front, translator)

        # Backを翻訳
        translated_back = translate_text(back, translator)

        translated_rows.append([translated_front, translated_back, tags])

    # 翻訳済みCSVを書き込み
    print("\n翻訳済みCSVを書き込み中...")
    with open(output_csv, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerows(translated_rows)

    print(f"✓ 翻訳完了: {len(translated_rows)}問")

    # ファイルサイズ確認
    file_size = os.path.getsize(output_csv)
    print(f"\n出力ファイルサイズ: {file_size:,} bytes ({file_size/1024/1024:.2f} MB)")


def send_notification(title, message):
    """
    macOS通知を送信
    """
    import subprocess
    try:
        # macOS通知
        subprocess.run([
            'osascript', '-e',
            f'display notification "{message}" with title "{title}"'
        ])
        # 音声通知
        subprocess.run(['say', message])
        # サウンド再生
        subprocess.run(['afplay', '/System/Library/Sounds/Glass.aiff'])
    except:
        pass


def main():
    """
    メイン実行関数
    """
    import subprocess

    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.join(script_dir, '..')

    input_csv = os.path.join(project_root, 'files', 'anki_aws_sap_c02_fixed.csv')
    output_csv = os.path.join(project_root, 'files', 'anki_aws_sap_c02_japanese.csv')
    progress_file = '/tmp/translate_progress.txt'

    # 進捗ファイルを初期化
    with open(progress_file, 'w') as f:
        f.write("翻訳開始...\n")

    # 入力ファイルの存在確認
    if not os.path.exists(input_csv):
        error_msg = f"エラー: 入力ファイルが見つかりません: {input_csv}"
        print(error_msg)
        with open(progress_file, 'a') as f:
            f.write(error_msg + "\n")
        return

    # 翻訳実行
    try:
        # 開始時刻を記録
        import datetime
        start_time = datetime.datetime.now()
        with open(progress_file, 'a') as f:
            f.write(f"開始時刻: {start_time.strftime('%Y-%m-%d %H:%M:%S')}\n")

        translate_csv(input_csv, output_csv)

        # 終了時刻を記録
        end_time = datetime.datetime.now()
        duration = end_time - start_time

        completion_msg = f"""
翻訳完了！
所要時間: {duration}

翻訳済みCSVファイル:
  {output_csv}

次のステップ:
  .apkgファイルを自動生成します...
        """

        print("\n" + "=" * 70)
        print("翻訳完了！")
        print("=" * 70)
        print(completion_msg)

        with open(progress_file, 'a') as f:
            f.write(f"\n終了時刻: {end_time.strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"所要時間: {duration}\n")
            f.write("翻訳完了！\n")

        # 通知を送信
        send_notification("AWS SAP-C02 翻訳完了", "529問の翻訳が完了しました")

        # 自動的に.apkgファイルを生成
        print("\n.apkgファイルを生成中...")
        apkg_script = os.path.join(script_dir, 'create_anki_package.py')

        # スクリプトを修正して日本語版CSVを使用
        subprocess.run([
            'python3', apkg_script
        ], env={**os.environ, 'USE_JAPANESE_CSV': '1'})

        # 最終通知
        send_notification("Anki準備完了", "日本語版Ankiデッキの準備が完了しました")

    except Exception as e:
        error_msg = f"\nエラーが発生しました: {e}"
        print(error_msg)
        with open(progress_file, 'a') as f:
            f.write(error_msg + "\n")

        import traceback
        traceback.print_exc()

        # エラー通知
        send_notification("翻訳エラー", str(e)[:100])


if __name__ == "__main__":
    main()

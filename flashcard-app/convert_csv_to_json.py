#!/usr/bin/env python3
"""CSVファイルから問題データをJSONに変換するスクリプト"""

import csv
import json
import re
import html

def clean_html(text):
    """HTMLタグを削除してクリーンなテキストに変換"""
    # <br>や<br/>を改行に変換
    text = re.sub(r'<br\s*/?>', '\n', text)
    # <hr>タグを削除
    text = re.sub(r'<hr\s*/?>', '', text)
    # <b>タグを削除（テキストは保持）
    text = re.sub(r'</?b>', '', text)
    # その他のHTMLタグを削除
    text = re.sub(r'<[^>]+>', '', text)
    # HTMLエンティティをデコード
    text = html.unescape(text)
    # 余分な空白行を削除
    text = re.sub(r'\n\s*\n', '\n', text)
    return text.strip()

def parse_question(question_text):
    """問題文から問題と選択肢、正解を抽出"""
    # 正解を抽出 (例: <b>正解: A</b>, 正解: ADF など)
    # HTMLタグ内のケースにも対応
    answer_match = re.search(r'正解[:\s：]+([A-Z,\s]+)', question_text)
    answer = ""
    if answer_match:
        answer = re.sub(r'[,\s]+', ',', answer_match.group(1).strip())  # 空白をカンマに、連続カンマを整理
        answer = answer.strip(',')  # 先頭/末尾のカンマを削除
    
    # 原文部分を分離
    parts = question_text.split('原文:')
    main_part = parts[0] if parts else question_text
    original = clean_html(parts[1]) if len(parts) > 1 else ""
    
    # 正解部分以降を削除して問題本文を取得
    main_part = re.split(r'正解:', main_part)[0]
    
    # HTMLをクリーンしてからパース
    main_part_clean = clean_html(main_part)
    
    # 選択肢を抽出
    choices = []
    
    # 選択肢のパターン: 行頭または改行後の A. B. C. など
    # より正確に選択肢を分離
    choice_pattern = r'(?:^|\n)([A-F])\.\s*'
    
    # まず全ての選択肢ラベルの位置を見つける
    choice_positions = []
    for m in re.finditer(choice_pattern, main_part_clean):
        choice_positions.append((m.start(), m.end(), m.group(1)))
    
    if choice_positions:
        # 問題文は最初の選択肢の前
        question_body = main_part_clean[:choice_positions[0][0]].strip()
        
        # 各選択肢のテキストを抽出
        for i, (start, end, label) in enumerate(choice_positions):
            if i < len(choice_positions) - 1:
                next_start = choice_positions[i + 1][0]
                choice_text = main_part_clean[end:next_start].strip()
            else:
                choice_text = main_part_clean[end:].strip()
            
            choices.append({
                "label": label,
                "text": choice_text
            })
    else:
        question_body = main_part_clean
    
    return {
        "question": question_body,
        "choices": choices,
        "answer": answer,
        "original": original
    }

def main():
    questions = []
    
    with open('../aws_sap_anki.csv', 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        for idx, row in enumerate(reader, 1):
            if row:
                try:
                    # CSVは2カラム: カラム0=問題文と選択肢、カラム1=正解と原文
                    question_text = row[0]
                    answer_text = row[1] if len(row) > 1 else ""
                    
                    # 正解を2番目のカラムから抽出
                    answer_match = re.search(r'正解[:\s：]+([A-Z]+)', answer_text)
                    answer = answer_match.group(1) if answer_match else ""
                    
                    # 原文を2番目のカラムから抽出
                    original = ""
                    if '原文:' in answer_text:
                        original = clean_html(answer_text.split('原文:')[1])
                    elif '原文：' in answer_text:
                        original = clean_html(answer_text.split('原文：')[1])
                    
                    # 問題文と選択肢を1番目のカラムから抽出
                    main_part_clean = clean_html(question_text)
                    
                    # 選択肢を抽出
                    choices = []
                    choice_pattern = r'(?:^|\n)([A-F])\.\s*'
                    
                    choice_positions = []
                    for m in re.finditer(choice_pattern, main_part_clean):
                        choice_positions.append((m.start(), m.end(), m.group(1)))
                    
                    if choice_positions:
                        question_body = main_part_clean[:choice_positions[0][0]].strip()
                        
                        for i, (start, end, label) in enumerate(choice_positions):
                            if i < len(choice_positions) - 1:
                                next_start = choice_positions[i + 1][0]
                                choice_text = main_part_clean[end:next_start].strip()
                            else:
                                choice_text = main_part_clean[end:].strip()
                            
                            choices.append({
                                "label": label,
                                "text": choice_text
                            })
                    else:
                        question_body = main_part_clean
                    
                    parsed = {
                        "id": idx,
                        "question": question_body,
                        "choices": choices,
                        "answer": answer,
                        "original": original
                    }
                    questions.append(parsed)
                except Exception as e:
                    print(f"問題 {idx} の解析エラー: {e}")
    
    # JSONファイルとして保存
    output = {"questions": questions, "totalCount": len(questions)}
    
    with open('data/questions.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"変換完了: {len(questions)} 問を data/questions.json に保存しました")
    
    # 統計を表示
    with_answer = sum(1 for q in questions if q['answer'])
    print(f"正解あり: {with_answer} 問")

if __name__ == "__main__":
    main()


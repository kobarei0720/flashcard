import json
import csv
import os

def export_json_to_csv():
    # Paths
    json_path = os.path.abspath('flashcard-app/server/data/questions.json')
    output_csv_path = os.path.abspath('aws_sap_anki_translated.csv')

    print(f"Reading {json_path}...")
    
    if not os.path.exists(json_path):
        print(f"Error: {json_path} not found.")
        return

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        questions = data.get('questions', [])

    print(f"Loaded {len(questions)} questions.")

    # CSV headers
    headers = ['問題文', '正解', '解説(原文)']
    for i in range(8): # A to H
        headers.append(f'選択肢{chr(65+i)}')

    with open(output_csv_path, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(headers)

        for q in questions:
            row = [
                q.get('question', ''),
                q.get('answer', ''),
                q.get('original', '')
            ]
            
            # Add choices
            choices = q.get('choices', [])
            choice_map = {c['label']: c['text'] for c in choices}
            
            for i in range(8):
                label = chr(65+i)
                row.append(choice_map.get(label, ''))
                
            writer.writerow(row)

    print(f"Successfully exported to {output_csv_path}")

if __name__ == "__main__":
    export_json_to_csv()

#!/usr/bin/env node
/**
 * CSVファイルから問題データをJSONに変換するスクリプト（Node.js版）
 * 
 * 使い方:
 *   npm run convert
 *   または
 *   node scripts/convert_csv_to_json.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');

/**
 * HTMLタグを削除してクリーンなテキストに変換
 */
function cleanHtml(text) {
    // <br>や<br/>を改行に変換
    text = text.replace(/<br\s*\/?>/gi, '\n');
    // <hr>タグを削除
    text = text.replace(/<hr\s*\/?>/gi, '');
    // <b>タグを削除（テキストは保持）
    text = text.replace(/<\/?b>/gi, '');
    // その他のHTMLタグを削除
    text = text.replace(/<[^>]+>/g, '');
    // HTMLエンティティをデコード
    text = decodeHtmlEntities(text);
    // 余分な空白行を削除
    text = text.replace(/\n\s*\n/g, '\n');
    return text.trim();
}

/**
 * HTMLエンティティをデコード
 */
function decodeHtmlEntities(text) {
    const entities = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#039;': "'",
        '&apos;': "'",
        '&nbsp;': ' ',
    };
    return text.replace(/&[^;]+;/g, (match) => entities[match] || match);
}

/**
 * CSVの行をパース（ダブルクォート対応）
 */
function parseCSVLine(line) {
    const fields = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                field += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            fields.push(field);
            field = '';
        } else {
            field += char;
        }
    }
    fields.push(field);

    return fields;
}

/**
 * CSVファイルをパース
 */
function parseCSV(content) {
    const rows = [];
    let currentRow = '';
    let inQuotes = false;

    for (let i = 0; i < content.length; i++) {
        const char = content[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        }

        if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && i + 1 < content.length && content[i + 1] === '\n') {
                i++;
            }
            if (currentRow.trim()) {
                rows.push(parseCSVLine(currentRow));
            }
            currentRow = '';
        } else {
            currentRow += char;
        }
    }

    if (currentRow.trim()) {
        rows.push(parseCSVLine(currentRow));
    }

    return rows;
}

/**
 * メイン処理
 */
async function main() {
    const csvPath = path.join(PROJECT_ROOT, '..', 'aws_sap_anki.csv');
    const outputPath = path.join(PROJECT_ROOT, 'server', 'data', 'questions.json');

    console.log(`📖 CSVファイル読み込み: ${csvPath}`);

    const csvContent = await fs.readFile(csvPath, 'utf-8');
    const rows = parseCSV(csvContent);

    console.log(`📊 ${rows.length} 行を検出`);

    const questions = [];

    for (let idx = 0; idx < rows.length; idx++) {
        const row = rows[idx];
        if (!row || row.length === 0) continue;

        try {
            const questionText = row[0] || '';
            const answerText = row[1] || '';

            // 正解を2番目のカラムから抽出
            const answerMatch = answerText.match(/正解[:\s：]+([A-Z]+)/);
            const answer = answerMatch ? answerMatch[1] : '';

            // 原文を2番目のカラムから抽出
            let original = '';
            if (answerText.includes('原文:')) {
                original = cleanHtml(answerText.split('原文:')[1]);
            } else if (answerText.includes('原文：')) {
                original = cleanHtml(answerText.split('原文：')[1]);
            }

            // 問題文と選択肢を1番目のカラムから抽出
            const mainPartClean = cleanHtml(questionText);

            // 選択肢を抽出
            const choices = [];
            const choicePattern = /(?:^|\n)([A-F])\.\s*/g;
            const choicePositions = [];

            let match;
            while ((match = choicePattern.exec(mainPartClean)) !== null) {
                choicePositions.push({
                    start: match.index,
                    end: match.index + match[0].length,
                    label: match[1],
                });
            }

            let questionBody;

            if (choicePositions.length > 0) {
                questionBody = mainPartClean.slice(0, choicePositions[0].start).trim();

                for (let i = 0; i < choicePositions.length; i++) {
                    const pos = choicePositions[i];
                    const nextStart = i < choicePositions.length - 1
                        ? choicePositions[i + 1].start
                        : mainPartClean.length;
                    const choiceText = mainPartClean.slice(pos.end, nextStart).trim();

                    choices.push({
                        label: pos.label,
                        text: choiceText,
                    });
                }
            } else {
                questionBody = mainPartClean;
            }

            questions.push({
                id: idx + 1,
                question: questionBody,
                choices,
                answer,
                original,
            });
        } catch (error) {
            console.error(`⚠️  問題 ${idx + 1} の解析エラー: ${error.message}`);
        }
    }

    // JSONファイルとして保存
    const output = { questions, totalCount: questions.length };

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(output, null, 2), 'utf-8');

    console.log(`✅ 変換完了: ${questions.length} 問を ${outputPath} に保存しました`);

    // 統計を表示
    const withAnswer = questions.filter(q => q.answer).length;
    console.log(`📌 正解あり: ${withAnswer} 問`);
}

main().catch(console.error);

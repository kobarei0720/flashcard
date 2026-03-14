import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// 問題データのキャッシュ
let questionsCache = null;

/**
 * 問題データを読み込む（キャッシュ付き）
 */
async function loadQuestions() {
    if (questionsCache) return questionsCache;

    const dataPath = path.join(__dirname, '..', 'data', 'questions.json');
    const rawData = await fs.readFile(dataPath, 'utf-8');
    questionsCache = JSON.parse(rawData);
    return questionsCache;
}

/**
 * GET /api/questions
 * 全問題を取得
 * クエリパラメータ:
 *   - limit: 取得件数制限
 *   - offset: オフセット
 *   - ids: カンマ区切りのID指定（例: 1,5,10）
 */
router.get('/', async (req, res) => {
    try {
        const data = await loadQuestions();
        let questions = data.questions;

        // IDフィルター
        if (req.query.ids) {
            const ids = req.query.ids.split(',').map(Number);
            questions = questions.filter(q => ids.includes(q.id));
        }

        // ページネーション
        const offset = parseInt(req.query.offset) || 0;
        const limit = parseInt(req.query.limit) || questions.length;
        const paginatedQuestions = questions.slice(offset, offset + limit);

        res.json({
            questions: paginatedQuestions,
            totalCount: questions.length,
            offset,
            limit,
        });
    } catch (error) {
        console.error('問題データの取得エラー:', error);
        res.status(500).json({ error: '問題データの取得に失敗しました' });
    }
});

/**
 * GET /api/questions/:id
 * 指定IDの問題を取得
 */
router.get('/:id', async (req, res) => {
    try {
        const data = await loadQuestions();
        const question = data.questions.find(q => q.id === parseInt(req.params.id));

        if (!question) {
            return res.status(404).json({ error: '問題が見つかりません' });
        }

        res.json(question);
    } catch (error) {
        console.error('問題データの取得エラー:', error);
        res.status(500).json({ error: '問題データの取得に失敗しました' });
    }
});

/**
 * GET /api/questions/random
 * ランダムな問題を取得
 * クエリパラメータ:
 *   - count: 取得件数（デフォルト: 1）
 */
router.get('/random', async (req, res) => {
    try {
        const data = await loadQuestions();
        const count = Math.min(parseInt(req.query.count) || 1, data.questions.length);

        // Fisher-Yatesシャッフルで選択
        const shuffled = [...data.questions];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        res.json({
            questions: shuffled.slice(0, count),
            totalCount: data.questions.length,
        });
    } catch (error) {
        console.error('ランダム問題の取得エラー:', error);
        res.status(500).json({ error: 'ランダム問題の取得に失敗しました' });
    }
});

/**
 * キャッシュをクリアするエンドポイント（開発用）
 */
router.post('/cache/clear', (req, res) => {
    questionsCache = null;
    res.json({ message: 'キャッシュをクリアしました' });
});

/**
 * POST /api/questions/import
 * CSVまたはJSONファイルをアップロードして問題データを更新
 */
router.post('/import', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'ファイルがアップロードされていません' });
        }

        const content = req.file.buffer.toString('utf-8');
        const ext = path.extname(req.file.originalname).toLowerCase();
        let newQuestions = [];

        if (ext === '.json') {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed.questions)) {
                newQuestions = parsed.questions;
            } else if (Array.isArray(parsed)) {
                newQuestions = parsed;
            } else {
                throw new Error('JSONの形式が正しくありません');
            }
        } else if (ext === '.csv') {
            const records = parse(content, {
                skip_empty_lines: true,
            });

            if (records.length < 2) {
                throw new Error('CSVデータが不足しています');
            }

            // 先頭行をヘッダーとしてスキップするか判定（"問題"や"question"が含まれる場合）
            const headerStr = records[0].join('').toLowerCase();
            const startIdx = (headerStr.includes('問題') || headerStr.includes('question') || headerStr.includes('問題文')) ? 1 : 0;

            for (let i = startIdx; i < records.length; i++) {
                const row = records[i];
                if (!row[0]) continue;

                const choices = [];
                const choiceLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
                
                // 4列目以降を選択肢として扱う (0: 問題, 1: 正解, 2: 解説, 3以降: 選択肢)
                for (let j = 3; j < row.length; j++) {
                    const text = row[j] ? row[j].trim() : '';
                    if (text) {
                        choices.push({
                            label: choiceLabels[j - 3] || String.fromCharCode(65 + (j - 3)),
                            text: text
                        });
                    }
                }

                newQuestions.push({
                    id: (i - startIdx) + 1,
                    question: row[0].trim(),
                    answer: row[1] ? row[1].trim() : '',
                    original: row[2] ? row[2].trim() : '',
                    choices: choices
                });
            }
        } else {
            return res.status(400).json({ error: 'CSVまたはJSONファイルのみ対応しています' });
        }

        // 保存
        const dataPath = path.join(__dirname, '..', 'data', 'questions.json');
        const output = { questions: newQuestions, totalCount: newQuestions.length };
        
        await fs.mkdir(path.dirname(dataPath), { recursive: true });
        await fs.writeFile(dataPath, JSON.stringify(output, null, 2), 'utf-8');
        
        questionsCache = output; // キャッシュ更新

        // 進捗データのリセットを呼び出すならここで行うこともできるが、
        // アプリ側から追加でリセットエンドポイントを呼ぶ方が設計が綺麗なのでここではデータ保存のみにする

        res.json({ message: 'データを正常にインポートしました', totalCount: newQuestions.length });
    } catch (error) {
        console.error('インポートエラー:', error);
        res.status(500).json({ error: `インポートに失敗しました: ${error.message}` });
    }
});

export default router;

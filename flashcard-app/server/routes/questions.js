import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// 問題データのキャッシュ
let questionsCache = null;

/**
 * 問題データを読み込む（キャッシュ付き）
 */
async function loadQuestions() {
    if (questionsCache) return questionsCache;

    const dataPath = path.join(__dirname, '..', '..', 'src', 'data', 'questions.json');
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

export default router;

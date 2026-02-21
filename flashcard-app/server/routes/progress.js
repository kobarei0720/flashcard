/**
 * 学習進捗API ルーター
 * 
 * エンドポイント:
 *   GET    /api/progress          - 全データ取得
 *   PUT    /api/progress          - 全データ更新（一括同期用）
 *   POST   /api/progress/mark     - マーク切り替え
 *   POST   /api/progress/answer   - 回答記録
 *   PUT    /api/progress/settings - 設定更新
 *   PUT    /api/progress/filter   - フィルター設定
 *   POST   /api/progress/reset    - リセット
 *   GET    /api/progress/export   - エクスポート
 */

import express from 'express';
import * as ProgressDB from '../db/progress.js';

const router = express.Router();

/**
 * GET /api/progress
 * 全学習データを取得
 */
router.get('/', async (req, res) => {
    try {
        const data = await ProgressDB.loadData();
        res.json(data);
    } catch (error) {
        console.error('進捗データ取得エラー:', error);
        res.status(500).json({ error: '進捗データの取得に失敗しました' });
    }
});

/**
 * PUT /api/progress
 * 全学習データを一括更新（クライアントからの同期用）
 */
router.put('/', async (req, res) => {
    try {
        const data = req.body;
        await ProgressDB.saveData(data);
        res.json({ message: '保存しました', data });
    } catch (error) {
        console.error('進捗データ保存エラー:', error);
        res.status(500).json({ error: '進捗データの保存に失敗しました' });
    }
});

/**
 * POST /api/progress/mark
 * 問題のマークを切り替え
 * Body: { questionId: number }
 */
router.post('/mark', async (req, res) => {
    try {
        const { questionId } = req.body;
        if (questionId === undefined) {
            return res.status(400).json({ error: 'questionId は必須です' });
        }
        const isMarked = await ProgressDB.toggleMark(questionId);
        res.json({ questionId, isMarked });
    } catch (error) {
        console.error('マーク更新エラー:', error);
        res.status(500).json({ error: 'マークの更新に失敗しました' });
    }
});

/**
 * POST /api/progress/answer
 * 回答を記録
 * Body: { questionId: number, isCorrect: boolean }
 */
router.post('/answer', async (req, res) => {
    try {
        const { questionId, isCorrect } = req.body;
        if (questionId === undefined || isCorrect === undefined) {
            return res.status(400).json({ error: 'questionId と isCorrect は必須です' });
        }
        await ProgressDB.recordAnswer(questionId, isCorrect);
        const data = await ProgressDB.loadData();
        res.json({
            questionId,
            isCorrect,
            stats: data.stats,
        });
    } catch (error) {
        console.error('回答記録エラー:', error);
        res.status(500).json({ error: '回答の記録に失敗しました' });
    }
});

/**
 * PUT /api/progress/settings
 * 設定を更新
 * Body: { prioritizeMarked?: boolean, shuffleChoices?: boolean, markedFrequency?: number }
 */
router.put('/settings', async (req, res) => {
    try {
        await ProgressDB.updateSettings(req.body);
        const data = await ProgressDB.loadData();
        res.json({ settings: data.settings });
    } catch (error) {
        console.error('設定更新エラー:', error);
        res.status(500).json({ error: '設定の更新に失敗しました' });
    }
});

/**
 * PUT /api/progress/filter
 * フィルターを設定
 * Body: { filter: string }
 */
router.put('/filter', async (req, res) => {
    try {
        const { filter } = req.body;
        if (!filter) {
            return res.status(400).json({ error: 'filter は必須です' });
        }
        await ProgressDB.setFilter(filter);
        res.json({ filter });
    } catch (error) {
        console.error('フィルター設定エラー:', error);
        res.status(500).json({ error: 'フィルターの設定に失敗しました' });
    }
});

/**
 * POST /api/progress/reset
 * 学習進捗をリセット
 */
router.post('/reset', async (req, res) => {
    try {
        await ProgressDB.resetProgress();
        const data = await ProgressDB.loadData();
        res.json({ message: 'リセットしました', data });
    } catch (error) {
        console.error('リセットエラー:', error);
        res.status(500).json({ error: 'リセットに失敗しました' });
    }
});

/**
 * GET /api/progress/export
 * データをエクスポート
 */
router.get('/export', async (req, res) => {
    try {
        const data = await ProgressDB.loadData();
        const filename = `flashcard-progress-${new Date().toISOString().split('T')[0]}.json`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/json');
        res.json(data);
    } catch (error) {
        console.error('エクスポートエラー:', error);
        res.status(500).json({ error: 'エクスポートに失敗しました' });
    }
});

export default router;

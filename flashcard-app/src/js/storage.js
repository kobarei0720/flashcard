/**
 * AWS SAP-C02 フラッシュカード - ストレージ管理モジュール
 * 
 * サーバーAPI と localStorage のハイブリッド管理
 * - 書き込み: サーバーAPIに送信 + localStorageにキャッシュ
 * - 読み込み: localStorageから即座に返す（高速）
 * - 初期化時: サーバーからデータを取得してlocalStorageに同期
 */

import * as API from './api.js';

const STORAGE_KEY = 'aws-sap-flashcard';

/**
 * デフォルトのデータ構造
 */
function getDefaultData() {
    return {
        markedQuestions: [],
        answeredQuestions: {},
        currentFilter: 'all',
        settings: {
            prioritizeMarked: true,
            shuffleChoices: true,
            markedFrequency: 3,
        },
        stats: {
            totalAnswered: 0,
            correctCount: 0,
        },
    };
}

// ===========================
// ローカルキャッシュ操作
// ===========================

/**
 * ローカルキャッシュからデータを読み込む
 */
function loadLocal() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const data = JSON.parse(stored);
            return { ...getDefaultData(), ...data };
        }
    } catch (e) {
        console.error('ローカルキャッシュ読み込みエラー:', e);
    }
    return getDefaultData();
}

/**
 * ローカルキャッシュにデータを保存
 */
function saveLocal(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.error('ローカルキャッシュ保存エラー:', e);
    }
}

// ===========================
// サーバー同期
// ===========================

/**
 * サーバーからデータを取得してローカルキャッシュに同期
 * アプリ起動時に呼び出す
 * @returns {Promise<Object>} 同期後のデータ
 */
export async function syncFromServer() {
    try {
        const serverData = await API.fetchProgress();
        saveLocal(serverData);
        console.log('✅ サーバーからデータを同期しました');
        return serverData;
    } catch (error) {
        console.warn('⚠️ サーバー同期に失敗、ローカルキャッシュを使用:', error.message);
        return loadLocal();
    }
}

// ===========================
// 公開API（読み込みはローカル、書き込みはサーバー+ローカル）
// ===========================

/**
 * 問題をマーク/アンマーク
 */
export async function toggleMark(questionId) {
    // ローカルを即座に更新（UIの応答性のため）
    const data = loadLocal();
    const index = data.markedQuestions.indexOf(questionId);
    const isMarked = index === -1;

    if (isMarked) {
        data.markedQuestions.push(questionId);
    } else {
        data.markedQuestions.splice(index, 1);
    }
    saveLocal(data);

    // サーバーにも送信（バックグラウンド）
    try {
        await API.toggleMark(questionId);
    } catch (error) {
        console.warn('サーバーへのマーク同期に失敗:', error.message);
    }

    return isMarked;
}

/**
 * 問題がマーク済みかチェック
 */
export function isMarked(questionId) {
    const data = loadLocal();
    return data.markedQuestions.includes(questionId);
}

/**
 * マークした問題のリストを取得
 */
export function getMarkedQuestions() {
    const data = loadLocal();
    return data.markedQuestions;
}

/**
 * 回答を記録
 */
export async function recordAnswer(questionId, isCorrect) {
    // ローカルを即座に更新
    const data = loadLocal();

    if (!data.answeredQuestions[questionId]) {
        data.answeredQuestions[questionId] = { correct: 0, incorrect: 0 };
    }

    if (isCorrect) {
        data.answeredQuestions[questionId].correct++;
        data.stats.correctCount++;
    } else {
        data.answeredQuestions[questionId].incorrect++;
    }

    data.stats.totalAnswered++;
    saveLocal(data);

    // サーバーにも送信
    try {
        await API.recordAnswer(questionId, isCorrect);
    } catch (error) {
        console.warn('サーバーへの回答記録同期に失敗:', error.message);
    }
}

/**
 * 統計情報を取得
 */
export function getStats() {
    const data = loadLocal();
    return data.stats;
}

/**
 * 設定を取得
 */
export function getSettings() {
    const data = loadLocal();
    return data.settings;
}

/**
 * 設定を更新
 */
export async function updateSettings(newSettings) {
    // ローカルを即座に更新
    const data = loadLocal();
    data.settings = { ...data.settings, ...newSettings };
    saveLocal(data);

    // サーバーにも送信
    try {
        await API.updateSettings(newSettings);
    } catch (error) {
        console.warn('サーバーへの設定同期に失敗:', error.message);
    }
}

/**
 * フィルターを設定
 */
export async function setFilter(filter) {
    // ローカルを即座に更新
    const data = loadLocal();
    data.currentFilter = filter;
    saveLocal(data);

    // サーバーにも送信
    try {
        await API.setFilter(filter);
    } catch (error) {
        console.warn('サーバーへのフィルター同期に失敗:', error.message);
    }
}

/**
 * 現在のフィルターを取得
 */
export function getFilter() {
    const data = loadLocal();
    return data.currentFilter;
}

/**
 * 間違えた問題のIDリストを取得
 */
export function getIncorrectQuestions() {
    const data = loadLocal();
    return Object.entries(data.answeredQuestions)
        .filter(([, history]) => history.incorrect > 0)
        .map(([id]) => parseInt(id));
}

/**
 * 未回答の問題か判定
 */
export function isUnanswered(questionId) {
    const data = loadLocal();
    return !data.answeredQuestions[questionId];
}

/**
 * 進捗をリセット
 */
export async function reset() {
    // ローカルをリセット
    localStorage.removeItem(STORAGE_KEY);

    // サーバーもリセット
    try {
        await API.resetProgress();
    } catch (error) {
        console.warn('サーバーのリセットに失敗:', error.message);
    }
}

/**
 * データをエクスポート（サーバーからダウンロード）
 */
export function exportData() {
    // サーバーのエクスポートエンドポイントから直接ダウンロード
    window.open('/api/progress/export', '_blank');
}

/**
 * データをインポート
 */
export async function importData(jsonData) {
    try {
        const data = JSON.parse(jsonData);
        saveLocal(data);
        await API.saveProgress(data);
        return true;
    } catch (e) {
        console.error('インポートエラー:', e);
        return false;
    }
}

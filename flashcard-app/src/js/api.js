/**
 * AWS SAP-C02 フラッシュカード - APIクライアント
 * サーバーサイドAPIとの通信を管理
 */

const API_BASE = '/api';

// ===========================
// 問題データ API
// ===========================

/**
 * 全問題を取得
 * @param {Object} options - オプション
 * @param {number} options.limit - 取得件数
 * @param {number} options.offset - オフセット
 * @param {number[]} options.ids - 取得するIDの配列
 * @returns {Promise<{questions: Array, totalCount: number}>}
 */
export async function fetchQuestions(options = {}) {
    const params = new URLSearchParams();

    if (options.limit) params.set('limit', options.limit);
    if (options.offset) params.set('offset', options.offset);
    if (options.ids?.length) params.set('ids', options.ids.join(','));

    const url = `${API_BASE}/questions${params.toString() ? '?' + params : ''}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`API エラー: ${response.status}`);
    }

    return response.json();
}

/**
 * 指定IDの問題を取得
 * @param {number} id - 問題ID
 * @returns {Promise<Object>}
 */
export async function fetchQuestionById(id) {
    const response = await fetch(`${API_BASE}/questions/${id}`);

    if (!response.ok) {
        throw new Error(`問題 ${id} の取得に失敗: ${response.status}`);
    }

    return response.json();
}

/**
 * ランダムな問題を取得
 * @param {number} count - 取得件数
 * @returns {Promise<{questions: Array, totalCount: number}>}
 */
export async function fetchRandomQuestions(count = 1) {
    const response = await fetch(`${API_BASE}/questions/random?count=${count}`);

    if (!response.ok) {
        throw new Error(`ランダム問題の取得に失敗: ${response.status}`);
    }

    return response.json();
}

// ===========================
// 学習進捗 API
// ===========================

/**
 * サーバーから進捗データを取得
 * @returns {Promise<Object>}
 */
export async function fetchProgress() {
    const response = await fetch(`${API_BASE}/progress`);

    if (!response.ok) {
        throw new Error(`進捗データの取得に失敗: ${response.status}`);
    }

    return response.json();
}

/**
 * サーバーに進捗データを一括保存
 * @param {Object} data - 進捗データ
 * @returns {Promise<Object>}
 */
export async function saveProgress(data) {
    const response = await fetch(`${API_BASE}/progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        throw new Error(`進捗データの保存に失敗: ${response.status}`);
    }

    return response.json();
}

/**
 * マークを切り替え
 * @param {number} questionId
 * @returns {Promise<{questionId: number, isMarked: boolean}>}
 */
export async function toggleMark(questionId) {
    const response = await fetch(`${API_BASE}/progress/mark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId }),
    });

    if (!response.ok) {
        throw new Error(`マーク更新に失敗: ${response.status}`);
    }

    return response.json();
}

/**
 * 回答を記録
 * @param {number} questionId
 * @param {boolean} isCorrect
 * @returns {Promise<Object>}
 */
export async function recordAnswer(questionId, isCorrect) {
    const response = await fetch(`${API_BASE}/progress/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, isCorrect }),
    });

    if (!response.ok) {
        throw new Error(`回答記録に失敗: ${response.status}`);
    }

    return response.json();
}

/**
 * 設定を更新
 * @param {Object} settings
 * @returns {Promise<Object>}
 */
export async function updateSettings(settings) {
    const response = await fetch(`${API_BASE}/progress/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
    });

    if (!response.ok) {
        throw new Error(`設定更新に失敗: ${response.status}`);
    }

    return response.json();
}

/**
 * フィルターを設定
 * @param {string} filter
 * @returns {Promise<Object>}
 */
export async function setFilter(filter) {
    const response = await fetch(`${API_BASE}/progress/filter`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filter }),
    });

    if (!response.ok) {
        throw new Error(`フィルター設定に失敗: ${response.status}`);
    }

    return response.json();
}

/**
 * 進捗をリセット
 * @returns {Promise<Object>}
 */
export async function resetProgress() {
    const response = await fetch(`${API_BASE}/progress/reset`, {
        method: 'POST',
    });

    if (!response.ok) {
        throw new Error(`リセットに失敗: ${response.status}`);
    }

    return response.json();
}

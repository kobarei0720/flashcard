/**
 * Offline API for iOS/Local usage
 * Fetches questions natively from the bundled JSON.
 * Saves progress and settings to localStorage.
 */

import sampleQuestions from './sampleQuestions.js';

const STORAGE_KEY = 'flashcard_progress_v1';
const CUSTOM_Q_KEY = 'flashcard_custom_questions_v1';

// Initialize default progress
const getDefaultProgress = () => ({
    stats: { totalAnswered: 0, correctCount: 0 },
    markedQuestions: [],
    answeredQuestions: {}, // { id: { correct: 0, incorrect: 0 } }
    settings: { shuffleChoices: true }
});

// Load progress from localStorage
const loadProgressLocal = () => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        console.error('Failed to parse local storage progress', e);
    }
    return getDefaultProgress();
};

// Save progress to localStorage
const saveProgressLocal = (progress) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
};

export function getCustomQuestions() {
    try {
        const saved = localStorage.getItem(CUSTOM_Q_KEY);
        if (saved) return JSON.parse(saved);
    } catch (e) {
        console.error('Failed to parse local custom questions', e);
    }
    return [];
}

export function saveCustomQuestions(newQuestions) {
    // 既存のカスタム問題にインポート分を追加
    const existing = getCustomQuestions();
    const merged = [...existing, ...newQuestions];
    localStorage.setItem(CUSTOM_Q_KEY, JSON.stringify(merged));
    return merged;
}

export async function fetchQuestions() {
    try {
        // カスタム問題（インポートされた問題）を取得
        const customQ = getCustomQuestions();

        // カスタム問題がある場合はそちらを優先、なければサンプル問題を返す
        if (customQ.length > 0) {
            return { questions: customQ, totalCount: customQ.length };
        }

        // デフォルト: サンプル問題を表示
        return { questions: sampleQuestions, totalCount: sampleQuestions.length };
    } catch (error) {
        console.error('Failed to load questions:', error);
        return { questions: sampleQuestions, totalCount: sampleQuestions.length };
    }
}

export async function fetchProgress() {
    return loadProgressLocal();
}

export async function recordAnswer(id, isCorrect) {
    const progress = loadProgressLocal();
    
    // 統計更新
    progress.stats.totalAnswered += 1;
    if (isCorrect) {
        progress.stats.correctCount += 1;
    }

    // 個別問題更新
    if (!progress.answeredQuestions[id]) {
        progress.answeredQuestions[id] = { correct: 0, incorrect: 0 };
    }
    if (isCorrect) {
        progress.answeredQuestions[id].correct += 1;
    } else {
        progress.answeredQuestions[id].incorrect += 1;
    }

    saveProgressLocal(progress);
    
    // App.jsxは stats オブジェクトを期待する
    return { stats: progress.stats };
}

export async function toggleMark(id) {
    const progress = loadProgressLocal();
    let isMarked = false;

    if (progress.markedQuestions.includes(id)) {
        progress.markedQuestions = progress.markedQuestions.filter(qId => qId !== id);
    } else {
        progress.markedQuestions.push(id);
        isMarked = true;
    }

    saveProgressLocal(progress);
    return { isMarked };
}

export async function resetProgress() {
    const defaultProgress = getDefaultProgress();
    saveProgressLocal(defaultProgress);
    return defaultProgress;
}

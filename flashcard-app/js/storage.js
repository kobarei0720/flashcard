/**
 * AWS SAP-C02 フラッシュカード - ローカルストレージ管理
 */

const StorageManager = {
    STORAGE_KEY: 'aws-sap-flashcard',

    /**
     * デフォルトのデータ構造
     */
    getDefaultData() {
        return {
            markedQuestions: [],      // マークした問題のID配列
            answeredQuestions: {},    // 回答済み問題 { id: { correct: boolean, count: number } }
            currentFilter: 'all',     // 現在のフィルター
            settings: {
                prioritizeMarked: true,
                shuffleChoices: true,
                markedFrequency: 3
            },
            stats: {
                totalAnswered: 0,
                correctCount: 0
            }
        };
    },

    /**
     * データを読み込む
     */
    load() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                // デフォルト値とマージ
                return { ...this.getDefaultData(), ...data };
            }
        } catch (e) {
            console.error('ストレージ読み込みエラー:', e);
        }
        return this.getDefaultData();
    },

    /**
     * データを保存
     */
    save(data) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('ストレージ保存エラー:', e);
        }
    },

    /**
     * 問題をマーク/アンマーク
     */
    toggleMark(questionId) {
        const data = this.load();
        const index = data.markedQuestions.indexOf(questionId);

        if (index === -1) {
            data.markedQuestions.push(questionId);
        } else {
            data.markedQuestions.splice(index, 1);
        }

        this.save(data);
        return index === -1; // trueならマーク追加、falseなら削除
    },

    /**
     * 問題がマーク済みかチェック
     */
    isMarked(questionId) {
        const data = this.load();
        return data.markedQuestions.includes(questionId);
    },

    /**
     * マークした問題のリストを取得
     */
    getMarkedQuestions() {
        const data = this.load();
        return data.markedQuestions;
    },

    /**
     * 回答を記録
     */
    recordAnswer(questionId, isCorrect) {
        const data = this.load();

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
        this.save(data);
    },

    /**
     * 問題の回答履歴を取得
     */
    getQuestionHistory(questionId) {
        const data = this.load();
        return data.answeredQuestions[questionId] || null;
    },

    /**
     * 統計情報を取得
     */
    getStats() {
        const data = this.load();
        return data.stats;
    },

    /**
     * 設定を取得
     */
    getSettings() {
        const data = this.load();
        return data.settings;
    },

    /**
     * 設定を更新
     */
    updateSettings(newSettings) {
        const data = this.load();
        data.settings = { ...data.settings, ...newSettings };
        this.save(data);
    },

    /**
     * フィルターを設定
     */
    setFilter(filter) {
        const data = this.load();
        data.currentFilter = filter;
        this.save(data);
    },

    /**
     * 現在のフィルターを取得
     */
    getFilter() {
        const data = this.load();
        return data.currentFilter;
    },

    /**
     * 間違えた問題のIDリストを取得
     */
    getIncorrectQuestions() {
        const data = this.load();
        return Object.entries(data.answeredQuestions)
            .filter(([id, history]) => history.incorrect > 0)
            .map(([id]) => parseInt(id));
    },

    /**
     * 未回答の問題IDを取得するためのフィルター関数
     */
    isUnanswered(questionId) {
        const data = this.load();
        return !data.answeredQuestions[questionId];
    },

    /**
     * 進捗をリセット
     */
    reset() {
        localStorage.removeItem(this.STORAGE_KEY);
    },

    /**
     * データをエクスポート
     */
    export() {
        const data = this.load();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `flashcard-progress-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },

    /**
     * データをインポート
     */
    import(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            this.save(data);
            return true;
        } catch (e) {
            console.error('インポートエラー:', e);
            return false;
        }
    }
};

/**
 * AWS SAP-C02 フラッシュカード - メインアプリケーション
 * ES Modules版
 */

import * as Storage from './storage.js';
import { fetchQuestions } from './api.js';

export class FlashcardApp {
    constructor() {
        this.questions = [];
        this.currentQuestion = null;
        this.currentIndex = -1;
        this.selectedChoices = [];
        this.isAnswered = false;
        this.questionHistory = [];
        this.displayToOriginalMap = {};
    }

    /**
     * アプリケーションを初期化
     */
    async init() {
        // サーバーから学習データを同期
        await Storage.syncFromServer();
        await this.loadQuestions();
        this.bindEvents();
        this.updateStats();
        this.loadSettings();
        this.showNextQuestion();
    }

    /**
     * 問題データを読み込む（API経由）
     */
    async loadQuestions() {
        try {
            const data = await fetchQuestions();
            this.questions = data.questions;
            document.getElementById('total-count').textContent = this.questions.length;
        } catch (error) {
            console.error('問題データの読み込みに失敗しました:', error);
            this.showError('問題データの読み込みに失敗しました。サーバーの起動状態を確認してください。');
        }
    }

    /**
     * エラーメッセージを表示
     */
    showError(message) {
        const questionText = document.getElementById('question-text');
        questionText.innerHTML = `<span style="color: var(--accent-danger);">${message}</span>`;
    }

    /**
     * イベントリスナーを設定
     */
    bindEvents() {
        // 回答ボタン
        document.getElementById('submit-btn').addEventListener('click', () => this.submitAnswer());

        // 次の問題ボタン
        document.getElementById('next-btn').addEventListener('click', () => this.showNextQuestion());

        // 前の問題ボタン
        document.getElementById('prev-btn').addEventListener('click', () => this.showPreviousQuestion());

        // マークボタン
        document.getElementById('mark-btn').addEventListener('click', () => this.toggleMark());

        // 設定トグル
        document.getElementById('settings-toggle').addEventListener('click', () => {
            document.getElementById('settings-content').classList.toggle('hidden');
        });

        // 設定変更
        document.getElementById('prioritize-marked').addEventListener('change', (e) => {
            Storage.updateSettings({ prioritizeMarked: e.target.checked });
        });

        document.getElementById('shuffle-choices').addEventListener('change', (e) => {
            Storage.updateSettings({ shuffleChoices: e.target.checked });
        });

        document.getElementById('marked-frequency').addEventListener('change', (e) => {
            Storage.updateSettings({ markedFrequency: parseInt(e.target.value) });
        });

        // リセットボタン
        document.getElementById('reset-progress').addEventListener('click', async () => {
            if (confirm('すべての進捗データをリセットしますか？この操作は取り消せません。')) {
                await Storage.reset();
                this.updateStats();
                this.showNextQuestion();
            }
        });

        // エクスポートボタン
        document.getElementById('export-data').addEventListener('click', () => {
            Storage.exportData();
        });

        // 原文表示ボタン
        document.getElementById('show-original-btn').addEventListener('click', () => {
            document.getElementById('original-text').classList.toggle('hidden');
        });

        // フィルターボタン
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                Storage.setFilter(e.target.dataset.filter);
                this.showNextQuestion();
            });
        });
    }

    /**
     * 設定を読み込んでUIに反映
     */
    loadSettings() {
        const settings = Storage.getSettings();
        document.getElementById('prioritize-marked').checked = settings.prioritizeMarked;
        document.getElementById('shuffle-choices').checked = settings.shuffleChoices;
        document.getElementById('marked-frequency').value = settings.markedFrequency;

        // 現在のフィルターを反映
        const currentFilter = Storage.getFilter();
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === currentFilter);
        });
    }

    /**
     * 次の問題を取得（重み付きランダム選択）
     */
    getNextQuestion() {
        if (this.questions.length === 0) return null;

        const settings = Storage.getSettings();
        const currentFilter = Storage.getFilter();
        const markedIds = Storage.getMarkedQuestions();
        const incorrectIds = Storage.getIncorrectQuestions();

        // フィルターに基づいて問題をフィルタリング
        let filteredQuestions = this.questions;

        switch (currentFilter) {
            case 'marked':
                filteredQuestions = this.questions.filter(q => markedIds.includes(q.id));
                break;
            case 'incorrect':
                filteredQuestions = this.questions.filter(q => incorrectIds.includes(q.id));
                break;
            case 'unseen':
                filteredQuestions = this.questions.filter(q => Storage.isUnanswered(q.id));
                break;
        }

        if (filteredQuestions.length === 0) {
            if (currentFilter !== 'all') {
                return null;
            }
            filteredQuestions = this.questions;
        }

        // 重み付き配列を作成
        const weightedQuestions = [];

        filteredQuestions.forEach(q => {
            let weight = 1;

            if (settings.prioritizeMarked && markedIds.includes(q.id)) {
                weight = settings.markedFrequency;
            }

            if (incorrectIds.includes(q.id)) {
                weight += 1;
            }

            for (let i = 0; i < weight; i++) {
                weightedQuestions.push(q);
            }
        });

        // ランダムに選択
        const randomIndex = Math.floor(Math.random() * weightedQuestions.length);
        return weightedQuestions[randomIndex];
    }

    /**
     * 次の問題を表示
     */
    showNextQuestion() {
        const question = this.getNextQuestion();

        if (!question) {
            this.showError('表示できる問題がありません。フィルターを変更してください。');
            return;
        }

        // 履歴に追加
        if (this.currentQuestion) {
            this.questionHistory.push(this.currentQuestion);
        }

        this.currentQuestion = question;
        this.selectedChoices = [];
        this.isAnswered = false;

        this.renderQuestion(question);
        this.updateUI();
    }

    /**
     * 前の問題を表示
     */
    showPreviousQuestion() {
        if (this.questionHistory.length === 0) return;

        this.currentQuestion = this.questionHistory.pop();
        this.selectedChoices = [];
        this.isAnswered = false;

        this.renderQuestion(this.currentQuestion);
        this.updateUI();
    }

    /**
     * 問題をレンダリング
     */
    renderQuestion(question) {
        const settings = Storage.getSettings();

        // 問題番号
        document.getElementById('question-number').textContent = `問題 ${question.id}`;

        // 問題文
        document.getElementById('question-text').textContent = question.question;

        // マーク状態
        const isMarked = Storage.isMarked(question.id);
        const markBtn = document.getElementById('mark-btn');
        const questionCard = document.getElementById('question-card');
        markBtn.classList.toggle('active', isMarked);
        questionCard.classList.toggle('marked', isMarked);

        // 選択肢
        let choices = [...question.choices];
        if (settings.shuffleChoices) {
            choices = this.shuffleArray(choices);
        }

        // 表示ラベル（常にA, B, C, D...の順）
        const displayLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        this.displayToOriginalMap = {};

        const choicesContainer = document.getElementById('choices');
        choicesContainer.innerHTML = '';

        choices.forEach((choice, index) => {
            const displayLabel = displayLabels[index];
            const originalLabel = choice.label;

            // マッピングを保存（表示ラベル → 元のラベル）
            this.displayToOriginalMap[displayLabel] = originalLabel;

            const choiceEl = document.createElement('div');
            choiceEl.className = 'choice-item';
            choiceEl.dataset.displayLabel = displayLabel;
            choiceEl.dataset.originalLabel = originalLabel;
            choiceEl.innerHTML = `
        <span class="choice-label">${displayLabel}</span>
        <span class="choice-text">${choice.text}</span>
      `;
            choiceEl.addEventListener('click', () => this.selectChoice(displayLabel, choiceEl));
            choicesContainer.appendChild(choiceEl);
        });

        // 原文
        document.getElementById('original-text').textContent = question.original || '原文データがありません';
        document.getElementById('original-text').classList.add('hidden');

        // 回答セクションを非表示
        document.getElementById('answer-section').classList.add('hidden');
    }

    /**
     * 選択肢を選択
     */
    selectChoice(label, element) {
        if (this.isAnswered) return;

        const answer = this.currentQuestion.answer;
        const isMultiple = answer.includes(',');

        if (isMultiple) {
            // 複数選択
            element.classList.toggle('selected');
            const index = this.selectedChoices.indexOf(label);
            if (index === -1) {
                this.selectedChoices.push(label);
            } else {
                this.selectedChoices.splice(index, 1);
            }
        } else {
            // 単一選択
            document.querySelectorAll('.choice-item').forEach(el => el.classList.remove('selected'));
            element.classList.add('selected');
            this.selectedChoices = [label];
        }
    }

    /**
     * 回答を送信
     */
    submitAnswer() {
        if (this.selectedChoices.length === 0) {
            alert('選択肢を選んでください');
            return;
        }

        this.isAnswered = true;

        const answer = this.currentQuestion.answer;
        const correctAnswers = answer.includes(',')
            ? answer.split(',').map(a => a.trim())
            : answer.split('').filter(a => a.trim() !== '');

        // 選択された表示ラベルを元のラベルに変換
        const userOriginalAnswers = this.selectedChoices.map(displayLabel =>
            this.displayToOriginalMap[displayLabel]
        ).sort();
        const sortedCorrect = [...correctAnswers].sort();

        const isCorrect = JSON.stringify(userOriginalAnswers) === JSON.stringify(sortedCorrect);

        // 回答を記録
        Storage.recordAnswer(this.currentQuestion.id, isCorrect);

        // 結果を表示
        this.showResult(isCorrect, correctAnswers);
        this.updateStats();
    }

    /**
     * 結果を表示
     */
    showResult(isCorrect, correctAnswers) {
        const answerSection = document.getElementById('answer-section');
        const answerResult = document.getElementById('answer-result');
        const correctAnswer = document.getElementById('correct-answer');

        answerSection.classList.remove('hidden');

        if (isCorrect) {
            answerResult.className = 'answer-result correct';
            answerResult.textContent = '🎉 正解！';
        } else {
            answerResult.className = 'answer-result incorrect';
            answerResult.textContent = '❌ 不正解';
        }

        // 正解の選択肢を取得（表示ラベルと選択肢テキスト）
        const correctChoiceInfos = [];
        document.querySelectorAll('.choice-item').forEach(el => {
            const originalLabel = el.dataset.originalLabel;
            const displayLabel = el.dataset.displayLabel;
            const choiceText = el.querySelector('.choice-text').textContent;

            if (correctAnswers.includes(originalLabel)) {
                correctChoiceInfos.push({
                    displayLabel,
                    text: choiceText,
                });
            }
        });

        // 正解を表示（ラベルと選択肢のテキスト）
        if (correctChoiceInfos.length > 0) {
            const correctLabels = correctChoiceInfos.map(info => info.displayLabel).sort().join(', ');
            let correctHtml = `<div class="correct-answer-header">正解: ${correctLabels}</div>`;
            correctHtml += '<div class="correct-answer-details">';
            correctChoiceInfos.forEach(info => {
                correctHtml += `<div class="correct-choice-item"><span class="correct-choice-label">${info.displayLabel}</span>: ${info.text}</div>`;
            });
            correctHtml += '</div>';
            correctAnswer.innerHTML = correctHtml;
        } else {
            correctAnswer.textContent = `正解: ${correctAnswers.join(', ')}`;
        }

        // 選択肢にスタイルを適用
        document.querySelectorAll('.choice-item').forEach(el => {
            el.classList.add('disabled');
            const originalLabel = el.dataset.originalLabel;
            const displayLabel = el.dataset.displayLabel;

            if (correctAnswers.includes(originalLabel)) {
                el.classList.add('correct');
            } else if (this.selectedChoices.includes(displayLabel)) {
                el.classList.add('incorrect');
            }
        });

        this.updateUI();
    }

    /**
     * UIを更新
     */
    updateUI() {
        const submitBtn = document.getElementById('submit-btn');
        const nextBtn = document.getElementById('next-btn');
        const prevBtn = document.getElementById('prev-btn');

        if (this.isAnswered) {
            submitBtn.classList.add('hidden');
            nextBtn.classList.remove('hidden');
        } else {
            submitBtn.classList.remove('hidden');
            nextBtn.classList.add('hidden');
        }

        prevBtn.disabled = this.questionHistory.length === 0;
    }

    /**
     * 統計情報を更新
     */
    updateStats() {
        const stats = Storage.getStats();
        const markedCount = Storage.getMarkedQuestions().length;

        document.getElementById('progress-count').textContent = stats.totalAnswered;
        document.getElementById('marked-count').textContent = markedCount;

        const accuracy = stats.totalAnswered > 0
            ? Math.round((stats.correctCount / stats.totalAnswered) * 100)
            : 0;
        document.getElementById('accuracy').textContent = accuracy;
    }

    /**
     * マークを切り替え
     */
    async toggleMark() {
        if (!this.currentQuestion) return;

        const isNowMarked = await Storage.toggleMark(this.currentQuestion.id);

        const markBtn = document.getElementById('mark-btn');
        const questionCard = document.getElementById('question-card');

        markBtn.classList.toggle('active', isNowMarked);
        questionCard.classList.toggle('marked', isNowMarked);

        this.updateStats();
    }

    /**
     * 配列をシャッフル（Fisher-Yates）
     */
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}

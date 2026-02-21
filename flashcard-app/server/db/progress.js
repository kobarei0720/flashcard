/**
 * サーバーサイド学習データ管理（SQLite版）
 *
 * データは server/data/flashcard.db に永続化されます。
 * APIルート側のインターフェースは変更なし。
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DB_DIR, 'flashcard.db');

// データディレクトリを確保
if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
}

// DB接続（アプリ起動時に1回だけ）
const db = new Database(DB_PATH);

// WALモード（読み書き並行で高速化）
db.pragma('journal_mode = WAL');

// ===========================
// テーブル初期化
// ===========================

db.exec(`
  -- マークした問題
  CREATE TABLE IF NOT EXISTS marks (
    question_id INTEGER PRIMARY KEY,
    created_at  TEXT DEFAULT (datetime('now', 'localtime'))
  );

  -- 回答履歴（1回答ごとに1レコード）
  CREATE TABLE IF NOT EXISTS answers (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL,
    is_correct  INTEGER NOT NULL,
    answered_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  -- 設定（key-value形式）
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// デフォルト設定を挿入（存在しなければ）
const defaultSettings = {
    prioritizeMarked: 'true',
    shuffleChoices: 'true',
    markedFrequency: '3',
    currentFilter: 'all',
};

const insertSettingStmt = db.prepare(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
);
for (const [key, value] of Object.entries(defaultSettings)) {
    insertSettingStmt.run(key, value);
}

// ===========================
// プリペアドステートメント（高速化）
// ===========================

const stmts = {
    // マーク
    getMark: db.prepare('SELECT 1 FROM marks WHERE question_id = ?'),
    insertMark: db.prepare('INSERT INTO marks (question_id) VALUES (?)'),
    deleteMark: db.prepare('DELETE FROM marks WHERE question_id = ?'),
    getAllMarks: db.prepare('SELECT question_id FROM marks ORDER BY created_at'),

    // 回答
    insertAnswer: db.prepare(
        'INSERT INTO answers (question_id, is_correct) VALUES (?, ?)'
    ),
    getAnswerStats: db.prepare(`
    SELECT
      COUNT(*) as total_answered,
      SUM(is_correct) as correct_count
    FROM answers
  `),
    getQuestionStats: db.prepare(`
    SELECT
      question_id,
      SUM(is_correct) as correct,
      SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) as incorrect
    FROM answers
    GROUP BY question_id
  `),
    getIncorrectQuestions: db.prepare(`
    SELECT DISTINCT question_id
    FROM answers
    WHERE is_correct = 0
  `),
    getAnsweredQuestionIds: db.prepare(
        'SELECT DISTINCT question_id FROM answers'
    ),

    // 設定
    getSetting: db.prepare('SELECT value FROM settings WHERE key = ?'),
    upsertSetting: db.prepare(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    ),

    // リセット
    clearMarks: db.prepare('DELETE FROM marks'),
    clearAnswers: db.prepare('DELETE FROM answers'),
    clearSettings: db.prepare('DELETE FROM settings'),
};

// ===========================
// エクスポート関数（APIルートと互換のインターフェース）
// ===========================

/**
 * 全データを読み込む（APIレスポンス用の形式で返す）
 */
export async function loadData() {
    const marks = stmts.getAllMarks.all().map((r) => r.question_id);

    // 回答履歴を { questionId: { correct, incorrect } } 形式に変換
    const answeredQuestions = {};
    for (const row of stmts.getQuestionStats.all()) {
        answeredQuestions[row.question_id] = {
            correct: row.correct,
            incorrect: row.incorrect,
        };
    }

    const statsRow = stmts.getAnswerStats.get();
    const stats = {
        totalAnswered: statsRow.total_answered || 0,
        correctCount: statsRow.correct_count || 0,
    };

    const settings = getSettingsObject();
    const currentFilter =
        stmts.getSetting.get('currentFilter')?.value || 'all';

    return {
        markedQuestions: marks,
        answeredQuestions,
        currentFilter,
        settings,
        stats,
        lastUpdated: new Date().toISOString(),
    };
}

/**
 * 全データを保存（一括インポート用）
 */
export async function saveData(data) {
    const importTransaction = db.transaction((d) => {
        // 既存データをクリア
        stmts.clearMarks.run();
        stmts.clearAnswers.run();
        stmts.clearSettings.run();

        // マーク復元
        if (d.markedQuestions) {
            for (const qid of d.markedQuestions) {
                stmts.insertMark.run(qid);
            }
        }

        // 回答履歴復元
        if (d.answeredQuestions) {
            for (const [qid, history] of Object.entries(d.answeredQuestions)) {
                // correct回数分のレコードを挿入
                for (let i = 0; i < (history.correct || 0); i++) {
                    stmts.insertAnswer.run(parseInt(qid), 1);
                }
                for (let i = 0; i < (history.incorrect || 0); i++) {
                    stmts.insertAnswer.run(parseInt(qid), 0);
                }
            }
        }

        // 設定復元
        if (d.settings) {
            for (const [key, value] of Object.entries(d.settings)) {
                stmts.upsertSetting.run(key, String(value));
            }
        }

        if (d.currentFilter) {
            stmts.upsertSetting.run('currentFilter', d.currentFilter);
        }
    });

    importTransaction(data);
}

/**
 * マークを切り替え
 */
export async function toggleMark(questionId) {
    const exists = stmts.getMark.get(questionId);

    if (exists) {
        stmts.deleteMark.run(questionId);
        return false;
    } else {
        stmts.insertMark.run(questionId);
        return true;
    }
}

/**
 * 回答を記録
 */
export async function recordAnswer(questionId, isCorrect) {
    stmts.insertAnswer.run(questionId, isCorrect ? 1 : 0);
}

/**
 * 設定を更新
 */
export async function updateSettings(newSettings) {
    const updateTransaction = db.transaction((settings) => {
        for (const [key, value] of Object.entries(settings)) {
            stmts.upsertSetting.run(key, String(value));
        }
    });

    updateTransaction(newSettings);
}

/**
 * フィルターを設定
 */
export async function setFilter(filter) {
    stmts.upsertSetting.run('currentFilter', filter);
}

/**
 * 進捗をリセット
 */
export async function resetProgress() {
    const resetTransaction = db.transaction(() => {
        stmts.clearMarks.run();
        stmts.clearAnswers.run();
        stmts.clearSettings.run();

        // デフォルト設定を再挿入
        for (const [key, value] of Object.entries(defaultSettings)) {
            insertSettingStmt.run(key, value);
        }
    });

    resetTransaction();
}

// ===========================
// ヘルパー関数
// ===========================

/**
 * 設定をオブジェクト形式で取得
 */
function getSettingsObject() {
    return {
        prioritizeMarked:
            stmts.getSetting.get('prioritizeMarked')?.value === 'true',
        shuffleChoices:
            stmts.getSetting.get('shuffleChoices')?.value === 'true',
        markedFrequency: parseInt(
            stmts.getSetting.get('markedFrequency')?.value || '3'
        ),
    };
}

/**
 * プロセス終了時にDB接続をクローズ
 */
process.on('exit', () => db.close());
process.on('SIGINT', () => {
    db.close();
    process.exit(0);
});
process.on('SIGTERM', () => {
    db.close();
    process.exit(0);
});

import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import * as api from './js/api.js';
import sampleQuestions from './js/sampleQuestions.js';

function App() {
  const [questions, setQuestions] = useState([]);
  const [progress, setProgress] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedChoices, setSelectedChoices] = useState([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);
  const [displayToOriginalMap, setDisplayToOriginalMap] = useState({});
  const [questionHistory, setQuestionHistory] = useState([]);
  const [showOriginal, setShowOriginal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0, total: 0 });
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [qData, pData] = await Promise.all([
          api.fetchQuestions(),
          api.fetchProgress()
        ]);
        setQuestions(qData.questions);
        setProgress(pData);
        if (qData.questions.length > 0) {
          setCurrentQuestion(qData.questions[0]);
          setupChoices(qData.questions[0], pData.settings.shuffleChoices);
          setSessionStats({ correct: 0, incorrect: 0, total: qData.questions.length });
        }
      } catch (error) {
        console.error('Failed to load data', error);
      }
    }
    loadData();
  }, []);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const parsedQuestions = results.data.map((row, idx) => {
          const choices = [];
          ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach(lbl => {
            const key = `選択肢${lbl}`;
            if (row[key]) {
              choices.push({ label: lbl, text: row[key] });
            }
          });

          return {
            id: `Import-${Date.now()}-${idx}`,
            question: row['問題文'] || row['Question'] || row['問題'],
            answer: row['正解'] || row['Answer'],
            original: row['解説(原文)'] || row['Original'] || '',
            choices
          };
        }).filter(q => q.question && q.answer && q.choices.length > 0);

        if (parsedQuestions.length > 0) {
          localStorage.removeItem('flashcard_custom_questions_v1');
          api.saveCustomQuestions(parsedQuestions);
          const qData = await api.fetchQuestions();
          setQuestions(qData.questions);
          
          if (qData.questions.length > 0) {
            const firstQ = qData.questions[0];
            setCurrentQuestion(firstQ);
            setupChoices(firstQ, progress.settings.shuffleChoices);
            setSessionStats({ correct: 0, incorrect: 0, total: qData.questions.length });
            setShowResults(false);
          }
          
          const resetData = await api.resetProgress();
          setProgress(resetData);
          
          setShowSettings(false);
          alert(`${parsedQuestions.length}件の問題をインポートしました！`);
        } else {
          alert('有効な問題データが見つかりませんでした。');
        }
        setUploading(false);
      },
      error: (error) => {
        console.error('CSV Parse Error:', error);
        alert('CSVの読み込みに失敗しました。');
        setUploading(false);
      }
    });
    event.target.value = '';
  };

  const handleReset = async () => {
    if (confirm('すべての回答進捗とマークをリセットしますか？')) {
      const resetData = await api.resetProgress();
      setProgress(resetData);
      setSessionStats(prev => ({ ...prev, correct: 0, incorrect: 0 }));
      alert('リセットしました！');
    }
  };

  const handleResetToDefault = async () => {
    if (confirm('データを完全に消去してサンプルに戻しますか？')) {
      const res = await api.clearCustomQuestions();
      setQuestions(res.questions);
      setProgress(res.progress);
      setQuestionHistory([]);
      setSessionStats({ correct: 0, incorrect: 0, total: res.questions.length });
      setCurrentQuestion(res.questions[0]);
      setupChoices(res.questions[0], res.progress.settings.shuffleChoices);
      setSelectedChoices([]);
      setIsAnswered(false);
      setIsCorrect(null);
      setShowOriginal(false);
      setShowResults(false);
      setShowSettings(false);
      alert('初期状態にリセットしました！');
    }
  };

  const setupChoices = (question, shuffle) => {
    if (!question || !question.choices) return;
    let choices = [...question.choices];
    if (shuffle) {
      choices = choices.sort(() => Math.random() - 0.5);
    }
    const map = {};
    const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    choices.forEach((c, idx) => {
      map[labels[idx]] = c;
    });
    setDisplayToOriginalMap(map);
  };

  const handleSelectChoice = (label) => {
    if (isAnswered) return;
    const answer = currentQuestion.answer;
    const isMultiple = answer.includes(',') || answer.length > 1;

    if (isMultiple) {
      setSelectedChoices(prev => 
        prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
      );
    } else {
      setSelectedChoices([label]);
    }
  };

  const handleSubmit = async () => {
    if (selectedChoices.length === 0) return;
    
    setIsAnswered(true);
    const correctAnswers = currentQuestion.answer.includes(',') ? 
      currentQuestion.answer.split(',').map(a => a.trim()) : 
      currentQuestion.answer.split('').filter(a => a.trim() !== '');

    const userOriginalAnswers = selectedChoices.map(label => displayToOriginalMap[label].label).sort();
    const sortedCorrect = [...correctAnswers].sort();
    
    const correct = JSON.stringify(userOriginalAnswers) === JSON.stringify(sortedCorrect);
    setIsCorrect(correct);

    setSessionStats(prev => ({
      ...prev,
      correct: prev.correct + (correct ? 1 : 0),
      incorrect: prev.incorrect + (correct ? 0 : 1)
    }));

    const newProgress = await api.recordAnswer(currentQuestion.id, correct);
    if (newProgress && newProgress.stats) {
      setProgress(prev => ({
        ...prev,
        stats: newProgress.stats,
        answeredQuestions: {
          ...prev.answeredQuestions,
          [currentQuestion.id]: {
             correct: (prev.answeredQuestions[currentQuestion.id]?.correct || 0) + (correct ? 1 : 0),
             incorrect: (prev.answeredQuestions[currentQuestion.id]?.incorrect || 0) + (correct ? 0 : 1)
          }
        }
      }));
    }
  };

  const handleNext = () => {
    const currentIndex = questions.findIndex(q => q.id === currentQuestion.id);
    if (currentIndex === questions.length - 1) {
      setShowResults(true);
      return;
    }

    setQuestionHistory([...questionHistory, currentQuestion]);
    const nextQ = questions[currentIndex + 1];
    setCurrentQuestion(nextQ);
    setupChoices(nextQ, progress.settings.shuffleChoices);
    setSelectedChoices([]);
    setIsAnswered(false);
    setIsCorrect(null);
    setShowOriginal(false);
  };

  const handlePrev = () => {
    if (questionHistory.length === 0) return;
    const prevQ = questionHistory[questionHistory.length - 1];
    setQuestionHistory(questionHistory.slice(0, -1));
    setCurrentQuestion(prevQ);
    setupChoices(prevQ, progress?.settings?.shuffleChoices);
    setSelectedChoices([]);
    setIsAnswered(false);
    setIsCorrect(null);
    setShowOriginal(false);
  };

  const restartSession = () => {
    setQuestionHistory([]);
    setCurrentQuestion(questions[0]);
    setupChoices(questions[0], progress.settings.shuffleChoices);
    setSelectedChoices([]);
    setIsAnswered(false);
    setIsCorrect(null);
    setShowOriginal(false);
    setShowResults(false);
    setSessionStats(prev => ({ ...prev, correct: 0, incorrect: 0 }));
  };

  const toggleMark = async () => {
    const res = await api.toggleMark(currentQuestion.id);
    setProgress(prev => ({
      ...prev,
      markedQuestions: res.isMarked ? 
        [...prev.markedQuestions, currentQuestion.id] : 
        prev.markedQuestions.filter(id => id !== currentQuestion.id)
    }));
  };

  if (!progress) {
    return <div className="loading">読み込み中...</div>;
  }

  const isMarked = progress.markedQuestions.includes(currentQuestion?.id);
  const currentIndex = questions.findIndex(q => q.id === currentQuestion?.id);
  const isLastQuestion = currentIndex === questions.length - 1;

  return (
    <div className="app-container">
      <header className="header">
        <h1>なんでも覚える君</h1>
        <div className="stats" style={{ display: showResults ? 'none' : 'flex' }}>
          <span className="stat-item">
            <span className="stat-label">進捗:</span>
            <span>{progress.stats.totalAnswered}</span>/
            <span>{questions.length}</span>
          </span>
          <span className="stat-item">
            <span className="stat-label">正解率:</span>
            <span>
              {progress.stats.totalAnswered > 0 
                ? Math.round((progress.stats.correctCount / progress.stats.totalAnswered) * 100) 
                : 0}%
            </span>
          </span>
          <button className="settings-toggle" onClick={() => setShowSettings(true)}>⚙️ 設定</button>
        </div>
      </header>

      <div className={`settings-overlay ${showSettings ? 'open' : ''}`} onClick={() => setShowSettings(false)}></div>
      <aside className={`settings-panel ${showSettings ? 'open' : ''}`}>
        <div className="settings-content">
          <div className="settings-header">
            <h2>設定 / データ管理</h2>
            <button className="close-btn" onClick={() => setShowSettings(false)}>&times;</button>
          </div>
          <div className="settings-section">
            <h3>データのインポート</h3>
            <label className="control-btn secondary" style={{ display: 'block', cursor: 'pointer', textAlign: 'center' }}>
              {uploading ? 'インポート中...' : 'CSVファイルを選択'}
              <input type="file" accept=".csv" onChange={handleFileUpload} disabled={uploading} style={{ display: 'none' }} />
            </label>
          </div>
          <div className="settings-section">
            <h3>学習記録のリセット</h3>
            <button className="control-btn secondary" style={{ width: '100%', marginBottom: '0.8rem' }} onClick={handleReset}>進捗のみリセット</button>
            <button className="control-btn danger" style={{ width: '100%' }} onClick={handleResetToDefault}>初期サンプルに戻す</button>
          </div>
        </div>
      </aside>

      {questions.length === 0 ? (
        <main className="main-content" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <h2>問題がありません</h2>
          <button className="control-btn primary" onClick={() => setShowSettings(true)}>設定を開く</button>
        </main>
      ) : showResults ? (
        <main className="main-content">
          <div className="question-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>学習完了！</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>お疲れ様でした！今回の結果です。</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>正解</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--accent-success)' }}>{sessionStats.correct}</div>
              </div>
              <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>不正解</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--accent-danger)' }}>{sessionStats.incorrect}</div>
              </div>
              <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '12px', gridColumn: 'span 2' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>正答率</div>
                <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--accent-primary)' }}>
                  {Math.round((sessionStats.correct / (sessionStats.correct + sessionStats.incorrect)) * 100) || 0}%
                </div>
              </div>
            </div>

            <button className="control-btn primary" style={{ width: '100%' }} onClick={restartSession}>もう一度解く</button>
          </div>
        </main>
      ) : (
      <main className="main-content">
        {currentQuestion && (
          <div className={`question-card ${isMarked ? 'marked' : ''}`}>
            <div className="question-header">
              <span className="question-number">問題 {currentIndex + 1} / {questions.length}</span>
              <button className={`mark-btn ${isMarked ? 'active' : ''}`} onClick={toggleMark} title="マークする">★</button>
            </div>
            <div className="question-text">{currentQuestion.question}</div>
            <div className="choices">
              {Object.keys(displayToOriginalMap).map((displayLabel) => {
                const choiceInfo = displayToOriginalMap[displayLabel];
                const originalLabel = choiceInfo.label;
                let extraClass = '';
                if (isAnswered) {
                  const correctAnswers = currentQuestion.answer.includes(',') ? currentQuestion.answer.split(',').map(a => a.trim()) : [currentQuestion.answer.trim()];
                  if (correctAnswers.includes(originalLabel)) extraClass = 'correct';
                  else if (selectedChoices.includes(displayLabel)) extraClass = 'incorrect';
                  extraClass += ' disabled';
                } else if (selectedChoices.includes(displayLabel)) {
                  extraClass = 'selected';
                }
                return (
                  <div key={displayLabel} className={`choice-item ${extraClass}`} onClick={() => handleSelectChoice(displayLabel)}>
                    <span className="choice-label">{displayLabel}</span>
                    <span className="choice-text">{choiceInfo.text}</span>
                  </div>
                );
              })}
            </div>
            <div className={`answer-section ${!isAnswered ? 'hidden' : ''}`}>
              <div className={`answer-result ${isCorrect ? 'correct' : 'incorrect'}`}>
                {isCorrect ? '〇 正解！' : '× 不正解'}
              </div>
              <div className="correct-answer">正解: {currentQuestion.answer}</div>
              <button className="show-original-btn" onClick={() => setShowOriginal(!showOriginal)}>原文を表示</button>
              <div className={`original-text ${!showOriginal ? 'hidden' : ''}`}>{currentQuestion.original || '原文なし'}</div>
            </div>
          </div>
        )}
        <div className="controls">
          <button className="control-btn secondary" onClick={handlePrev} disabled={questionHistory.length === 0}>&larr; 前へ</button>
          {!isAnswered ? (
            <button className="control-btn primary" onClick={handleSubmit}>回答する</button>
          ) : (
            <button className="control-btn primary" onClick={handleNext}>{isLastQuestion ? '結果を見る' : '次へ'} &rarr;</button>
          )}
        </div>
      </main>
      )}
    </div>
  );
}

export default App;

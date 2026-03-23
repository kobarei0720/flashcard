import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import * as api from './js/api.js';

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
            question: row['問題文'],
            answer: row['正解'],
            original: row['解説(原文)'] || '',
            choices
          };
        }).filter(q => q.question && q.answer && q.choices.length > 0);

        if (parsedQuestions.length > 0) {
          api.saveCustomQuestions(parsedQuestions);
          const qData = await api.fetchQuestions();
          setQuestions(qData.questions);
          alert(`${parsedQuestions.length}件のカスタム問題をインポートしました！`);
        } else {
          alert('有効な問題データが見つかりませんでした。テンプレートの列名と合致しているか確認してください。');
        }
      },
      error: (error) => {
        console.error('CSV Parse Error:', error);
        alert('CSVの読み込みに失敗しました。');
      }
    });
    event.target.value = '';
  };

  const handleReset = async () => {
    if (confirm('すべての学習進捗をリセットしますか？この操作は取り消せません。')) {
      const resetData = await api.resetProgress();
      setProgress(resetData);
      alert('進捗をリセットしました！');
    }
  };

  const setupChoices = (question, shuffle) => {
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
    const isMultiple = answer.includes(',');

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
    setQuestionHistory([...questionHistory, currentQuestion]);
    const nextQ = questions[Math.floor(Math.random() * questions.length)];
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
    return <div>読み込み中...</div>;
  }

  const isMarked = progress.markedQuestions.includes(currentQuestion?.id);

  return (
    <div className="app-container">
      <header className="header">
        <h1>なんでも覚える君</h1>
        <div className="stats">
          <span className="stat-item">
            <span className="stat-label">進捗:</span>
            <span id="progress-count" data-testid="progress-count">{progress.stats.totalAnswered}</span>/
            <span id="total-count">{questions.length}</span>
          </span>
          <span className="stat-item">
            <span className="stat-label">正解率:</span>
            <span id="accuracy">
              {progress.stats.totalAnswered > 0 
                ? Math.round((progress.stats.correctCount / progress.stats.totalAnswered) * 100) 
                : 0}%
            </span>
          </span>
          <span className="stat-item marked">
            <span className="stat-label">マーク:</span>
            <span id="marked-count">{progress.markedQuestions.length}</span>
          </span>
          <button 
            className="settings-toggle" 
            style={{ 
              marginLeft: 'auto', 
              padding: '0.3rem 0.8rem', 
              fontSize: '0.85rem', 
              background: 'var(--glass-bg)', 
              color: 'var(--text-primary)', 
              border: '1px solid var(--glass-border)', 
              borderRadius: '8px',
              cursor: 'pointer'
            }} 
            onClick={() => setShowSettings(true)}
          >
            設定
          </button>
        </div>
      </header>

      {/* 設定サイドバー */}
      <div className={`settings-panel ${showSettings ? 'visible' : 'hidden'}`} id="settings-panel" style={{ zIndex: 1000 }}>
        <div className="settings-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'transparent', zIndex: -1 }} onClick={() => setShowSettings(false)}></div>
        <div className="settings-content" style={{ position: 'relative', zIndex: 1 }}>
          <div className="settings-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>設定 / データ管理</h2>
            <button className="close-btn" style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '2rem', cursor: 'pointer', padding: '0 0.5rem', lineHeight: '1' }} onClick={() => setShowSettings(false)}>&times;</button>
          </div>
          <div className="settings-section">
            <h3>データのインポート</h3>
            <p className="setting-description">CSVファイルから独自の問題を追加できます。（オフライン環境に保存されます）</p>
            <label className="control-btn secondary file-upload-label" style={{ display: 'inline-block', cursor: 'pointer', textAlign: 'center', marginBottom: '0.5rem' }}>
              CSVファイルを選択
              <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
            <a href="#" onClick={(e) => {
              e.preventDefault();
              const templateContent = '問題文,正解,解説(原文),選択肢A,選択肢B,選択肢C,選択肢D,選択肢E,選択肢F,選択肢G,選択肢H\n問題例,A,解説の例,選択肢Aの内容,選択肢Bの内容,,,,,,';
              const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = 'import_template.csv';
              link.click();
              URL.revokeObjectURL(url);
            }} style={{color: 'var(--accent-primary)', fontSize: '0.9rem', display: 'block', marginTop: '0.5rem', textDecoration: 'underline'}}>テンプレート（CSV）をダウンロード</a>
          </div>
          {questions.length > 0 && (
            <div className="settings-section">
              <h3>学習記録のリセット</h3>
              <p className="setting-description">正解率や問題の履歴などを初期化します。</p>
              <button className="control-btn danger" onClick={handleReset}>進捗をリセット</button>
            </div>
          )}
        </div>
      </div>

      {questions.length === 0 ? (
        <main className="main-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '4rem 1rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>問題がインポートされていません</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            右上の「設定」から自作のCSVファイルをインポートして、学習を始めましょう。
          </p>
          <button className="control-btn primary" onClick={() => setShowSettings(true)}>
            設定を開く
          </button>
        </main>
      ) : (
      <main className="main-content">
        {currentQuestion && (
          <div className={`question-card ${isMarked ? 'marked' : ''}`} id="question-card">
            <div className="question-header">
              <span className="question-number">問題 {currentQuestion.id}</span>
              <button 
                className={`mark-btn ${isMarked ? 'active' : ''}`} 
                id="mark-btn" 
                onClick={toggleMark} 
                title="マークする">
                <span className="mark-icon">★</span>
              </button>
            </div>
            
            <div className="question-text" id="question-text">
              {currentQuestion.question}
            </div>
            
            <div className="choices" id="choices">
              {Object.keys(displayToOriginalMap).map((displayLabel) => {
                const choiceInfo = displayToOriginalMap[displayLabel];
                const originalLabel = choiceInfo.label;
                const correctAnswers = currentQuestion.answer.includes(',') ? 
                  currentQuestion.answer.split(',').map(a => a.trim()) : 
                  currentQuestion.answer.split('').filter(a => a.trim() !== '');
                
                let extraClass = '';
                if (isAnswered) {
                  const isCorrectAnswer = correctAnswers.includes(originalLabel);
                  const isSelected = selectedChoices.includes(displayLabel);
                  
                  if (isCorrectAnswer) extraClass = 'correct';
                  else if (isSelected) extraClass = 'incorrect';
                  
                  extraClass += ' disabled';
                } else {
                  if (selectedChoices.includes(displayLabel)) {
                    extraClass = 'selected';
                  }
                }

                return (
                  <div 
                    key={displayLabel} 
                    className={`choice-item ${extraClass}`}
                    onClick={() => handleSelectChoice(displayLabel)}
                  >
                    <span className="choice-label">{displayLabel}</span>
                    <span className="choice-text">{choiceInfo.text}</span>
                  </div>
                );
              })}
            </div>
            
            <div className={`answer-section ${!isAnswered ? 'hidden' : ''}`}>
              <div className={`answer-result ${isCorrect ? 'correct' : 'incorrect'}`}>
                {isCorrect ? <>〇 正解！</> : <>× 不正解</>}
              </div>
              <div className="correct-answer">
                 正解: {currentQuestion.answer}
              </div>
              <button className="show-original-btn" onClick={() => setShowOriginal(!showOriginal)}>
                原文を表示
              </button>
              <div className={`original-text ${!showOriginal ? 'hidden' : ''}`}>
                {currentQuestion.original || '原文データがありません'}
              </div>
            </div>
          </div>
        )}

        <div className="controls">
          <button 
            className="control-btn secondary" 
            onClick={handlePrev}
            disabled={questionHistory.length === 0}
          >
            &larr; 前の問題
          </button>
          {!isAnswered ? (
            <button className="control-btn primary" onClick={handleSubmit}>
              回答する
            </button>
          ) : (
            <button className="control-btn primary" onClick={handleNext}>
              次の問題 &rarr;
            </button>
          )}
        </div>
      </main>
      )}
    </div>
  );
}

export default App;

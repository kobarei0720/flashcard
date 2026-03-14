import React, { useState, useEffect } from 'react';
import * as api from './api.js';

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

  useEffect(() => {
    const loadData = async () => {
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
    };
    loadData();
  }, []);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!window.confirm('現在のすべての進捗データがリセットされます。インポートしてよろしいですか？')) {
      event.target.value = '';
      return;
    }

    setUploading(true);
    try {
      await api.uploadQuestions(file);
      await api.resetProgress();
      alert('インポート成功しました！ページを再読み込みします。');
      window.location.reload();
    } catch (e) {
      alert(`インポートに失敗しました: ${e.message}`);
    } finally {
      setUploading(false);
      event.target.value = '';
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

  if (!questions.length || !progress) {
    return <div>読み込み中...</div>;
  }

  const isMarked = progress.markedQuestions.includes(currentQuestion?.id);

  return (
    <div className="app-container">
      <header className="header">
        <h1>🎯 AWS SAP-C02 フラッシュカード</h1>
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
          <button className="settings-toggle" onClick={() => setShowSettings(!showSettings)}>
            ⚙️ 設定
          </button>
        </div>
      </header>

      <aside className={`settings-panel ${showSettings ? 'open' : 'hidden'}`}>
        <div className="settings-content">
          <h3>インポート</h3>
          <p style={{fontSize: '0.9em', color: '#666', marginBottom: '10px'}}>
             CSVフォーマット:<br/>問題文, 正解, 解説, 選択肢A, 選択肢B, 選択肢C...<br/>
             (※1行目に「問題」等の文字があればヘッダーとしてスキップします)
          </p>
          <div className="setting-item">
            <input 
              type="file" 
              accept=".csv,.json" 
              onChange={handleFileUpload}
              disabled={uploading}
              id="file-upload"
              style={{display: 'none'}}
            />
            <label htmlFor="file-upload" className="control-btn secondary" style={{display: 'inline-block', textAlign: 'center', cursor: 'pointer', width: '100%'}}>
              {uploading ? 'アップロード中...' : 'アップロード'}
            </label>
          </div>
        </div>
      </aside>

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
                <span className="mark-icon">⭐</span>
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
                {isCorrect ? '🎉 正解！' : '❌ 不正解'}
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
            ← 前の問題
          </button>
          {!isAnswered ? (
            <button className="control-btn primary" onClick={handleSubmit}>
              回答する
            </button>
          ) : (
            <button className="control-btn primary" onClick={handleNext}>
              次の問題 →
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;

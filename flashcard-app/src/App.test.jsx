import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import App from './App.jsx';
import * as api from './apiClient.js';

// Mock the API module
vi.mock('./apiClient.js', () => ({
  fetchQuestions: vi.fn(),
  fetchProgress: vi.fn(),
  toggleMark: vi.fn(),
  recordAnswer: vi.fn(),
  updateSettings: vi.fn(),
  setFilter: vi.fn(),
  resetProgress: vi.fn(),
  fetchQuestionById: vi.fn(),
}));

describe('FlashcardApp Component', () => {
  const mockQuestions = {
    questions: [
      {
        id: 1,
        question: '問題1のテキスト',
        choices: [
          { label: 'A', text: '選択肢A' },
          { label: 'B', text: '選択肢B' },
        ],
        answer: 'A',
      },
      {
        id: 2,
        question: '問題2のテキスト',
        choices: [
          { label: 'A', text: '選択肢A' },
          { label: 'B', text: '選択肢B' },
        ],
        answer: 'B',
      },
    ],
    totalCount: 2,
  };

  const mockProgress = {
    markedQuestions: [],
    answeredQuestions: {},
    currentFilter: 'all',
    settings: {
      prioritizeMarked: false,
      shuffleChoices: false,
      markedFrequency: 3,
    },
    stats: {
      totalAnswered: 0,
      correctCount: 0,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.fetchQuestions.mockResolvedValue(mockQuestions);
    api.fetchProgress.mockResolvedValue(mockProgress);
  });

  it('renders loading state initially', () => {
    render(<App />);
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  it('loads data and displays the first question', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('問題1のテキスト')).toBeInTheDocument();
    });

    expect(screen.getByText('選択肢A')).toBeInTheDocument();
    expect(screen.getByText('選択肢B')).toBeInTheDocument();
  });

  it('allows user to select an answer and submit', async () => {
    api.recordAnswer.mockResolvedValue({
      stats: { totalAnswered: 1, correctCount: 1 },
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('問題1のテキスト')).toBeInTheDocument();
    });

    // Select correct answer
    const choiceA = screen.getByText('A'); // Choice label
    fireEvent.click(choiceA);

    // Submit answer
    const submitBtn = screen.getByText('回答する');
    fireEvent.click(submitBtn);

    // Expect correct result message
    await waitFor(() => {
      expect(screen.getByText(/正解！/)).toBeInTheDocument();
    });

    // Expect stats to update
    const progressCount = await screen.findByTestId('progress-count');
    expect(progressCount).toHaveTextContent('1');
  });
});

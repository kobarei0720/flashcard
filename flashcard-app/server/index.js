import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import questionsRouter from './routes/questions.js';
import progressRouter from './routes/progress.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// ミドルウェア
app.use(cors());
app.use(express.json());

// APIルート
app.use('/api/questions', questionsRouter);
app.use('/api/progress', progressRouter);

// 本番環境: Viteビルド成果物を配信
if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, '..', 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });
}

app.listen(PORT, () => {
    console.log(`🚀 APIサーバー起動: http://localhost:${PORT}`);
    console.log(`📡 エンドポイント: http://localhost:${PORT}/api/questions`);
});

export default app;

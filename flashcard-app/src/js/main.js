/**
 * AWS SAP-C02 フラッシュカード - エントリーポイント
 */

import { FlashcardApp } from './app.js';

// アプリケーションを起動
document.addEventListener('DOMContentLoaded', () => {
    const app = new FlashcardApp();
    app.init();
});

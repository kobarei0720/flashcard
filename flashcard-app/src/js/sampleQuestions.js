/**
 * サンプル問題データ
 * 初回起動時にデフォルトで表示される問題集です。
 * ユーザーがCSVをインポートすると、この問題に追加（または置換）されます。
 */

const sampleQuestions = [
  {
    id: "sample-1",
    question: "日本の首都はどこですか？",
    answer: "A",
    original: "これはサンプル問題です。設定メニューからCSVファイルをインポートして、自分だけの問題集を作成できます。",
    choices: [
      { label: "A", text: "東京" },
      { label: "B", text: "京都" },
      { label: "C", text: "大阪" },
      { label: "D", text: "名古屋" }
    ]
  },
  {
    id: "sample-2",
    question: "太陽系で最も大きい惑星はどれですか？",
    answer: "C",
    original: "木星は太陽系最大の惑星で、地球の約11倍の直径を持ちます。",
    choices: [
      { label: "A", text: "地球" },
      { label: "B", text: "土星" },
      { label: "C", text: "木星" },
      { label: "D", text: "海王星" }
    ]
  },
  {
    id: "sample-3",
    question: "水の化学式はどのように表記されますか？",
    answer: "B",
    original: "水（H₂O）は、水素原子2個と酸素原子1個から構成されています。",
    choices: [
      { label: "A", text: "CO₂" },
      { label: "B", text: "H₂O" },
      { label: "C", text: "NaCl" },
      { label: "D", text: "O₂" }
    ]
  },
  {
    id: "sample-4",
    question: "「I have a pen.」を日本語に訳すとどれが正しいですか？",
    answer: "A",
    original: "英語の基本的な文型「S + V + O（主語 + 動詞 + 目的語）」の例文です。",
    choices: [
      { label: "A", text: "私はペンを持っています。" },
      { label: "B", text: "私はペンが欲しいです。" },
      { label: "C", text: "これはペンです。" },
      { label: "D", text: "ペンを貸してください。" }
    ]
  },
  {
    id: "sample-5",
    question: "次のうち、哺乳類はどれですか？（2つ選択）",
    answer: "A,C",
    original: "哺乳類は、体が毛で覆われ、母乳で子を育てる動物のグループです。イルカは水中に住んでいますが哺乳類です。",
    choices: [
      { label: "A", text: "イルカ" },
      { label: "B", text: "ワニ" },
      { label: "C", text: "コウモリ" },
      { label: "D", text: "ペンギン" }
    ]
  }
];

export default sampleQuestions;

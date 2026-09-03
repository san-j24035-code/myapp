import { useEffect, useState } from 'react';

const recipeBook = [
  { keys: ['豚', 'キャベツ'], title: '豚肉とキャベツのスタミナ炒め', time: '15分', emoji: '🥘', description: 'にんにく香る甘辛だれで、ごはんが進む定番おかずです。', steps: ['キャベツはざく切り、豚肉は食べやすい大きさにします。', 'フライパンで豚肉を炒め、色が変わったらキャベツを加えます。', 'しょうゆ・みりん・にんにくで味を整えて完成です。'] },
  { keys: ['鶏', 'トマト'], title: '鶏肉とトマトのさっぱり煮', time: '20分', emoji: '🍅', description: 'トマトのうま味を生かした、軽やかな主菜です。', steps: ['鶏肉に塩こしょうを振り、こんがり焼きます。', 'くし形に切ったトマトと玉ねぎを加えます。', 'ふたをして8分ほど煮込み、塩で味を調えます。'] },
  { keys: ['鮭', 'きのこ'], title: '鮭ときのこのバター醤油ソテー', time: '15分', emoji: '🐟', description: '香ばしいバター醤油で、秋らしい味わいに仕上げます。', steps: ['鮭の水気を拭き、小麦粉を薄くまぶします。', 'バターで鮭を両面焼き、きのこを加えます。', 'しょうゆを回しかけ、レモンを添えます。'] },
  { keys: ['卵'], title: 'ふわふわ卵の中華あんかけ丼', time: '10分', emoji: '🍳', description: '冷蔵庫にある野菜でさっと作れる、やさしい一皿です。', steps: ['お好みの野菜を炒め、鶏がらスープを加えます。', '水溶き片栗粉でとろみをつけます。', '半熟に焼いた卵とごはんに、あんをかけます。'] },
];

const fallbackRecipe = { title: '冷蔵庫の食材で作る彩りワンプレート', time: '20分', emoji: '🍽️', description: 'いただいた食材を生かして、バランスよく仕上げるアレンジです。', steps: ['食材を火の通りにくい順に切り分けます。', 'フライパンで炒め、塩・こしょうで下味をつけます。', 'お好みの調味料で整え、主食と一緒に盛りつけます。'] };
const DEFAULT_SHEET_URL = 'https://script.google.com/macros/s/AKfycbzVDpn21dq7gziYnU4PZQGR5JiBix46_QRnVfmKrl2Z5aUWTuJuop3pAEuRCW6Oy0v4qA/exec';

const getHistory = () => {
  try { return JSON.parse(localStorage.getItem('kondate-history') || '[]'); } catch { return []; }
};

function App() {
  const [ingredients, setIngredients] = useState('豚肉、キャベツ、卵');
  const [meal, setMeal] = useState('夕食');
  const [minutes, setMinutes] = useState('15分以内');
  const [suggestion, setSuggestion] = useState(null);
  const [history, setHistory] = useState(getHistory);
  const [sheetUrl, setSheetUrl] = useState(() => localStorage.getItem('google-sheet-webhook') || DEFAULT_SHEET_URL);
  const [showSettings, setShowSettings] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => localStorage.setItem('kondate-history', JSON.stringify(history)), [history]);
  useEffect(() => localStorage.setItem('google-sheet-webhook', sheetUrl), [sheetUrl]);

  const sendToSheet = async (item) => {
    if (!sheetUrl) {
      setSaveMessage('スプレッドシート連携URLを設定すると、提案のたびに自動記録されます。');
      return;
    }
    setSaveMessage('スプレッドシートへ自動記録中…');
    const payload = { date: new Date().toISOString(), dish: item.title, ingredients: item.ingredients, meal: item.meal, cookingTime: item.time, requestedTime: item.minutes, steps: item.steps.join('\n') };
    try {
      await fetch(sheetUrl, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
      setSaveMessage('この提案はスプレッドシートに自動記録されました。');
    } catch { setSaveMessage('自動記録できませんでした。連携URLをご確認ください。'); }
  };

  const createSuggestion = () => {
    const recipe = recipeBook.find((item) => item.keys.every((key) => ingredients.includes(key)))
      || recipeBook.find((item) => item.keys.some((key) => ingredients.includes(key)))
      || fallbackRecipe;
    const item = { ...recipe, id: Date.now(), ingredients, meal, minutes, createdAt: new Date().toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }) };
    setSuggestion(item);
    setHistory((previous) => [item, ...previous.filter((entry) => entry.title !== item.title)].slice(0, 6));
    sendToSheet(item);
  };

  return <div className="app-shell">
    <header className="topbar"><div className="brand"><span className="pot">♨</span><span>AKI MENU</span></div><button className="settings-button" onClick={() => setShowSettings(!showSettings)}>⚙ 連携設定</button></header>
    {showSettings && <section className="settings-panel"><div><strong>Googleスプレッドシート連携</strong><p>Google Apps Scriptで公開したWebアプリのURLを入力してください。</p></div><input value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} placeholder="https://script.google.com/macros/s/.../exec" /><a href="#guide">設定方法を見る →</a></section>}
    <main>
      <section className="intro"><span className="eyebrow">今日のごはん、もう迷わない</span><h1>冷蔵庫の食材から<br /><em>おいしい一皿</em>を提案します。</h1><p>食材と気分を入力するだけ。AIが今日にぴったりの献立を考えます。</p></section>
      <section className="input-card"><div className="card-heading"><span className="heading-number">01</span><div><span className="section-kicker">WHAT'S IN YOUR KITCHEN?</span><h2>食材を教えてください</h2></div></div><label>使いたい食材 <span>（カンマ区切りで入力）</span><div className="ingredient-input"><span>🥬</span><input value={ingredients} onChange={(e) => setIngredients(e.target.value)} placeholder="例：豚肉、キャベツ、卵" /></div></label><div className="choice-row"><div><label>いつ食べる？</label><div className="pills">{['朝食', '昼食', '夕食'].map((value) => <button key={value} className={meal === value ? 'selected' : ''} onClick={() => setMeal(value)}>{value}</button>)}</div></div><div><label>調理時間</label><select value={minutes} onChange={(e) => setMinutes(e.target.value)}><option>10分以内</option><option>15分以内</option><option>30分以内</option><option>時間はある</option></select></div></div><button className="suggest-button" onClick={createSuggestion}><span>✦</span> AIに献立を考えてもらう</button></section>
      <section className="result-section"><div className="result-label"><span>02</span><div><span className="section-kicker">AI'S SUGGESTION</span><h2>AIの献立提案</h2></div></div>{suggestion ? <article className="recipe-card"><div className="recipe-visual"><span>{suggestion.emoji}</span><small>{suggestion.time}で完成</small></div><div className="recipe-content"><div className="recipe-title"><div><p>今日の{suggestion.meal}におすすめ</p><h3>{suggestion.title}</h3></div><span className="time-pill">⏱ {suggestion.time}</span></div><p className="description">{suggestion.description}</p><div className="used-ingredients">使用食材：{suggestion.ingredients}</div><ol>{suggestion.steps.map((step, i) => <li key={i}>{step}</li>)}</ol>{saveMessage && <p className="save-message">{saveMessage}</p>}</div></article> : <div className="empty-state"><div>🍲</div><p>食材を入力して、献立を提案してもらいましょう</p></div>}</section>
      {history.length > 0 && <section className="history-section"><div className="history-heading"><div><span className="section-kicker">RECENTLY SUGGESTED</span><h2>最近の提案</h2></div><span>保存件数 {history.length}</span></div><div className="history-grid">{history.map((item) => <button className="history-card" onClick={() => setSuggestion(item)} key={item.id}><span>{item.emoji}</span><div><small>{item.createdAt}・{item.meal}</small><strong>{item.title}</strong></div><i>›</i></button>)}</div></section>}
      <section id="guide" className="guide"><h2>Googleスプレッドシートの設定</h2><p>スプレッドシートで「拡張機能 → Apps Script」を開き、POSTデータをシートへ追記するスクリプトをWebアプリとしてデプロイします。発行された <code>/exec</code> URLを上部の「連携設定」に貼り付けると、提案をワンタップで記録できます。</p></section>
    </main><footer>AKI MENU — 毎日の「何作ろう？」を、少し楽しく。</footer>
  </div>;
}

export default App;

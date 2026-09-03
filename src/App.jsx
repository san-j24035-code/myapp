import { useEffect, useRef, useState } from 'react';

const DEFAULT_SHEET_URL = 'https://script.google.com/macros/s/AKfycbzVDpn21dq7gziYnU4PZQGR5JiBix46_QRnVfmKrl2Z5aUWTuJuop3pAEuRCW6Oy0v4qA/exec';

const recipes = [
  { keys: ['豚', 'キャベツ'], title: '豚肉とキャベツのスタミナ炒め', emoji: '🥘', time: '15分', description: 'にんにく香る甘辛だれで、ごはんが進む定番おかず。', steps: ['材料を食べやすい大きさに切る', '豚肉を炒め、キャベツを加える', '調味料を加えてさっと炒める'] },
  { keys: ['鶏', 'トマト'], title: '鶏肉とトマトのさっぱり煮', emoji: '🍅', time: '20分', description: 'トマトのうま味を生かした、軽やかな主菜です。', steps: ['鶏肉に塩こしょうをふる', '鶏肉と野菜を焼く', 'トマトを加え、ふたをして煮込む'] },
  { keys: ['鮭'], title: '鮭のバター醤油ソテー', emoji: '🐟', time: '15分', description: '香ばしいバター醤油で、手軽にごちそう感。', steps: ['鮭の水気を拭き、塩をふる', 'バターで両面をこんがり焼く', 'しょうゆを回しかけて完成'] },
  { keys: ['卵'], title: 'ふわふわ卵の中華あんかけ丼', emoji: '🍳', time: '10分', description: '冷蔵庫にある野菜でさっと作れる一皿です。', steps: ['野菜を炒め、スープを加える', '水溶き片栗粉でとろみをつける', '半熟卵とごはんにあんをかける'] },
];
const fallback = { title: '冷蔵庫食材の彩りワンプレート', emoji: '🍽️', time: '20分', description: 'いただいた食材を生かす、バランスのよいアレンジです。', steps: ['食材を火の通りにくい順に切る', 'フライパンで炒めて下味をつける', 'お好みの調味料で味を整える'] };
const loadHistory = () => { try { return JSON.parse(localStorage.getItem('kondate-history') || '[]'); } catch { return []; } };

function App() {
  const [screen, setScreen] = useState('home');
  const [ingredients, setIngredients] = useState(['豚肉', 'キャベツ', '卵']);
  const [draft, setDraft] = useState('');
  const draftRef = useRef(null);
  const [meal, setMeal] = useState('夕食');
  const [minutes, setMinutes] = useState('10〜15分');
  const [suggestion, setSuggestion] = useState(null);
  const [history, setHistory] = useState(loadHistory);
  const [sheetUrl, setSheetUrl] = useState(() => localStorage.getItem('google-sheet-webhook') || DEFAULT_SHEET_URL);
  const [showSettings, setShowSettings] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => localStorage.setItem('kondate-history', JSON.stringify(history)), [history]);
  useEffect(() => localStorage.setItem('google-sheet-webhook', sheetUrl), [sheetUrl]);
  const addIngredient = () => { const value = draftRef.current?.value.trim() || ''; if (value && !ingredients.includes(value)) setIngredients([...ingredients, value]); if (draftRef.current) draftRef.current.value = ''; setDraft(''); };
  const sendToSheet = async (item) => {
    if (!sheetUrl) { setMessage('スプレッドシートの連携URLを設定してください。'); return; }
    const payload = { date: new Date().toISOString(), dish: item.title, ingredients: item.ingredients.join('、'), meal: item.meal, cookingTime: item.time, requestedTime: item.minutes, steps: item.steps.join('\n') };
    try { await fetch(sheetUrl, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) }); setMessage('スプレッドシートに自動記録しました'); } catch { setMessage('記録できませんでした'); }
  };
  const createSuggestion = () => {
    const joined = ingredients.join(' ');
    const recipe = recipes.find((item) => item.keys.every((key) => joined.includes(key))) || recipes.find((item) => item.keys.some((key) => joined.includes(key))) || fallback;
    const item = { ...recipe, id: Date.now(), ingredients, meal, minutes, createdAt: new Date().toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }) };
    setSuggestion(item); setHistory((prev) => [item, ...prev].slice(0, 12)); setScreen('suggestion'); setMessage(''); sendToSheet(item);
  };
  const nav = (target) => { if (target === 'suggestion' && !suggestion) return; setScreen(target); };

  const Header = ({ title, back }) => <header className="app-header">{back ? <button className="back" onClick={() => setScreen(back)}>‹</button> : <span className="header-space" />}<div className="logo"><b>♨</b> AKI MENU</div><button className="gear" onClick={() => setShowSettings(!showSettings)}>⚙</button></header>;
  const Home = () => <><Header /><div className="home-page"><div className="home-kicker">今日のごはん、もう迷わない</div><h1>おいしい献立を<br />見つけよう。</h1><p>冷蔵庫にある食材から、<br />今日にぴったりの一皿を提案します。</p><button className="big-create" onClick={() => setScreen('input')}><span>🍴</span><strong>献立を作る</strong><small>食材を入力してはじめる</small></button><div className="quick-title">クイック開始</div><div className="quick-grid"><button onClick={() => { setMeal('朝食'); setScreen('input'); }}>☀<span>朝日差し</span></button><button onClick={() => { setMinutes('10分以内'); setScreen('input'); }}>⚡<span>お急ぎ</span></button><button onClick={() => { setScreen('history'); }}>◴<span>履歴を見る</span></button></div></div></>;
  const Input = () => <><Header back="home" /><div className="page input-page"><div className="page-mark">01</div><h2>食材を入力</h2><p className="sub">冷蔵庫にある食材を追加してください</p><div className="add-row"><input ref={draftRef} defaultValue="" onKeyDown={(e) => e.key === 'Enter' && addIngredient()} placeholder="食材を入力" /><button onClick={addIngredient}>＋</button></div><div className="chips">{ingredients.map((item) => <span key={item}>{item}<button onClick={() => setIngredients(ingredients.filter((value) => value !== item))}>×</button></span>)}</div><section className="option"><label>食べる時間</label><div className="toggle">{['朝食', '昼食', '夕食'].map((item) => <button key={item} onClick={() => setMeal(item)} className={meal === item ? 'on' : ''}>{item}</button>)}</div></section><section className="option"><label>調理時間</label><div className="toggle time-toggle">{['10分以内', '10〜15分', '30分以内'].map((item) => <button key={item} onClick={() => setMinutes(item)} className={minutes === item ? 'on' : ''}>{item}</button>)}</div></section><button className="primary-action" disabled={!ingredients.length} onClick={createSuggestion}>✦ AIに献立を考えてもらう</button></div></>;
  const Suggestion = () => <><Header back="input" />{suggestion ? <div className="page suggestion-page"><div className="page-mark">02</div><p className="eyebrow">AI'S SUGGESTION</p><h2>AIの献立提案</h2><div className="dish-visual"><span>{suggestion.emoji}</span></div><span className="meal-badge">今日の{suggestion.meal}</span><h3>{suggestion.title}</h3><p className="dish-desc">{suggestion.description}</p><div className="info-line"><span>⏱ {suggestion.time}</span><span>食材 {suggestion.ingredients.length}品</span></div><div className="steps"><b>作り方</b>{suggestion.steps.map((step, index) => <p key={step}><i>{index + 1}</i>{step}</p>)}</div><p className="saved-message">✓ {message || '献立を作成しました'}</p><button className="secondary-action" onClick={() => setScreen('input')}>別の献立を考える</button></div> : null}</>;
  const History = () => <><Header back="home" /><div className="page history-page"><div className="page-mark">03</div><p className="eyebrow">MY MENU LOG</p><h2>献立の履歴</h2><p className="sub">これまでに提案したメニュー</p>{history.length ? <div className="history-list">{history.map((item) => <button key={item.id} onClick={() => { setSuggestion(item); setScreen('suggestion'); }}><span className="history-emoji">{item.emoji}</span><span><small>{item.createdAt}・{item.meal}</small><strong>{item.title}</strong><em>⏱ {item.time}</em></span><i>›</i></button>)}</div> : <div className="no-history">🍲<br />まだ提案履歴がありません</div>}</div></>;
  return <div className="site"><div className="phone"><div className="speaker" />{showSettings && <div className="settings"><b>Googleスプレッドシート連携</b><input value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} /><small>献立の提案時に自動で記録されます。</small></div>}{screen === 'home' && <Home />}{screen === 'input' && <Input />}{screen === 'suggestion' && <Suggestion />}{screen === 'history' && <History />}<nav>{[['home', '⌂', 'ホーム'], ['input', '✎', '入力'], ['suggestion', '✦', '提案'], ['history', '◴', '履歴']].map(([target, icon, label]) => <button key={target} className={screen === target ? 'active' : ''} onClick={() => nav(target)}><span>{icon}</span>{label}</button>)}</nav></div><aside className="desktop-copy"><span>AKI MENU</span><h2>毎日の献立を、<br />もっと手軽に。</h2><p>食材を入力するだけで、<br />あなたのためのレシピを提案します。</p><div>ホーム → 食材入力 → AI提案 → 履歴</div></aside></div>;
}

export default App;

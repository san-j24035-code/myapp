import { useEffect, useRef, useState } from 'react';

const DEFAULT_SHEET_URL = 'https://script.google.com/macros/s/AKfycbzVDpn21dq7gziYnU4PZQGR5JiBix46_QRnVfmKrl2Z5aUWTuJuop3pAEuRCW6Oy0v4qA/exec';

const recipes = [
  { keys: ['豚', 'キャベツ'], title: '豚肉とキャベツのスタミナ炒め', emoji: '🥘', time: '15分', description: 'にんにく香る甘辛だれで、ごはんが進む定番おかず。', steps: ['材料を食べやすい大きさに切る', '豚肉を炒め、キャベツを加える', '調味料を加えてさっと炒める'] },
  { keys: ['鶏', 'トマト'], title: '鶏肉とトマトのさっぱり煮', emoji: '🍅', time: '20分', description: 'トマトのうま味を生かした、軽やかな主菜です。', steps: ['鶏肉に塩こしょうをふる', '鶏肉と野菜を焼く', 'トマトを加え、ふたをして煮込む'] },
  { keys: ['鮭'], title: '鮭のバター醤油ソテー', emoji: '🐟', time: '15分', description: '香ばしいバター醤油で、手軽にごちそう感。', steps: ['鮭の水気を拭き、塩をふる', 'バターで両面をこんがり焼く', 'しょうゆを回しかけて完成'] },
  { keys: ['卵'], title: 'ふわふわ卵の中華あんかけ丼', emoji: '🍳', time: '10分', description: '冷蔵庫にある野菜でさっと作れる一皿です。', steps: ['野菜を炒め、スープを加える', '水溶き片栗粉でとろみをつける', '半熟卵とごはんにあんをかける'] },
];
const fallback = { title: '冷蔵庫食材の彩りワンプレート', emoji: '🍽️', time: '20分', description: 'いただいた食材を生かす、バランスのよいアレンジです。', steps: ['食材を火の通りにくい順に切る', 'フライパンで炒めて下味をつける', 'お好みの調味料で味を整える'] };
const cookingStyles = [
  { id: 'stir-fry', label: '炒める' },
  { id: 'simmer', label: '煮る' },
  { id: 'grill', label: '焼く' },
  { id: 'steam', label: '蒸す' },
  { id: 'soup', label: 'スープにする' },
  { id: 'japanese', label: '和風のだし・味噌味', isAvailable: (ingredients) => ingredients.some((item) => /しょうゆ|醤油|みそ|味噌|めんつゆ|だし|出汁/.test(item)) },
  { id: 'chinese', label: '中華風の香味・ごま風味', isAvailable: (ingredients) => ingredients.some((item) => /しょうが|生姜|にんにく|ニンニク|ごま油|鶏ガラ|豆板醤/.test(item)) },
  { id: 'korean', label: '韓国風の甘辛味', isAvailable: (ingredients) => ingredients.some((item) => /キムチ|コチュジャン|韓国/.test(item)) },
  { id: 'western', label: '洋風のハーブ・バター味', isAvailable: (ingredients) => ingredients.some((item) => /バター|チーズ|牛乳|生クリーム|ハーブ|オリーブオイル/.test(item)) },
  { id: 'curry', label: 'スパイスカレー風', isAvailable: (ingredients) => ingredients.some((item) => /カレー|カレー粉|スパイス/.test(item)) },
  { id: 'vinegar', label: '甘酢・さっぱり味', isAvailable: (ingredients) => ingredients.some((item) => /酢|ビネガー|ぽん酢|ポン酢/.test(item)) },
  { id: 'salad', label: 'サラダ仕立て', isAvailable: (ingredients) => ingredients.some((item) => /キャベツ|レタス|白菜|きゅうり|胡瓜|トマト|玉ねぎ|たまねぎ|人参|にんじん|大根|ほうれん草|小松菜|ブロッコリー|アボカド|きのこ/.test(item)) },
];
const loadHistory = () => { try { return JSON.parse(localStorage.getItem('kondate-history') || '[]'); } catch { return []; } };
const chooseCookingStyle = (history, ingredients) => {
  const recentlyUsed = new Set(history.slice(0, 4).map((item) => item.cookingStyle).filter(Boolean));
  const available = cookingStyles.filter((style) => !recentlyUsed.has(style.id) && (!style.isAvailable || style.isAvailable(ingredients)));
  const choices = available.length ? available : cookingStyles;
  return choices[Math.floor(Math.random() * choices.length)];
};
const buildIngredientRecipe = (ingredients, minutes, cookingStyle) => {
  const names = ingredients.join('、');
  const protein = ingredients.find((item) => /牛|豚|鶏|ひき肉|肉|鮭|魚|えび|海老|豆腐/.test(item));
  const emoji = /鮭|魚|えび|海老/.test(names) ? '🐟' : /卵/.test(names) ? '🍳' : protein ? '🥘' : '🍽️';
  const seasoningsByStyle = {
    'stir-fry': ['しょうゆ 小さじ1', '塩・こしょう 少々', 'サラダ油 小さじ1'],
    simmer: ['しょうゆ 大さじ1', 'みりん 大さじ1', '水 100ml'],
    grill: ['塩・こしょう 少々', 'サラダ油 小さじ1'],
    steam: ['塩 少々', '水 大さじ2'],
    soup: ['塩 小さじ1/3', 'こしょう 少々', '水 300ml'],
    japanese: ['しょうゆ 小さじ2', 'みりん 小さじ2', '水 100ml'],
    chinese: ['鶏ガラスープの素 小さじ1', 'しょうゆ 小さじ1', 'ごま油 小さじ1'],
    korean: ['しょうゆ 小さじ1', '砂糖 小さじ1', 'ごま油 小さじ1'],
    western: ['塩・こしょう 少々', 'オリーブオイル 小さじ1'],
    curry: ['カレー粉 小さじ1', '塩 小さじ1/3', '水 150ml'],
    vinegar: ['酢 大さじ1', '砂糖 小さじ2', 'しょうゆ 小さじ1'],
    salad: ['酢 大さじ1', 'オリーブオイル 大さじ1', '塩・こしょう 少々'],
  };
  const methods = {
    'stir-fry': { title: `${names}の香ばし炒め`, description: '登録された食材の食感を生かして手早く仕上げます。', steps: [`${names}を食べやすい大きさに切ります。`, 'サラダ油で火の通りにくい食材から順に炒め、火が通ったらしょうゆ、塩・こしょうで味を整えます。', '器に盛り付けて完成です。'] },
    simmer: { title: `${names}のやさしい煮込み`, description: '登録された食材のうま味を生かした煮込み料理です。', steps: [`${names}を食べやすい大きさに切ります。`, '鍋に食材、水、しょうゆ、みりんを入れて火にかけます。', '火の通りにくい食材から加え、柔らかくなるまで煮て完成です。'] },
    grill: { title: `${names}のこんがり焼き`, description: '登録された食材を香ばしく焼き上げます。', steps: [`${names}を食べやすい大きさに切ります。`, 'サラダ油をひいたフライパンで焼き、塩・こしょうをふります。', '裏返して中まで火を通し、器に盛り付けます。'] },
    steam: { title: `${names}のふっくら蒸し`, description: '登録された食材の味を生かした蒸し料理です。', steps: [`${names}を火が通りやすい大きさに切ります。`, 'フライパンに食材、水を入れてふたをし、中火で蒸します。', '中まで火が通ったら塩で味を整えて完成です。'] },
    soup: { title: `${names}の具だくさんスープ`, description: '登録された食材のうま味を生かしたスープです。', steps: [`${names}を食べやすい大きさに切ります。`, '鍋に食材、水、塩を入れて火にかけます。', '火の通りにくい食材から加えて柔らかくなるまで煮て、こしょうで味を整えます。'] },
    japanese: { title: `${names}の和風仕立て`, description: '登録された食材を和風の味付けで仕上げます。', steps: [`${names}を食べやすい大きさに切ります。`, '鍋に食材、水、しょうゆ、みりんを入れて温めます。', '食材に火が通るまで煮含めて完成です。'] },
    chinese: { title: `${names}の中華風香味仕立て`, description: '登録された食材を中華風の味付けで仕上げます。', steps: [`${names}を食べやすい大きさに切ります。`, '火の通りにくい食材から炒め、鶏ガラスープの素としょうゆで味を整えます。', '中まで火が通ったらごま油を回しかけて完成です。'] },
    korean: { title: `${names}の韓国風仕立て`, description: '登録された食材を甘辛く仕上げます。', steps: [`${names}を食べやすい大きさに切ります。`, '鍋に食材、水、しょうゆ、砂糖を入れて火にかけます。', '食材に火が通るまで煮込み、仕上げにごま油を加えます。'] },
    western: { title: `${names}の洋風仕立て`, description: '登録された食材を洋風の味付けで仕上げます。', steps: [`${names}を食べやすい大きさに切ります。`, 'オリーブオイルで食材を焼くか煮て、塩・こしょうで味を整えます。', 'すべての食材に火が通ったら器に盛り付けます。'] },
    curry: { title: `${names}のカレー仕立て`, description: '登録された食材をスパイシーな味付けで仕上げます。', steps: [`${names}を食べやすい大きさに切ります。`, '鍋で食材を加熱し、水とカレー粉を加えます。', '食材が柔らかくなるまで煮込み、塩で味を整えます。'] },
    vinegar: { title: `${names}のさっぱり仕立て`, description: '酢の風味を生かしたさっぱり味の一皿です。', steps: [`${names}を食べやすい大きさに切ります。`, '肉・魚介・卵を含む場合は中まで加熱します。', '酢、砂糖、しょうゆを混ぜて加え、全体に絡めて完成です。'] },
    salad: { title: `${names}の彩りサラダ`, description: '登録された食材をさっぱりしたドレッシングで楽しめます。', steps: [`${names}を食べやすい大きさに切ります。`, '肉・魚介・卵を含む場合は中まで加熱し、粗熱を取ります。', '酢、オリーブオイル、塩・こしょうを混ぜて食材と和えます。'] },
  };
  const recipe = methods[cookingStyle] || methods.simmer;
  return { ...recipe, emoji, seasonings: seasoningsByStyle[cookingStyle] || seasoningsByStyle.simmer, time: minutes === '10分以内' ? '10分' : minutes === '30分以内' ? '25分' : '15分' };
};
const pickRecipe = (ingredients) => {
  const joined = ingredients.join(' ');
  const ranked = recipes.map((recipe) => ({ recipe, score: recipe.keys.filter((key) => joined.includes(key)).length }));
  const best = ranked.sort((a, b) => b.score - a.score)[0];
  return best?.score ? best.recipe : fallback;
};
const requestRecipe = async (ingredients, meal, minutes, cookingStyle) => {
  const response = await fetch('/api/recipe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ingredients, meal, minutes, cookingStyle }) });
  if (!response.ok) throw new Error('AI提案を取得できませんでした。');
  const data = await response.json();
  if (!data.recipe?.title || !Array.isArray(data.recipe.steps)) throw new Error('AI提案の形式が正しくありません。');
  return data.recipe;
};

function App() {
  const [screen, setScreen] = useState('home');
  const [ingredients, setIngredients] = useState([]);
  const [draft, setDraft] = useState('');
  const draftRef = useRef(null);
  const [meal, setMeal] = useState('夕食');
  const [minutes, setMinutes] = useState('10〜15分');
  const [suggestion, setSuggestion] = useState(null);
  const [history, setHistory] = useState(loadHistory);
  const [sheetUrl, setSheetUrl] = useState(() => localStorage.getItem('google-sheet-webhook') || DEFAULT_SHEET_URL);
  const [showSettings, setShowSettings] = useState(false);
  const [message, setMessage] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => localStorage.setItem('kondate-history', JSON.stringify(history)), [history]);
  useEffect(() => localStorage.setItem('google-sheet-webhook', sheetUrl), [sheetUrl]);
  const addIngredient = () => { const value = draftRef.current?.value.trim() || ''; if (value && !ingredients.includes(value)) setIngredients([...ingredients, value]); if (draftRef.current) draftRef.current.value = ''; setDraft(''); };
  const sendToSheet = async (item) => {
    if (!sheetUrl) { setMessage('スプレッドシートの連携URLを設定してください。'); return; }
    const payload = { date: new Date().toISOString(), dish: item.title, ingredients: item.ingredients.join('、'), meal: item.meal, cookingTime: item.time, requestedTime: item.minutes, steps: item.steps.join('\n') };
    try { await fetch(sheetUrl, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) }); setMessage('スプレッドシートに自動記録しました'); } catch { setMessage('記録できませんでした'); }
  };
  const createSuggestion = async () => {
    setGenerating(true); setMessage('');
    const cookingStyle = chooseCookingStyle(history, ingredients);
    let recipe;
    try { recipe = await requestRecipe(ingredients, meal, minutes, cookingStyle.id); } catch { recipe = buildIngredientRecipe(ingredients, minutes, cookingStyle.id); }
    const item = { ...recipe, cookingStyle: cookingStyle.id, id: Date.now(), ingredients, meal, minutes, createdAt: new Date().toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }) };
    setSuggestion(item); setHistory((prev) => [item, ...prev].slice(0, 12)); setScreen('suggestion'); setMessage(''); sendToSheet(item);
    setGenerating(false);
  };
  const nav = (target) => { if (target === 'suggestion' && !suggestion) return; setScreen(target); };

  const Header = ({ title, back }) => <header className="app-header">{back ? <button className="back" onClick={() => setScreen(back)}>‹</button> : <span className="header-space" />}<div className="logo"><b>♨</b> COOK MENU</div><button className="gear" onClick={() => setShowSettings(!showSettings)}>⚙</button></header>;
  const Home = () => <><Header /><div className="home-page"><div className="home-kicker">今日のごはん、もう迷わない</div><h1>おいしい献立を<br />見つけよう。</h1><p>冷蔵庫にある食材から、<br />今日にぴったりの一皿を提案します。</p><button className="big-create" onClick={() => setScreen('input')}><span>🍴</span><strong>献立を作る</strong><small>食材を入力してはじめる</small></button><div className="quick-title">クイック開始</div><div className="quick-grid"><button onClick={() => { setMeal('朝食'); setScreen('input'); }}>☀<span>朝日差し</span></button><button onClick={() => { setMinutes('10分以内'); setScreen('input'); }}>⚡<span>お急ぎ</span></button><button onClick={() => { setScreen('history'); }}>◴<span>履歴を見る</span></button></div></div></>;
  const Input = () => <><Header back="home" /><div className="page input-page"><div className="page-mark">01</div><h2>食材を入力</h2><p className="sub">食材に塩・しょうゆなどの調味料を組み合わせて提案します</p><div className="add-row"><input ref={draftRef} defaultValue="" onKeyDown={(e) => e.key === 'Enter' && addIngredient()} placeholder="食材を入力" /><button onClick={addIngredient}>＋</button></div><div className="chips">{ingredients.map((item) => <span key={item}>{item}<button onClick={() => setIngredients(ingredients.filter((value) => value !== item))}>×</button></span>)}</div><section className="option"><label>食べる時間</label><div className="toggle">{['朝食', '昼食', '夕食'].map((item) => <button key={item} onClick={() => setMeal(item)} className={meal === item ? 'on' : ''}>{item}</button>)}</div></section><section className="option"><label>調理時間</label><div className="toggle time-toggle">{['10分以内', '10〜15分', '30分以内'].map((item) => <button key={item} onClick={() => setMinutes(item)} className={minutes === item ? 'on' : ''}>{item}</button>)}</div></section><button className="primary-action" disabled={!ingredients.length || generating} onClick={createSuggestion}>{generating ? 'AIが献立を考えています…' : '✦ AIに献立を考えてもらう'}</button></div></>;
  const Suggestion = () => <><Header back="input" />{suggestion ? <div className="page suggestion-page"><div className="page-mark">02</div><p className="eyebrow">AI'S SUGGESTION</p><h2>AIの献立提案</h2><div className="dish-visual"><span>{suggestion.emoji}</span></div><span className="meal-badge">今日の{suggestion.meal}</span><h3>{suggestion.title}</h3><p className="dish-desc">{suggestion.description}</p><div className="info-line"><span>⏱ {suggestion.time}</span><span>食材 {suggestion.ingredients.length}品</span></div><section className="seasonings"><b>使う調味料</b><ul>{(suggestion.seasonings || []).length ? suggestion.seasonings.map((seasoning) => <li key={seasoning}>{seasoning}</li>) : <li>調味料なし</li>}</ul></section><div className="steps"><b>作り方</b>{suggestion.steps.map((step, index) => <p key={step}><i>{index + 1}</i>{step}</p>)}</div><p className="saved-message">✓ {message || '献立を作成しました'}</p><button className="secondary-action" onClick={() => setScreen('input')}>別の献立を考える</button></div> : null}</>;
  const History = () => <><Header back="home" /><div className="page history-page"><div className="page-mark">03</div><p className="eyebrow">MY MENU LOG</p><h2>献立の履歴</h2><p className="sub">これまでに提案したメニュー</p>{history.length ? <div className="history-list">{history.map((item) => <button key={item.id} onClick={() => { setSuggestion(item); setScreen('suggestion'); }}><span className="history-emoji">{item.emoji}</span><span><small>{item.createdAt}・{item.meal}</small><strong>{item.title}</strong><em>⏱ {item.time}</em></span><i>›</i></button>)}</div> : <div className="no-history">🍲<br />まだ提案履歴がありません</div>}</div></>;
  return <div className="site"><div className="phone"><div className="speaker" />{showSettings && <div className="settings"><b>Googleスプレッドシート連携</b><input value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} /><small>献立の提案時に自動で記録されます。</small></div>}{screen === 'home' && <Home />}{screen === 'input' && <Input />}{screen === 'suggestion' && <Suggestion />}{screen === 'history' && <History />}<nav>{[['home', '⌂', 'ホーム'], ['input', '✎', '入力'], ['suggestion', '✦', '提案'], ['history', '◴', '履歴']].map(([target, icon, label]) => <button key={target} className={screen === target ? 'active' : ''} onClick={() => nav(target)}><span>{icon}</span>{label}</button>)}</nav></div><aside className="desktop-copy"><span>COOK MENU</span><h2>毎日の献立を、<br />もっと手軽に。</h2><p>食材を入力するだけで、<br />あなたのためのレシピを提案します。</p><div>ホーム → 食材入力 → AI提案 → 履歴</div></aside></div>;
}

export default App;

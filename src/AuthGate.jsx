import { useState } from 'react';

export default function AuthGate({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  const submit = async (event) => {
    event.preventDefault(); setLoading(true); setMessage('');
    try {
      const response = await fetch(`/api/auth/${mode === 'login' ? 'login' : 'register'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const isJson = (response.headers.get('content-type') || '').includes('application/json');
      const responseText = await response.text();
      let data = {};
      if (isJson) {
        try { data = JSON.parse(responseText); } catch { data = {}; }
      }
      if (!isJson && responseText.trim().startsWith('<')) data.error = '認証APIが見つかりません。Cloudflare Pages Functionsとして公開されているURLで実行してください。';
      if (!response.ok) throw new Error(data.error || '処理に失敗しました。');
      onAuthenticated(data.user);
    } catch (error) { setMessage(error.message || '通信に失敗しました。'); }
    finally { setLoading(false); }
  };
  return <main className="auth-page"><section className="auth-card"><div className="auth-logo"><b>♨</b> AKI MENU</div><p className="auth-kicker">WELCOME TO YOUR KITCHEN</p><h1>ログイン</h1><p className="auth-description">今日の献立を一緒に考えましょう。</p><form onSubmit={submit}><label>ユーザー名<input autoComplete="username" required minLength="2" value={form.username} onChange={update('username')} placeholder="例：aki" /></label><label>パスワード<input autoComplete="current-password" required minLength="8" type="password" value={form.password} onChange={update('password')} placeholder="8文字以上" /></label>{message && <p className="auth-error">{message}</p>}<button disabled={loading} className="auth-submit">{loading ? '処理中…' : 'ログイン'}</button></form><a className="auth-switch" href="./regist.html">はじめての方はこちらから新規登録</a><small>パスワードは暗号化して保存され、スプレッドシートには記録されません。</small></section></main>;
}

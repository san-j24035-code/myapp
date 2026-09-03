import { useEffect, useState } from 'react';
import App from './App';
import AuthGate from './AuthGate';

export default function Root() {
  const [user, setUser] = useState(undefined);
  useEffect(() => { fetch('/api/auth/session').then((response) => response.json()).then((data) => setUser(data.user)).catch(() => setUser(null)); }, []);
  const logout = async () => { await fetch('/api/auth/logout', { method: 'POST' }); setUser(null); };
  if (user === undefined) return <main className="auth-page"><p className="auth-loading">読み込み中…</p></main>;
  if (!user) return <AuthGate onAuthenticated={setUser} />;
  return <div className="authenticated"><App /><div className="signed-user">こんにちは、<b>{user.username}</b>さん</div><button className="logout-button" onClick={logout}>ログアウト</button></div>;
}

import { expiredCookie, json, readCookie } from './_shared';
export async function onRequestPost({ request, env }) { const token = readCookie(request, 'aki_menu_session'); if (token) await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run(); return json({ ok: true }, 200, { 'Set-Cookie': expiredCookie }); }

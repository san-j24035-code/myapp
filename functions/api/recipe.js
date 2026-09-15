const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
});

const extractJson = (text) => {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned);
};

export async function onRequestPost({ request, env }) {
  let input;
  try { input = await request.json(); } catch { return json({ error: '入力形式が正しくありません。' }, 400); }
  const ingredients = Array.isArray(input.ingredients) ? input.ingredients.map(String).map((value) => value.trim()).filter(Boolean).slice(0, 12) : [];
  if (!ingredients.length) return json({ error: '食材を1つ以上入力してください。' }, 400);
  if (!env.GEMINI_API_KEY) return json({ error: 'AI_API_KEY_NOT_CONFIGURED' }, 503);

  const model = env.GEMINI_MODEL || 'gemini-2.0-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;
  const prompt = [
    'あなたは日本の家庭料理に詳しい献立AIです。',
    `必ず次の入力食材をすべて主役または具材として使ってください: ${ingredients.join('、')}`,
    `食べる時間: ${input.meal || '夕食'}。調理時間: ${input.minutes || '10〜15分'}。`,
    '入力にない食材を主役に置き換えないでください。調味料と水は追加して構いません。',
    '次のJSONだけを返してください。説明文やMarkdownは不要です。',
    '{"title":"料理名","emoji":"絵文字1つ","time":"調理時間","description":"料理の説明","steps":["手順1","手順2","手順3"]}',
  ].join('\n');

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.4, responseMimeType: 'application/json' } }),
    });
    const data = await response.json();
    if (!response.ok) return json({ error: 'AIサービスに接続できませんでした。' }, 502);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const recipe = text ? extractJson(text) : null;
    if (!recipe?.title || !Array.isArray(recipe.steps) || !recipe.steps.length) return json({ error: 'AIの提案形式が正しくありません。' }, 502);
    return json({ recipe: { title: String(recipe.title), emoji: String(recipe.emoji || '🍳'), time: String(recipe.time || input.minutes || '20分'), description: String(recipe.description || ''), steps: recipe.steps.slice(0, 5).map(String) } });
  } catch { return json({ error: 'AI提案の取得に失敗しました。' }, 502); }
}

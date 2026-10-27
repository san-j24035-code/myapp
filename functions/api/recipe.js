const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
});

const extractJson = (text) => {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned);
};

const cookingStyleLabels = {
  'stir-fry': '炒める',
  simmer: '煮る',
  grill: '焼く',
  steam: '蒸す',
  soup: 'スープにする',
  japanese: '和風のだし・味噌味',
  chinese: '中華風の香味・ごま風味',
  korean: '韓国風の甘辛味',
  western: '洋風のハーブ・バター味',
  curry: 'スパイスカレー風',
  vinegar: '甘酢・さっぱり味',
  salad: 'サラダ仕立て（肉・魚介・卵は必ず加熱する）',
};

export async function onRequestPost({ request, env }) {
  let input;
  try { input = await request.json(); } catch { return json({ error: '入力形式が正しくありません。' }, 400); }
  const ingredients = Array.isArray(input.ingredients) ? input.ingredients.map(String).map((value) => value.trim()).filter(Boolean).slice(0, 12) : [];
  if (!ingredients.length) return json({ error: '食材を1つ以上入力してください。' }, 400);
  if (!env.GEMINI_API_KEY) return json({ error: 'AI_API_KEY_NOT_CONFIGURED' }, 503);
  const cookingStyle = cookingStyleLabels[input.cookingStyle] || '食材に合う調理法';

  const model = env.GEMINI_MODEL || 'gemini-2.0-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;
  const prompt = [
    'あなたは日本の家庭料理に詳しい献立AIです。',
    `次の入力食材をすべて料理の主役または具材として使ってください: ${ingredients.join('、')}`,
    `食べる時間: ${input.meal || '夕食'}。調理時間: ${input.minutes || '10〜15分'}。`,
    `今回の料理ジャンル・調理法は「${cookingStyle}」です。料理名と手順に反映してください。`,
    '入力食材以外の食材（野菜、肉、魚、卵、豆腐など）は追加しないでください。一方、塩、こしょう、しょうゆ、みそ、砂糖、酢、酒、みりん、油、ごま油、バター、にんにく、しょうが、だし、鶏ガラスープの素、カレー粉など家庭にある調味料・香辛料は、料理に合うものを必要な分だけ追加して構いません。水も必要に応じて使えます。',
    'ingredients 配列には入力された食材だけを名前を変えずにすべて記載してください。追加する調味料はseasonings配列に「調味料名 分量」の形式で記載し、手順にも使うタイミングを明記してください。調味料を不必要に多く使わず、味の方向性に合う組み合わせにしてください。',
    '分量は2人分を目安に、調味料は小さじ・大さじ・ml・少々などで具体的に示してください。食材に合う自然な料理にし、指定時間内に作れる現実的な手順にしてください。生食できない肉・魚介・卵は必ず中まで加熱してください。',
    'レシピサイトの掲載文のように、家庭で作る場面が想像できる自然な日本語で書いてください。手順は下ごしらえ、加熱、味付け、盛り付けの順に3〜5個にしてください。',
    '次のJSONだけを返してください。説明文やMarkdownは不要です。',
    `{"ingredients":${JSON.stringify(ingredients)},"seasonings":["しょうゆ 小さじ1","みりん 小さじ1"],"title":"料理名","emoji":"絵文字1つ","time":"調理時間","description":"料理の説明","steps":["手順1","手順2","手順3"]}`,
  ].join('\n');

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, responseMimeType: 'application/json' } }),
    });
    const data = await response.json();
    if (!response.ok) return json({ error: 'AIサービスに接続できませんでした。' }, 502);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const recipe = text ? extractJson(text) : null;
    if (!recipe?.title || !Array.isArray(recipe.steps) || !recipe.steps.length) return json({ error: 'AIの提案形式が正しくありません。' }, 502);
    const returnedIngredients = Array.isArray(recipe.ingredients) ? recipe.ingredients.map((value) => String(value).trim()) : [];
    const requestedIngredients = [...new Set(ingredients)];
    if (returnedIngredients.length !== requestedIngredients.length || new Set(returnedIngredients).size !== requestedIngredients.length || requestedIngredients.some((value) => !returnedIngredients.includes(value))) {
      return json({ error: 'AIが未登録の食材を提案したため、レシピを作り直してください。' }, 502);
    }
    return json({ recipe: { title: String(recipe.title), emoji: String(recipe.emoji || '🍳'), time: String(recipe.time || input.minutes || '20分'), description: String(recipe.description || ''), seasonings: Array.isArray(recipe.seasonings) ? recipe.seasonings.slice(0, 8).map(String) : [], steps: recipe.steps.slice(0, 5).map(String) } });
  } catch { return json({ error: 'AI提案の取得に失敗しました。' }, 502); }
}

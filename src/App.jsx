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
const buildIngredientRecipe = (ingredients, minutes, cookingStyle, history) => {
  const names = ingredients.join('、');
  const protein = ingredients.find((item) => /牛|豚|鶏|ひき肉|肉|鮭|魚|えび|海老|豆腐/.test(item));
  const emoji = /鮭|魚|えび|海老/.test(names) ? '🐟' : /卵/.test(names) ? '🍳' : protein ? '🥘' : '🍽️';
  const methods = {
    'stir-fry': [
      { id: 'soy-glaze', title: `${names}の甘辛しょうゆ炒め`, description: 'しょうゆとみりんの甘辛味をからめた、ごはんに合う炒め物です。', seasonings: ['しょうゆ 大さじ1', 'みりん 大さじ1', 'サラダ油 小さじ1'], steps: [`${names}を食べやすい大きさに切ります。`, 'サラダ油で火の通りにくい食材から炒め、火が通ったらしょうゆとみりんを加えます。', '汁気を飛ばしながら全体に味をからめて完成です。'] },
      { id: 'pepper-stir-fry', title: `${names}の塩こしょう炒め`, description: '素材の味を引き立てる、シンプルで香ばしい炒め物です。', seasonings: ['塩 小さじ1/3', '粗びきこしょう 少々', 'サラダ油 小さじ1'], steps: [`${names}を食べやすい大きさに切ります。`, 'サラダ油を熱し、火の通りにくい食材から順に炒めます。', '全体に火が通ったら塩と粗びきこしょうで味を整えます。'] },
      { id: 'miso-stir-fry', title: `${names}のみそ炒め`, description: 'コクのあるみそだれをまとわせた、風味豊かな一皿です。', seasonings: ['みそ 大さじ1', 'みりん 大さじ1', 'サラダ油 小さじ1'], steps: [`${names}を食べやすい大きさに切ります。`, 'みそとみりんを混ぜておきます。', 'サラダ油で食材を炒め、火が通ったらみそだれを加えて手早くからめます。'] },
    ],
    simmer: [
      { id: 'simmer-sweet-soy', title: `${names}の照り煮`, description: 'しょうゆとみりんを煮からめた、つやのある甘辛煮です。', seasonings: ['しょうゆ 大さじ1', 'みりん 大さじ1', '水 100ml'], steps: [`${names}を食べやすい大きさに切ります。`, '鍋に水、しょうゆ、みりんを煮立て、火の通りにくい食材から入れます。', 'ふたをして火が通るまで煮て、最後に煮汁をからめます。'] },
      { id: 'simmer-ginger', title: `${names}のしょうが煮`, description: 'しょうがの香りをきかせた、すっきり味の煮物です。', seasonings: ['しょうが 小さじ1', 'しょうゆ 大さじ1', '水 120ml'], steps: [`${names}を食べやすい大きさに切ります。`, '鍋に水、しょうゆ、しょうがを入れて煮立てます。', '食材を加えてふたをし、中まで火が通るまで煮含めます。'] },
      { id: 'simmer-miso', title: `${names}のみそ煮`, description: 'みそのうま味が食材になじむ、ほっとする味わいです。', seasonings: ['みそ 大さじ1', 'みりん 大さじ1', '水 150ml'], steps: [`${names}を食べやすい大きさに切ります。`, '鍋に水とみりんを入れて煮立て、火の通りにくい食材から加えます。', '火が通ったらみそを溶き入れ、弱火で味をなじませます。'] },
    ],
    grill: [
      { id: 'grill-salt', title: `${names}の香ばし塩焼き`, description: '表面をこんがり焼き、塩で素材のおいしさを引き出します。', seasonings: ['塩 小さじ1/3', 'サラダ油 小さじ1'], steps: [`${names}の水気を拭き、食べやすい大きさに切ります。`, 'サラダ油を熱したフライパンに並べ、塩をふって焼きます。', '裏返して中まで火を通し、香ばしい焼き色がついたら完成です。'] },
      { id: 'grill-teriyaki', title: `${names}の照り焼き`, description: '甘辛いたれをからめて、つやよく焼き上げます。', seasonings: ['しょうゆ 大さじ1', 'みりん 大さじ1', '砂糖 小さじ1'], steps: [`${names}を食べやすい大きさに切ります。`, 'フライパンで両面を焼き、火の通りにくいものはふたをして中まで加熱します。', 'しょうゆ、みりん、砂糖を加え、煮詰めながら全体にからめます。'] },
      { id: 'grill-butter-soy', title: `${names}のバターしょうゆ焼き`, description: 'バターのコクとしょうゆの香ばしさが楽しめます。', seasonings: ['バター 10g', 'しょうゆ 小さじ2', 'こしょう 少々'], steps: [`${names}を食べやすい大きさに切ります。`, 'フライパンで両面を焼き、ふたをして中まで火を通します。', 'バターとしょうゆを加えて手早くからめ、こしょうをふります。'] },
    ],
    steam: [
      { id: 'steam-sake', title: `${names}の酒蒸し`, description: '酒蒸しにして、食材のうま味を閉じ込めます。', seasonings: ['酒 大さじ2', '塩 少々', '水 大さじ2'], steps: [`${names}を火が通りやすい大きさに切ります。`, 'フライパンに食材、水、酒、塩を入れてふたをします。', '中火で蒸し、中まで火が通ったら蒸し汁ごと盛り付けます。'] },
      { id: 'steam-sesame', title: `${names}のごま風味蒸し`, description: 'ふっくら蒸した食材に、ごま油の香りを添えます。', seasonings: ['塩 小さじ1/3', 'ごま油 小さじ1', '水 大さじ2'], steps: [`${names}を火が通りやすい大きさに切ります。`, 'フライパンに食材と水を入れてふたをし、中火で蒸します。', '中まで火が通ったら塩で味を整え、ごま油を回しかけます。'] },
      { id: 'steam-ponzu', title: `${names}のポン酢蒸し`, description: '蒸し上がりにポン酢を添えた、さっぱりした一品です。', seasonings: ['ポン酢 大さじ1', '酒 大さじ1', '水 大さじ2'], steps: [`${names}を火が通りやすい大きさに切ります。`, 'フライパンに食材、水、酒を入れてふたをし、蒸し煮にします。', '中まで火が通ったら器に盛り、ポン酢をかけます。'] },
    ],
    soup: [
      { id: 'soup-consomme', title: `${names}のコンソメスープ`, description: 'コンソメのうま味をきかせた、やさしい洋風スープです。', seasonings: ['水 300ml', '顆粒コンソメ 小さじ1', 'こしょう 少々'], steps: [`${names}を食べやすい大きさに切ります。`, '鍋に水と顆粒コンソメを入れて煮立て、火の通りにくい食材から加えます。', 'すべてに火が通るまで煮て、こしょうで味を整えます。'] },
      { id: 'soup-miso', title: `${names}のみそ汁仕立て`, description: 'だしのうま味とみその香りを楽しむ具だくさん汁です。', seasonings: ['水 300ml', '顆粒だし 小さじ1/2', 'みそ 大さじ1'], steps: [`${names}を食べやすい大きさに切ります。`, '鍋に水と顆粒だしを入れて煮立て、火の通りにくい食材から煮ます。', '火が通ったら弱火にし、みそを溶き入れて沸騰直前で火を止めます。'] },
      { id: 'soup-chicken', title: `${names}の中華スープ`, description: '鶏ガラだしとごま油が香る、満足感のあるスープです。', seasonings: ['水 300ml', '鶏ガラスープの素 小さじ1', 'ごま油 小さじ1'], steps: [`${names}を食べやすい大きさに切ります。`, '鍋に水と鶏ガラスープの素を入れて煮立て、食材を加えます。', '中まで火が通ったらごま油を加えて仕上げます。'] },
    ],
    japanese: [
      { id: 'japanese-dashi', title: `${names}のだし煮`, description: 'だしの香りを含ませた、素材を味わう和風の煮物です。', seasonings: ['水 150ml', '顆粒だし 小さじ1/2', 'しょうゆ 小さじ2'], steps: [`${names}を食べやすい大きさに切ります。`, '鍋に水、顆粒だし、しょうゆを入れて煮立てます。', '食材を加えてふたをし、中まで火が通るまで煮含めます。'] },
      { id: 'japanese-miso', title: `${names}のみそ仕立て`, description: 'みそのまろやかなコクを生かした和風の一皿です。', seasonings: ['みそ 大さじ1', 'みりん 小さじ2', '水 100ml'], steps: [`${names}を食べやすい大きさに切ります。`, '鍋に水とみりんを入れて食材を煮ます。', '火が通ったらみそを溶き入れ、弱火で味をなじませます。'] },
      { id: 'japanese-sweet-vinegar', title: `${names}の和風甘酢あん`, description: 'だしの風味を含んだ甘酢をからめて仕上げます。', seasonings: ['酢 大さじ1', 'しょうゆ 小さじ2', '砂糖 小さじ2'], steps: [`${names}を食べやすい大きさに切り、火の通りにくい順に加熱します。`, '酢、しょうゆ、砂糖を混ぜて加えます。', '弱火で全体にたれをからめ、味がなじんだら盛り付けます。'] },
    ],
    chinese: [
      { id: 'chinese-garlic', title: `${names}のにんにくしょうゆ炒め`, description: 'にんにくの香りとしょうゆの香ばしさが食欲をそそります。', seasonings: ['にんにく 小さじ1/2', 'しょうゆ 小さじ2', 'ごま油 小さじ1'], steps: [`${names}を食べやすい大きさに切ります。`, 'ごま油でにんにくを弱火で熱し、香りが立ったら食材を炒めます。', '中まで火が通ったらしょうゆを加えて手早くからめます。'] },
      { id: 'chinese-sesame', title: `${names}のごま塩炒め`, description: 'ごま油と白ごまの香りをきかせた中華風の炒め物です。', seasonings: ['鶏ガラスープの素 小さじ1/2', '塩 少々', 'ごま油 小さじ1'], steps: [`${names}を食べやすい大きさに切ります。`, 'ごま油で火の通りにくい食材から順に炒めます。', '鶏ガラスープの素と塩で味を整え、全体に火が通ったら完成です。'] },
      { id: 'chinese-sweet-sour', title: `${names}の中華甘酢炒め`, description: '酢と砂糖の甘酸っぱい味が食材によく合います。', seasonings: ['酢 大さじ1', '砂糖 小さじ2', 'しょうゆ 小さじ1'], steps: [`${names}を食べやすい大きさに切ります。`, '火の通りにくい食材から順に炒め、中まで火を通します。', '酢、砂糖、しょうゆを混ぜて加え、全体に照りが出るまでからめます。'] },
    ],
    korean: [
      { id: 'korean-sweet-spicy', title: `${names}の甘辛コチュジャン炒め`, description: 'コチュジャンのうま辛味をからめた韓国風の一皿です。', seasonings: ['コチュジャン 小さじ2', 'しょうゆ 小さじ1', 'ごま油 小さじ1'], steps: [`${names}を食べやすい大きさに切ります。`, 'ごま油で食材を炒め、火の通りにくいものはふたをして加熱します。', 'コチュジャンとしょうゆを加え、全体にからめます。'] },
      { id: 'korean-sesame-soy', title: `${names}の韓国風ごましょうゆ和え`, description: 'ごま油としょうゆをきかせた香ばしい味付けです。', seasonings: ['しょうゆ 小さじ2', 'ごま油 小さじ1', '白ごま 小さじ1'], steps: [`${names}を食べやすい大きさに切り、必要な食材は中まで加熱します。`, 'しょうゆとごま油を混ぜてたれを作ります。', '食材が熱いうちにたれで和え、白ごまをふります。'] },
      { id: 'korean-vinegar', title: `${names}の韓国風さっぱりだれ`, description: '酢の酸味とごま油の香りを合わせた、軽やかな味わいです。', seasonings: ['酢 大さじ1', 'しょうゆ 小さじ1', 'ごま油 小さじ1'], steps: [`${names}を食べやすい大きさに切り、必要な食材は中まで加熱します。`, '酢、しょうゆ、ごま油を混ぜてたれを作ります。', '食材にたれをからめ、味がなじんだら盛り付けます。'] },
    ],
    western: [
      { id: 'western-butter', title: `${names}のバターソテー`, description: 'バターのコクをまとわせて香ばしく焼き上げます。', seasonings: ['バター 10g', '塩 小さじ1/3', 'こしょう 少々'], steps: [`${names}を食べやすい大きさに切ります。`, 'フライパンで火の通りにくい食材から焼きます。', '中まで火が通ったらバターを加え、塩・こしょうで味を整えます。'] },
      { id: 'western-herb', title: `${names}のハーブ風味ソテー`, description: 'オリーブオイルとハーブが香る、シンプルな洋風ソテーです。', seasonings: ['オリーブオイル 大さじ1', '乾燥ハーブ 小さじ1/2', '塩・こしょう 少々'], steps: [`${names}を食べやすい大きさに切ります。`, 'オリーブオイルで食材を焼き、火の通りにくいものはふたをして加熱します。', '中まで火が通ったら乾燥ハーブ、塩、こしょうをふります。'] },
      { id: 'western-simmer', title: `${names}のハーブ蒸し煮`, description: 'オリーブオイルとハーブで香りよく蒸し煮にします。', seasonings: ['オリーブオイル 小さじ1', '水 50ml', '乾燥ハーブ 少々', '塩 少々'], steps: [`${names}を食べやすい大きさに切ります。`, '鍋で食材をオリーブオイルで軽く焼き、水と乾燥ハーブを加えます。', 'ふたをして中まで火を通し、塩で味を整えます。'] },
    ],
    curry: [
      { id: 'curry-mild', title: `${names}のまろやかカレー煮`, description: 'カレー粉の香りを生かした、手軽なカレー風味の煮込みです。', seasonings: ['カレー粉 小さじ1', '水 150ml', '塩 小さじ1/3'], steps: [`${names}を食べやすい大きさに切ります。`, '鍋で食材を軽く炒め、水とカレー粉を加えます。', 'ふたをして中まで火を通し、塩で味を整えます。'] },
      { id: 'curry-soy', title: `${names}の和風カレー炒め`, description: 'カレーの香りにしょうゆのうま味を合わせました。', seasonings: ['カレー粉 小さじ1', 'しょうゆ 小さじ2', 'サラダ油 小さじ1'], steps: [`${names}を食べやすい大きさに切ります。`, 'サラダ油で火の通りにくい食材から炒めます。', '中まで火が通ったらカレー粉としょうゆを加えて全体にからめます。'] },
      { id: 'curry-soup', title: `${names}のスパイススープ`, description: 'カレー粉をきかせた、さらりと食べやすいスープです。', seasonings: ['水 300ml', 'カレー粉 小さじ1', '顆粒コンソメ 小さじ1'], steps: [`${names}を食べやすい大きさに切ります。`, '鍋で食材を軽く炒め、水と顆粒コンソメを加えます。', 'カレー粉を溶き入れて煮立て、食材に火が通ったら完成です。'] },
    ],
    vinegar: [
      { id: 'vinegar-sweet-sour', title: `${names}の甘酢炒め`, description: '甘酸っぱいたれをからめた、後味さっぱりの炒め物です。', seasonings: ['酢 大さじ1', '砂糖 小さじ2', 'しょうゆ 小さじ1'], steps: [`${names}を食べやすい大きさに切ります。`, 'サラダ油で食材を炒め、火の通りにくいものは中まで加熱します。', '酢、砂糖、しょうゆを加え、たれが全体にからんだら完成です。'] },
      { id: 'vinegar-ponzu', title: `${names}のポン酢照り焼き`, description: 'ポン酢の酸味を生かした、さっぱり味の照り焼きです。', seasonings: ['ポン酢 大さじ1', 'みりん 大さじ1', 'サラダ油 小さじ1'], steps: [`${names}を食べやすい大きさに切ります。`, 'サラダ油で両面を焼き、ふたをして中まで火を通します。', 'ポン酢とみりんを加えて煮からめます。'] },
      { id: 'vinegar-simmer', title: `${names}のさっぱり酢煮`, description: '酢を加えて煮ることで、軽やかな味に仕上げます。', seasonings: ['酢 大さじ1', 'しょうゆ 大さじ1', '水 100ml'], steps: [`${names}を食べやすい大きさに切ります。`, '鍋に水、酢、しょうゆを入れて煮立てます。', '食材を加えて中まで火が通るまで煮込み、煮汁をからめます。'] },
    ],
    salad: [
      { id: 'salad-vinaigrette', title: `${names}のフレンチサラダ`, description: '酢とオリーブオイルのシンプルなドレッシングで味わいます。', seasonings: ['酢 大さじ1', 'オリーブオイル 大さじ1', '塩・こしょう 少々'], steps: [`${names}を食べやすい大きさに切ります。`, '肉・魚介・卵が入る場合は別に中まで加熱し、粗熱を取ります。', '酢、オリーブオイル、塩、こしょうを混ぜ、食材と和えます。'] },
      { id: 'salad-sesame', title: `${names}のごまドレッシングサラダ`, description: 'ごま油としょうゆの香ばしいドレッシングで仕上げます。', seasonings: ['しょうゆ 小さじ2', '酢 小さじ2', 'ごま油 小さじ1', '白ごま 小さじ1'], steps: [`${names}を食べやすい大きさに切ります。`, '肉・魚介・卵が入る場合は中まで加熱し、粗熱を取ります。', 'しょうゆ、酢、ごま油を混ぜて和え、白ごまをふります。'] },
      { id: 'salad-sweet-vinegar', title: `${names}のさっぱり甘酢和え`, description: '甘酢をなじませた、箸休めにもぴったりの一皿です。', seasonings: ['酢 大さじ1', '砂糖 小さじ2', '塩 少々'], steps: [`${names}を食べやすい大きさに切ります。`, '肉・魚介・卵が入る場合は中まで加熱し、粗熱を取ります。', '酢、砂糖、塩を混ぜて食材と和え、少し置いて味をなじませます。'] },
    ],
  };
  const templates = methods[cookingStyle] || methods.simmer;
  const recentTemplateIds = new Set(history.filter((item) => item.cookingStyle === cookingStyle).slice(0, 3).map((item) => item.templateId).filter(Boolean));
  const availableTemplates = templates.filter((template) => !recentTemplateIds.has(template.id));
  const recipe = (availableTemplates.length ? availableTemplates : templates)[Math.floor(Math.random() * (availableTemplates.length || templates.length))];
  return { ...recipe, templateId: recipe.id, emoji, time: minutes === '10分以内' ? '10分' : minutes === '30分以内' ? '25分' : '15分' };
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
    try { recipe = await requestRecipe(ingredients, meal, minutes, cookingStyle.id); } catch { recipe = buildIngredientRecipe(ingredients, minutes, cookingStyle.id, history); }
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

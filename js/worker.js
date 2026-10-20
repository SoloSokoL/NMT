// Cloudflare Worker: проксі між сайтом і Cloudflare Workers AI (безкоштовно, без стороннього ключа).
// Налаштування (Workers → Settings):
//   Bindings → Add → Workers AI, назва змінної: AI
//   MODEL        — (необов'язково) змінна з назвою моделі зі списку Workers AI; за замовчуванням див. нижче
//   APP_TOKEN     — секрет: довгий випадковий рядок (його ж вписуєш у блоці «🤖 ШІ» на сайті)
//   ALLOW_ORIGIN  — звичайна змінна: https://ТВІЙ-НІК.github.io (без слеша в кінці й без шляху)
export default {
  async fetch(req, env) {
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOW_ORIGIN || 'null',
      'Access-Control-Allow-Headers': 'content-type,x-app-token',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Vary': 'Origin'
    };
    const json = (obj, status = 200) =>
      new Response(JSON.stringify(obj), { status, headers: { ...cors, 'content-type': 'application/json' } });

    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return json({ error: 'method' }, 405);
    if (!env.APP_TOKEN || req.headers.get('x-app-token') !== env.APP_TOKEN) return json({ error: 'forbidden' }, 403);

    let body;
    try { body = await req.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
    const prompt = String(body.prompt || '').slice(0, 4000);
    if (!prompt) return json({ error: 'empty' }, 400);
    const max = Math.max(50, Math.min(1500, parseInt(body.max, 10) || 600));

    const model = env.MODEL || '@cf/nvidia/nemotron-3-120b-a12b';
    const system = String(body.system || '').slice(0, 2000);
    const messages = (system ? [{ role: 'system', content: system }] : []).concat([{ role: 'user', content: prompt }]);
    let d;
    try {
      d = await env.AI.run(model, { messages, max_tokens: max });
    } catch (e) {
      return json({ error: 'ai: ' + String((e && e.message) || e).slice(0, 200) }, 502);
    }
    // різні моделі повертають або {response}, або формат OpenAI {choices:[{message:{content}}]}
    const text = String((d && (d.response || (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content))) || '');
    return json({ text });
  }
};

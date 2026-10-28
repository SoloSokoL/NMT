// Cloudflare Worker: проксі між сайтом і Google Gemini API. Ключ Gemini лежить ЛИШЕ тут (в браузер не потрапляє).
// Налаштування (Workers → Settings → Variables and Secrets):
//   GEMINI_API_KEY — секрет: ключ із https://aistudio.google.com/apikey (безкоштовний, з лімітами)
//   APP_TOKEN      — секрет: довгий випадковий рядок (той самий, що вписано в блоці «🤖 ШІ» на сайті)
//   ALLOW_ORIGIN   — змінна: https://ТВІЙ-НІК.github.io (без слеша в кінці й без шляху)
//   MODEL          — (необов'язково) назва моделі Gemini, напр. gemini-3.8-flash; за замовчуванням gemini-flash-latest
// Binding «Workers AI» (змінна AI) більше не потрібен.
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
    if (!env.GEMINI_API_KEY) return json({ error: 'no GEMINI_API_KEY' }, 500);

    let body;
    try { body = await req.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
    const wantJson = body.json === true; // режим тестів: модель повертає чистий JSON
    const max = Math.max(50, Math.min(wantJson ? 4000 : 1500, parseInt(body.max, 10) || 600));
    const model = String(env.MODEL || 'gemini-flash-latest').replace(/[^\w.\-]/g, '');
    const system = String(body.system || '').slice(0, 12000);
    // Діалог: body.messages = [{role:'user'|'assistant', content}] (до 14 останніх). Старий формат body.prompt теж працює.
    let dialog = [];
    if (Array.isArray(body.messages)) {
      dialog = body.messages.slice(-14)
        .map(m => ({ role: m && m.role === 'assistant' ? 'assistant' : 'user', content: String((m && m.content) || '').slice(0, 3000) }))
        .filter(m => m.content);
      while (dialog.length && dialog[0].role !== 'user') dialog.shift();
      if (!dialog.length || dialog[dialog.length - 1].role !== 'user') return json({ error: 'empty' }, 400);
    } else {
      const prompt = String(body.prompt || '').slice(0, 4000);
      if (!prompt) return json({ error: 'empty' }, 400);
      dialog = [{ role: 'user', content: prompt }];
    }

    const payload = {
      contents: dialog.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      // maxOutputTokens у Gemini включає «думання» моделі, тож додаємо запас, щоб відповідь не обрізалась
      generationConfig: { maxOutputTokens: max + 2048, temperature: wantJson ? 0.8 : 0.6 }
    };
    if (system) payload.systemInstruction = { parts: [{ text: system }] };
    if (wantJson) payload.generationConfig.responseMimeType = 'application/json';

    let r;
    try {
      r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      return json({ error: 'gemini: ' + String((e && e.message) || e).slice(0, 200) }, 502);
    }
    if (r.status === 429) return json({ error: 'rate' }, 429);
    if (!r.ok) {
      let msg = '';
      try { const e = await r.json(); msg = (e && e.error && e.error.message) || ''; } catch (e) {}
      return json({ error: 'gemini ' + r.status + ': ' + String(msg).slice(0, 200) }, 502);
    }
    let d;
    try { d = await r.json(); } catch (e) { return json({ error: 'gemini: bad response' }, 502); }
    const parts = (d && d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || [];
    const text = parts.filter(p => p && !p.thought).map(p => String(p.text || '')).join('').trim();
    return json({ text });
  }
};

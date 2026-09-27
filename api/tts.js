module.exports = async (req, res) => {
  try {
    const text = String(req.query.text || '').trim().slice(0, 180);
    if (!text) return res.status(400).send('missing text');
    const u = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=zh-CN&q='+encodeURIComponent(text);
    const r = await fetch(u,{headers:{'User-Agent':'Mozilla/5.0'}});
    if (!r.ok) return res.status(r.status).send('tts upstream '+r.status);
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type','audio/mpeg');
    res.setHeader('Cache-Control','no-store');
    res.status(200).send(buf);
  } catch (e) { res.status(500).send(String(e && e.message || e)); }
};
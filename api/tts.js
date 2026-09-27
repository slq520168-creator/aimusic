module.exports = async (req, res) => {
  try {
    const text = String(req.query.text || '').trim().slice(0, 500);
    if (!text) return res.status(400).send('missing text');
    const r = await fetch('https://kiprio.com/v1/tts/demo', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({text, lang:'zh-CN', slow:false})
    });
    if (!r.ok) {
      const msg = await r.text();
      return res.status(r.status).send(msg);
    }
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', r.headers.get('content-type') || 'audio/mpeg');
    res.setHeader('Cache-Control','no-store');
    res.status(200).send(buf);
  } catch (e) {
    res.status(500).send(String(e && e.message || e));
  }
};
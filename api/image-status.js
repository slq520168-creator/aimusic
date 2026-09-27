module.exports = async (req, res) => {
  try {
    const id = String(req.query.id || '').trim();
    if (!id) return res.status(400).json({error:'missing id'});
    const check = await fetch('https://aihorde.net/api/v2/generate/check/'+encodeURIComponent(id), {
      headers:{'Client-Agent':'youxuan-ai-video:1.0:https://aimusic-mauve.vercel.app/video.html'}
    });
    const c = await check.json();
    if (!check.ok) return res.status(check.status).json(c);
    if (!c.done) return res.json({done:false, queue_position:c.queue_position, wait_time:c.wait_time, waiting:c.waiting, processing:c.processing});
    const full = await fetch('https://aihorde.net/api/v2/generate/status/'+encodeURIComponent(id), {
      headers:{'Client-Agent':'youxuan-ai-video:1.0:https://aimusic-mauve.vercel.app/video.html'}
    });
    const f = await full.json();
    if (!full.ok) return res.status(full.status).json(f);
    const g = (f.generations||[])[0];
    res.json({done:true, image:g && g.img, model:g && g.model, censored:g && g.censored});
  } catch (e) {
    res.status(500).json({error:String(e && e.message || e)});
  }
};
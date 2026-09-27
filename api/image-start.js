module.exports = async (req, res) => {
  try {
    const prompt = String(req.query.prompt || '').trim();
    if (!prompt) return res.status(400).json({error:'missing prompt'});
    const w = Math.max(256, Math.min(768, Number(req.query.w)||576));
    const h = Math.max(256, Math.min(768, Number(req.query.h)||320));
    const body = {
      prompt,
      params: {
        sampler_name: "k_euler_a",
        cfg_scale: 6.5,
        steps: 20,
        width: w,
        height: h,
        n: 1
      },
      nsfw: false,
      censor_nsfw: true,
      trusted_workers: false,
      slow_workers: true,
      extra_slow_workers: true,
      r2: true,
      shared: false
    };
    const r = await fetch('https://aihorde.net/api/v2/generate/async', {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'apikey':'0000000000',
        'Client-Agent':'youxuan-ai-video:1.0:https://aimusic-mauve.vercel.app/video.html'
      },
      body: JSON.stringify(body)
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(500).json({error:String(e && e.message || e)});
  }
};
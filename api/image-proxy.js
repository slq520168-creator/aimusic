module.exports = async (req,res)=>{
  try{
    const raw=String(req.query.url||'');
    const u=new URL(raw);
    if(u.protocol!=='https:') return res.status(400).send('bad url');
    const r=await fetch(u.toString());
    if(!r.ok) return res.status(r.status).send('image fetch failed');
    const b=Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type',r.headers.get('content-type')||'image/webp');
    res.setHeader('Cache-Control','public, max-age=86400');
    res.status(200).send(b);
  }catch(e){res.status(500).send(String(e&&e.message||e))}
};
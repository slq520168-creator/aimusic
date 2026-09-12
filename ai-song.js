const CFG=window.AIMUSIC_CONFIG;
if(!CFG)throw new Error('AIMUSIC_CONFIG_MISSING');
const {SUPABASE_URL,SUPABASE_KEY,STORAGE_BUCKET,FUNCTIONS}=CFG;
const db=window.AIMUSIC_DB;
if(!db)throw new Error('AIMUSIC_DB_MISSING');
const fn=name=>`${SUPABASE_URL}/functions/v1/${name}`;
const writeModal=document.querySelector('#writeModal');
if(!writeModal) throw new Error('AI_WRITE_MODAL_MISSING');
const sheet=writeModal.querySelector('.sheet');

sheet.innerHTML=`<h3 style="margin:0 0 8px">免费写歌</h3>
<p class="notice" style="margin-top:0">点击新页打开对方网站。本站不接 API、不在服务器生成。登录、额度、下载都在对方站完成。做好后可回本站上传待审核。</p>
<a class="btn" href="https://suno.com" target="_blank" rel="noopener" style="display:block;text-align:center;text-decoration:none;margin:6px 0">Suno · 主入口（每日约10首）</a>
<a class="btn" href="https://boomy.com" target="_blank" rel="noopener" style="display:block;text-align:center;text-decoration:none;margin:6px 0;background:#148a66">Boomy · 额度最多（无限生成）</a>
<a class="btn alt" href="https://soundful.com" target="_blank" rel="noopener" style="display:block;text-align:center;text-decoration:none;margin:6px 0">Soundful · 无限试做（月 1 次 MP3）</a>
<a class="btn alt" href="https://pixabay.com/music/" target="_blank" rel="noopener" style="display:block;text-align:center;text-decoration:none;margin:6px 0">Pixabay Music · 商户安全选曲</a>
<a class="btn alt" href="https://www.flow-music.app" target="_blank" rel="noopener" style="display:block;text-align:center;text-decoration:none;margin:6px 0">Flow Music · 每日补积分</a>
<p class="notice">Suno 免费不能商用。Boomy 变现要付费。Pixabay 非 AI 生成，限制最少。</p>
<button class="btn alt" id="aiClose" style="width:100%;margin-top:6px">关闭</button>`;

const $=s=>sheet.querySelector(s);
$('#aiClose').onclick=()=>writeModal.classList.remove('show');

async function ensureGuest(){
  if(typeof window.AIMUSIC_ENSURE_GUEST!=='function')throw new Error('ENSURE_GUEST_MISSING');
  const g=await window.AIMUSIC_ENSURE_GUEST();
  if(!g?.token)throw new Error('游客身份服务失败');
  return g;
}
async function submitTrack(g,data){
  const r=await fetch(fn(FUNCTIONS.SUBMIT_TRACK),{method:'POST',headers:{'content-type':'application/json','apikey':SUPABASE_KEY},body:JSON.stringify({guest_token:g.token,...data})});
  const j=await r.json().catch(()=>({}));
  if(!r.ok||!j.ok) throw new Error(j.message||j.error||'待审核记录保存失败');
  return j;
}

const ordinarySubmit=document.querySelector('#submit');
if(ordinarySubmit)ordinarySubmit.onclick=async()=>{
  const f=document.querySelector('#file')?.files?.[0],title=document.querySelector('#title')?.value.trim(),artist=document.querySelector('#artist')?.value.trim(),genre=document.querySelector('#genre')?.value||'其他',description=document.querySelector('#description')?.value.trim()||'',box=document.querySelector('#uploadStatus');
  const msg=(t,ok=false)=>{if(box){box.textContent=t;box.className='status show'+(ok?' ok':'')}};
  if(!f||!title||!artist){msg('请填写歌名、创作者并选择音频文件');return}
  if(f.size>15*1024*1024){msg('文件超过 15MB');return}
  ordinarySubmit.disabled=true;msg('正在上传并登记后台待审核…');let path='';
  try{
    const g=await ensureGuest(),ext=(f.name.split('.').pop()||'audio').toLowerCase().replace(/[^a-z0-9]/g,'');path=`submissions/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const up=await db.storage.from(STORAGE_BUCKET).upload(path,f,{cacheControl:'3600',upsert:false,contentType:f.type||undefined});if(up.error)throw up.error;
    let meta;try{meta=await submitTrack(g,{title,artist,genre,description,storage_path:path})}catch(e){await db.storage.from(STORAGE_BUCKET).remove([path]);throw e}
    if(typeof window.AIMUSIC_GUEST_AWARD==='function')await window.AIMUSIC_GUEST_AWARD('upload',meta.id);
    msg('提交成功 ✓ 已进入后台待审核。',true);document.querySelector('#file').value='';
  }catch(e){msg('上传失败：'+(e?.message||'请稍后重试'))}finally{ordinarySubmit.disabled=false}
};

if(new URLSearchParams(location.search).has('g'))history.replaceState(null,'',location.pathname);

const CFG=window.AIMUSIC_CONFIG;
if(!CFG)throw new Error('AIMUSIC_CONFIG_MISSING');
const {SUPABASE_URL,SUPABASE_KEY,STORAGE_BUCKET,FUNCTIONS}=CFG;
const db=window.AIMUSIC_DB;
if(!db)throw new Error('AIMUSIC_DB_MISSING');
const fn=name=>`${SUPABASE_URL}/functions/v1/${name}`;
const writeModal=document.querySelector('#writeModal');
if(!writeModal) throw new Error('AI_WRITE_MODAL_MISSING');
const sheet=writeModal.querySelector('.sheet');

const TOOLS=[
  {id:'suno',name:'Suno 主入口',url:'https://suno.com'},
  {id:'boomy',name:'Boomy 无限',url:'https://boomy.com'},
  {id:'soundful',name:'Soundful',url:'https://soundful.com'},
  {id:'pixabay',name:'Pixabay',url:'https://pixabay.com/music/'},
  {id:'flow',name:'Flow Music',url:'https://www.flow-music.app'}
];

sheet.style.maxHeight='96vh';
sheet.style.height='92vh';
sheet.style.display='flex';
sheet.style.flexDirection='column';
sheet.style.padding='12px';

sheet.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px">
  <h3 style="margin:0;font-size:16px">站内写歌</h3>
  <button class="btn alt" id="aiClose" style="padding:8px 12px;width:auto">关闭</button>
</div>
<div id="aiTabs" style="display:flex;gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:8px"></div>
<iframe id="aiFrame" title="写歌" src="https://suno.com" style="flex:1;width:100%;min-height:62vh;border:0;border-radius:14px;background:#fff" referrerpolicy="no-referrer-when-downgrade" allow="clipboard-write; fullscreen; autoplay"></iframe>`;

const tabs=sheet.querySelector('#aiTabs');
const frame=sheet.querySelector('#aiFrame');
TOOLS.forEach((t,i)=>{
  const b=document.createElement('button');
  b.className='btn'+(i?' alt':'');
  b.type='button';
  b.textContent=t.name;
  b.style.cssText='flex:0 0 auto;padding:8px 10px;font-size:12px;white-space:nowrap';
  b.onclick=()=>{
    tabs.querySelectorAll('button').forEach(x=>{x.className='btn alt';x.style.cssText=b.style.cssText});
    b.className='btn';
    frame.src=t.url;
  };
  tabs.appendChild(b);
});

sheet.querySelector('#aiClose').onclick=()=>writeModal.classList.remove('show');

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

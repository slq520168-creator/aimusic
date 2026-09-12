const CFG=window.AIMUSIC_CONFIG;
if(!CFG)throw new Error('AIMUSIC_CONFIG_MISSING');
const {SUPABASE_URL,SUPABASE_KEY,STORAGE_BUCKET,FUNCTIONS}=CFG;
const db=window.AIMUSIC_DB;
if(!db)throw new Error('AIMUSIC_DB_MISSING');
const fn=name=>`${SUPABASE_URL}/functions/v1/${name}`;
const writeModal=document.querySelector('#writeModal');
if(!writeModal) throw new Error('AI_WRITE_MODAL_MISSING');
const sheet=writeModal.querySelector('.sheet');
const ACE='https://ace-step-ace-step-v1-5.hf.space';
const MGEN='https://facebook-musicgen.hf.space';

sheet.removeAttribute('style');
sheet.innerHTML=`<h3 style="margin:0 0 10px">AI 写歌</h3>
<input class="field" id="aiTheme" maxlength="300" placeholder="歌曲主题，例如：离开家乡后的第一个夜晚">
<div class="row"><select class="field" id="aiMood"><option>温暖</option><option>伤感</option><option>励志</option><option>浪漫</option><option>自由</option><option>热烈</option></select><select class="field" id="aiStyle"><option>流行</option><option>民谣</option><option>电子</option><option>说唱</option><option>摇滚</option><option>R&B</option><option>国风</option><option>纯音乐氛围</option></select></div>
<div class="row"><select class="field" id="aiLanguage"><option>中文</option><option>English</option></select><select class="field" id="aiVoice"><option>女声</option><option>男声</option><option>男女合唱</option><option>自然人声</option></select></div>
<input class="field" id="aiArtist" maxlength="80" placeholder="创作者名称">
<textarea class="field" id="aiLyrics" rows="4" style="height:110px;min-height:110px;resize:none" placeholder="可选歌词，不填也能直接生成"></textarea>
<input class="field" id="aiTitle" maxlength="120" placeholder="歌曲名称">
<button class="btn" id="makeSong" style="width:100%;margin:4px 0 6px">生成歌曲</button>
<div id="aiStatus" class="status"></div>
<div id="generatedBox" class="hidden" style="margin-top:10px"><audio id="generatedAudio" controls style="width:100%"></audio><div class="row" style="margin-top:8px"><button class="btn alt" id="regenerate">重新生成</button><button class="btn" id="saveGenerated">保存到待审核</button></div></div>
<button class="btn alt" id="aiClose" style="width:100%;margin-top:9px">关闭</button>`;

const $=s=>sheet.querySelector(s);
const status=(text,ok=false)=>{const e=$('#aiStatus');e.textContent=text;e.className='status show'+(ok?' ok':'')};
$('#aiClose').onclick=()=>writeModal.classList.remove('show');
let generatedBlob=null;

function fileUrl(x,base){
  function abs(u){
    if(!u)return '';
    u=String(u);
    if(/^https?:/i.test(u))return u;
    if(u.indexOf('//')===0)return location.protocol+u;
    if(base&&u.charAt(0)==='/')return base+u;
    if(base&&u.indexOf('gradio_api/file')===-1)return base+'/gradio_api/file='+u;
    return u;
  }
  if(!x)return '';
  if(typeof x==='string'){
    if(/^https?:/i.test(x)||/\.(mp3|wav|flac|ogg|m4a)(\?|$)/i.test(x))return abs(x);
    return '';
  }
  if(Array.isArray(x)){for(let i=0;i<x.length;i++){const u=fileUrl(x[i],base);if(u)return u}return ''}
  if(typeof x==='object')return abs(x.url||'')||abs(x.path||'')||fileUrl(x.value,base);
  return '';
}
async function readSse(res,onInfo){
  const reader=res.body.getReader(),dec=new TextDecoder();
  let buf='',result=null,lastErr=null;
  while(true){
    const chunk=await reader.read();
    if(chunk.done)break;
    buf+=dec.decode(chunk.value,{stream:true});
    const parts=buf.split('\n\n');buf=parts.pop();
    for(let i=0;i<parts.length;i++){
      let event='message',dataStr='';
      parts[i].split('\n').forEach(line=>{
        if(line.indexOf('event:')===0)event=line.slice(6).trim();
        else if(line.indexOf('data:')===0)dataStr+=line.slice(5).trim();
      });
      if(event==='error'){lastErr=String(dataStr||'').replace(/^"|"$/g,'');continue}
      if(!dataStr)continue;
      let msg;try{msg=JSON.parse(dataStr)}catch{continue}
      if(msg.msg==='estimation'&&onInfo)onInfo('排队第 '+(msg.rank||0)+' 位');
      if(msg.msg==='process_starts'&&onInfo)onInfo('模型正在跑…');
      if(msg.msg==='progress'&&onInfo)onInfo('生成中…');
      if(msg.msg==='process_completed'){
        const err=msg.output&&msg.output.error;
        if(msg.success===false||err)lastErr=String(err||msg.title||'失败');
        else result=(msg.output&&msg.output.data)||[];
      }
    }
    if(result)return result;
  }
  if(result)return result;
  throw new Error(lastErr||'没返回结果');
}
async function runGradio(base,apiName,fnIndex,data,onInfo){
  const session=Math.random().toString(36).slice(2)+Date.now().toString(36);
  const join=await fetch(base+'/gradio_api/queue/join',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({data,fn_index:fnIndex,session_hash:session,api_name:apiName})
  });
  const j=await join.json();
  if(!join.ok||!j.event_id)throw new Error(j.error||j.detail||j.message||('排队失败 '+join.status));
  const res=await fetch(base+'/gradio_api/queue/data?session_hash='+encodeURIComponent(session),{headers:{Accept:'text/event-stream'}});
  if(!res.ok||!res.body)throw new Error('连接失败');
  return readSse(res,onInfo);
}
function aceData(prompt,lang){
  const lg=lang==='English'?'en':'zh';
  return [
    'acestep-v15-xl-turbo','simple',prompt,lg,
    prompt,'',0,'','',lg,
    8,7.0,true,'-1',null,
    -1,2,null,null,0.0,
    -1,'Fill the audio semantic mask based on the given conditions:',1.0,'text2music',false,
    0.0,1.0,3.0,'ode','',
    'mp3',0.85,true,2.0,0,
    0.9,'NO USER INPUT',true,true,true,
    null,
    false,true,false,false,0.5,
    8,null,[],false,
    null,null,null,null
  ];
}
function niceErr(e){
  const s=String(e&&e.message||e||'');
  if(/needed:|didn\'t receive enough|Internal Gradio/i.test(s))return '对面模型正在繁忙或升级，请再点一次';
  if(/ZeroGPU|quota|queue/i.test(s))return '免费机器排满，请稍等再试';
  return s.slice(0,120);
}
async function blobFromUrl(url){
  const r=await fetch(url);
  if(!r.ok)throw new Error('音频下载失败');
  const b=await r.blob();
  if(!b.size)throw new Error('空音频');
  return b;
}
function buildPrompt(){
  const theme=$('#aiTheme').value.trim();
  const lyrics=$('#aiLyrics').value.trim();
  const mood=$('#aiMood').value,style=$('#aiStyle').value,lang=$('#aiLanguage').value,voice=$('#aiVoice').value;
  if(theme.length<2&&lyrics.length<8)throw new Error('先写主题或歌词');
  return [style,mood,voice,lang,theme,lyrics].filter(Boolean).join('，');
}

async function makeFullSong(){
  const btn=$('#makeSong');
  btn.disabled=true;$('#generatedBox').classList.add('hidden');generatedBlob=null;
  try{
    const prompt=buildPrompt();
    const lang=$('#aiLanguage').value;
    status('ACE-Step 排队中…');
    let url='';
    try{
      const data=await runGradio(ACE,'/generation_wrapper',77,aceData(prompt,lang),t=>status('ACE-Step · '+t));
      url=fileUrl(data,ACE);
    }catch(e){
      status('ACE 忙，改走 MusicGen…');
      const data2=await runGradio(MGEN,'/predict_batched',0,[prompt,null],t=>status('MusicGen · '+t));
      url=fileUrl(data2,MGEN);
    }
    if(!url)throw new Error('没返回音频');
    generatedBlob=await blobFromUrl(url);
    $('#generatedAudio').src=URL.createObjectURL(generatedBlob);
    $('#generatedBox').classList.remove('hidden');
    if(!$('#aiTitle').value.trim())$('#aiTitle').value=$('#aiTheme').value.trim().slice(0,40)||'未命名';
    status('生成成功，先试听。',true);
  }catch(e){status('生成失败：'+niceErr(e))}finally{btn.disabled=false}
}
$('#makeSong').onclick=makeFullSong;$('#regenerate').onclick=makeFullSong;

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

$('#saveGenerated').onclick=async()=>{
  const btn=$('#saveGenerated'),title=$('#aiTitle').value.trim(),artist=$('#aiArtist').value.trim();
  if(!generatedBlob){status('请先生成');return}
  if(!title||!artist){status('请填歌名和创作者');return}
  btn.disabled=true;status('正在保存…');
  const path=`ai/${Date.now()}-${crypto.randomUUID()}.mp3`;
  try{
    const g=await ensureGuest();
    const up=await db.storage.from(STORAGE_BUCKET).upload(path,generatedBlob,{cacheControl:'3600',upsert:false,contentType:generatedBlob.type||'audio/mpeg'});if(up.error)throw up.error;
    try{const meta=await submitTrack(g,{title,artist,genre:$('#aiStyle').value,description:'AI原创 · '+$('#aiMood').value,storage_path:path});if(typeof window.AIMUSIC_GUEST_AWARD==='function')await window.AIMUSIC_GUEST_AWARD('upload',meta.id)}
    catch(e){await db.storage.from(STORAGE_BUCKET).remove([path]);throw e}
    status('保存成功，已进待审核。',true);
  }catch(e){status('保存失败：'+(e.message||e))}finally{btn.disabled=false}
};

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

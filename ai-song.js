import { Client } from 'https://cdn.jsdelivr.net/npm/@gradio/client/dist/index.min.js';

const SUPABASE_URL='https://afzcohtnljnmucrkgcaz.supabase.co';
const SUPABASE_KEY='sb_publishable_EqF-kTNRsSZWhUE8LWB8DQ_UNkTjImv';
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const writeModal=document.querySelector('#writeModal');
if(!writeModal) throw new Error('AI_WRITE_MODAL_MISSING');
const sheet=writeModal.querySelector('.sheet');

sheet.innerHTML=`<h3 style="margin:0 0 10px">AI 写歌</h3>
<input class="field" id="aiTheme" maxlength="300" placeholder="歌曲主题，例如：离开家乡后的第一个夜晚">
<div class="row"><select class="field" id="aiMood"><option>温暖</option><option>伤感</option><option>励志</option><option>浪漫</option><option>自由</option><option>热烈</option></select><select class="field" id="aiStyle"><option>流行</option><option>民谣</option><option>电子</option><option>说唱</option><option>摇滚</option><option>R&B</option><option>国风</option><option>纯音乐氛围</option></select></div>
<div class="row"><select class="field" id="aiLanguage"><option>中文</option><option>English</option></select><select class="field" id="aiVoice"><option>女声</option><option>男声</option><option>男女合唱</option><option>自然人声</option></select></div>
<input class="field" id="aiArtist" maxlength="80" placeholder="创作者名称">
<button class="btn" id="makeLyrics" style="width:100%;margin:4px 0 6px">1. AI 生成歌词</button>
<textarea class="field" id="aiLyrics" rows="5" style="height:126px;min-height:126px;max-height:126px;overflow-y:auto;resize:none" placeholder="AI 歌词会出现在这里，也可以自己修改或直接粘贴原创歌词"></textarea>
<input class="field" id="aiTitle" maxlength="120" placeholder="歌曲名称">
<button class="btn" id="makeSong" style="width:100%;margin:4px 0 6px">2. 生成完整歌曲</button>
<p class="notice" style="margin:5px 0">人声歌曲优先走服务器认证通道，失败自动切公开备用节点；纯音乐才使用 Stability。</p>
<div id="aiStatus" class="status"></div>
<div id="generatedBox" class="hidden" style="margin-top:10px"><audio id="generatedAudio" controls style="width:100%"></audio><div class="row" style="margin-top:8px"><button class="btn alt" id="regenerate">重新生成</button><button class="btn" id="saveGenerated">3. 保存到待审核</button></div></div>
<button class="btn alt" id="aiClose" style="width:100%;margin-top:9px">关闭</button>`;

const $=s=>sheet.querySelector(s);
const status=(text,ok=false)=>{const e=$('#aiStatus');e.textContent=text;e.className='status show'+(ok?' ok':'')};
$('#aiClose').onclick=()=>writeModal.classList.remove('show');
let generatedBlob=null;
let generatedKind='vocal';

async function guestApi(body){
  const r=await fetch(SUPABASE_URL+'/functions/v1/aimusic-guest-points',{method:'POST',headers:{'content-type':'application/json','apikey':SUPABASE_KEY},body:JSON.stringify(body)});
  const j=await r.json();
  if(!r.ok||!j.ok) throw new Error(j.message||j.error||'游客身份服务失败');
  return j;
}
async function ensureGuest(){
  let token=localStorage.getItem('aimusic_guest_token')||'';
  if(token){try{const s=await guestApi({action:'status',token});return {token,...s}}catch{localStorage.removeItem('aimusic_guest_token')}}
  const j=await guestApi({action:'issue'});token=j.token;localStorage.setItem('aimusic_guest_token',token);return {token,...j};
}
async function submitTrack(g,data){
  const r=await fetch(`${SUPABASE_URL}/functions/v1/aimusic-submit-track`,{method:'POST',headers:{'content-type':'application/json','apikey':SUPABASE_KEY},body:JSON.stringify({guest_token:g.token,...data})});
  const j=await r.json().catch(()=>({}));
  if(!r.ok||!j.ok) throw new Error(j.message||j.error||'待审核记录保存失败');
  return j;
}
function timeout(promise,ms,label){return Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(label||'通道超时')),ms))])}

$('#makeLyrics').onclick=async()=>{
  const btn=$('#makeLyrics'),theme=$('#aiTheme').value.trim();
  if(theme.length<2){status('先写歌曲主题');return}
  btn.disabled=true;status('AI 正在写完整歌词…');
  try{
    const r=await fetch(`${SUPABASE_URL}/functions/v1/aimusic-lyrics`,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY},body:JSON.stringify({theme,mood:$('#aiMood').value,style:$('#aiStyle').value,language:$('#aiLanguage').value,voice:$('#aiVoice').value})});
    const j=await r.json();
    if(!r.ok||!j?.ok) throw new Error(j?.message||j?.error||'歌词生成失败');
    $('#aiLyrics').value=j.lyrics;$('#aiTitle').value=j.title||'';
    status('歌词已生成 ✓ 下面直接生成完整歌曲。',true);
    setTimeout(()=>$('#makeSong').scrollIntoView({behavior:'smooth',block:'center'}),80);
  }catch(e){status('歌词生成失败：'+(e?.message||'请稍后重试'))}finally{btn.disabled=false}
};

async function generateVocalServer(lyrics,style,mood,voice){
  const g=await ensureGuest();
  status('正在使用服务器人声主通道生成…');
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),115000);
  try{
    const r=await fetch(`${SUPABASE_URL}/functions/v1/aimusic-vocal-generate`,{method:'POST',headers:{'content-type':'application/json','apikey':SUPABASE_KEY},body:JSON.stringify({guest_token:g.token,lyrics,style,mood,voice,language:$('#aiLanguage').value}),signal:ctrl.signal});
    if(!r.ok){
      let msg='服务器人声通道不可用';
      try{const j=await r.json();msg=j?.message||j?.error||msg}catch{}
      throw new Error(msg);
    }
    const blob=await r.blob();
    if(!blob.size) throw new Error('服务器人声通道返回空音频');
    return blob;
  }finally{clearTimeout(timer)}
}

function extractAudioUrl(v,d=0){
  if(d>7||v==null)return'';
  if(typeof v==='string'){if(/^https?:\/\//i.test(v)||/\.(mp3|wav|flac|ogg|m4a)(\?|$)/i.test(v))return v;return''}
  if(Array.isArray(v)){for(const x of v){const u=extractAudioUrl(x,d+1);if(u)return u}return''}
  if(typeof v==='object'){for(const k of ['url','path','audio','file','value','data','output']){if(k in v){const u=extractAudioUrl(v[k],d+1);if(u)return u}}for(const x of Object.values(v)){const u=extractAudioUrl(x,d+1);if(u)return u}}
  return'';
}
async function blobFromResult(result,label){
  const u=extractAudioUrl(result?.data??result);if(!u)throw new Error(label+'没有返回音频');
  const r=await fetch(u);if(!r.ok)throw new Error(label+'音频读取失败');
  const blob=await r.blob();if(!blob.size)throw new Error(label+'返回空音频');return blob;
}
function vocalPrompt(style,mood,voice){const lang=$('#aiLanguage').value==='中文'?'Chinese Mandarin':'English';return `${style}, ${mood}, ${voice}, ${lang} vocal song, clear lead vocals, accurate lyric singing, polished studio production, full arrangement`}

async function generateCommunityAce(lyrics,style,mood,voice){
  status('服务器通道不可用，正在尝试 ACE-Step 公开备用…');
  const work=(async()=>{
    const app=await Client.connect('timefractal/ACE-Step-Turbo-Music-Gen',{events:['data','status']});
    const info=await app.view_api(),eps=info?.named_endpoints||{},names=Object.keys(eps);
    let endpoint=names.find(k=>{const labels=(eps[k]?.parameters||[]).map(x=>String(x.label||'').toLowerCase());return labels.some(x=>x.includes('lyrics'))&&labels.some(x=>x.includes('prompt')||x.includes('description'))})||names.find(k=>/generate/i.test(k))||names[0]||'/generate_music';
    const seed=Math.floor(Math.random()*2147483646)+1;
    let result;
    try{result=await app.predict(endpoint,[vocalPrompt(style,mood,voice),lyrics,60,seed,8])}catch(e){if(endpoint!=='/generate_music')result=await app.predict('/generate_music',[vocalPrompt(style,mood,voice),lyrics,60,seed,8]);else throw e}
    return blobFromResult(result,'ACE-Step 公开备用');
  })();
  return timeout(work,90000,'ACE-Step 公开备用超时');
}

async function generateDiffRhythm(lyrics,style,mood,voice){
  status('ACE-Step 备用不可用，正在尝试最后人声节点…');
  const work=(async()=>{
    const app=await Client.connect('ASLP-lab/DiffRhythm2',{events:['data','status']});
    const info=await app.view_api();let endpoint=Object.keys(info?.named_endpoints||{}).find(k=>(info.named_endpoints[k]?.parameters||[]).some(x=>String(x.label||'').toLowerCase().includes('lyrics')))||Object.keys(info?.named_endpoints||{})[0]||'/predict';
    const result=await app.predict(endpoint,[lyrics,'text',null,vocalPrompt(style,mood,voice),0,true,16,1.3,'mp3','euler']);
    return blobFromResult(result,'DiffRhythm');
  })();
  return timeout(work,90000,'DiffRhythm 人声生成超时');
}

async function generateInstrumental(style,mood){
  const g=await ensureGuest();status('正在使用 Stability 纯音乐通道生成…');
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),100000);
  try{
    const r=await fetch(`${SUPABASE_URL}/functions/v1/aimusic-generate-audio`,{method:'POST',headers:{'content-type':'application/json','apikey':SUPABASE_KEY},body:JSON.stringify({guest_token:g.token,lyrics:'',theme:$('#aiTheme').value.trim(),style,mood,voice:'instrumental',duration:180}),signal:ctrl.signal});
    if(!r.ok){let msg='Stability 不可用';try{const j=await r.json();msg=j?.message||j?.error||msg}catch{}throw new Error(msg)}
    const blob=await r.blob();if(!blob.size)throw new Error('Stability 返回空音频');return blob;
  }finally{clearTimeout(timer)}
}

async function makeFullSong(){
  const lyrics=$('#aiLyrics').value.trim(),style=$('#aiStyle').value,mood=$('#aiMood').value,voice=$('#aiVoice').value,isInstrumental=style==='纯音乐氛围';
  if(!isInstrumental&&lyrics.length<40){status('请先生成或填写完整歌词');return}
  const btn=$('#makeSong');btn.disabled=true;$('#generatedBox').classList.add('hidden');generatedBlob=null;generatedKind=isInstrumental?'instrumental':'vocal';
  const errors=[];
  try{
    if(isInstrumental){generatedBlob=await generateInstrumental(style,mood)}else{
      try{generatedBlob=await generateVocalServer(lyrics,style,mood,voice)}catch(e1){
        const m1=e1?.message||String(e1);errors.push(m1);console.warn(m1);
        if(/zero.?gpu|quota|额度|limit/i.test(m1)){status('免费人声额度已满，正在尝试最后公开备用节点…')}
        try{generatedBlob=await generateCommunityAce(lyrics,style,mood,voice)}catch(e2){
          const m2=e2?.message||String(e2);errors.push(m2);console.warn(m2);
          generatedBlob=await generateDiffRhythm(lyrics,style,mood,voice);
        }
      }
    }
    const local=URL.createObjectURL(generatedBlob);$('#generatedAudio').src=local;$('#generatedBox').classList.remove('hidden');
    status(isInstrumental?'纯音乐生成成功 ✓ 请先试听。':'人声完整歌曲生成成功 ✓ 请先试听。',true);
    setTimeout(()=>$('#generatedBox').scrollIntoView({behavior:'smooth',block:'center'}),80);
  }catch(e){const m=e?.message||String(e);errors.push(m);status('当前歌曲生成节点暂时不可用：'+errors.filter(Boolean).slice(-2).join('；'))}finally{btn.disabled=false}
}
$('#makeSong').onclick=makeFullSong;$('#regenerate').onclick=makeFullSong;

$('#saveGenerated').onclick=async()=>{
  const btn=$('#saveGenerated'),title=$('#aiTitle').value.trim(),artist=$('#aiArtist').value.trim();
  if(!generatedBlob){status('请先生成完整歌曲');return}
  if(!title||!artist){status('请填写歌曲名称和创作者名称');return}
  btn.disabled=true;status('正在保存歌曲并登记后台待审核…');
  const path=`ai/${Date.now()}-${crypto.randomUUID()}.mp3`;
  try{
    const g=await ensureGuest();
    const up=await db.storage.from('aimusic-audio').upload(path,generatedBlob,{cacheControl:'3600',upsert:false,contentType:generatedBlob.type||'audio/mpeg'});if(up.error)throw up.error;
    let meta;
    try{meta=await submitTrack(g,{title,artist,genre:$('#aiStyle').value,description:`AI原创 · ${generatedKind==='vocal'?'人声完整歌曲':'纯音乐'} · ${$('#aiMood').value} · ${$('#aiVoice').value}`,storage_path:path})}catch(e){await db.storage.from('aimusic-audio').remove([path]);throw e}
    if(typeof window.AIMUSIC_GUEST_AWARD==='function')await window.AIMUSIC_GUEST_AWARD('upload',meta.id);
    status('保存成功 ✓ 后台待审核已登记。',true);
  }catch(e){status('保存失败：'+(e?.message||'请稍后重试'))}finally{btn.disabled=false}
};

// 覆盖首页旧普通上传逻辑：文件上传后统一由服务器登记 pending，避免 RLS INSERT...RETURNING 回滚。
const ordinarySubmit=document.querySelector('#submit');
if(ordinarySubmit)ordinarySubmit.onclick=async()=>{
  const f=document.querySelector('#file')?.files?.[0],title=document.querySelector('#title')?.value.trim(),artist=document.querySelector('#artist')?.value.trim(),genre=document.querySelector('#genre')?.value||'其他',description=document.querySelector('#description')?.value.trim()||'',box=document.querySelector('#uploadStatus');
  const msg=(t,ok=false)=>{if(box){box.textContent=t;box.className='status show'+(ok?' ok':'')}};
  if(!f||!title||!artist){msg('请填写歌名、创作者并选择音频文件');return}
  if(f.size>15*1024*1024){msg('文件超过 15MB');return}
  ordinarySubmit.disabled=true;msg('正在上传并登记后台待审核…');let path='';
  try{
    const g=await ensureGuest(),ext=(f.name.split('.').pop()||'audio').toLowerCase().replace(/[^a-z0-9]/g,'');path=`submissions/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const up=await db.storage.from('aimusic-audio').upload(path,f,{cacheControl:'3600',upsert:false,contentType:f.type||undefined});if(up.error)throw up.error;
    let meta;try{meta=await submitTrack(g,{title,artist,genre,description,storage_path:path})}catch(e){await db.storage.from('aimusic-audio').remove([path]);throw e}
    if(typeof window.AIMUSIC_GUEST_AWARD==='function')await window.AIMUSIC_GUEST_AWARD('upload',meta.id);
    msg('提交成功 ✓ 已进入后台待审核。',true);document.querySelector('#file').value='';
  }catch(e){msg('上传失败：'+(e?.message||'请稍后重试'))}finally{ordinarySubmit.disabled=false}
};

const pointsBtn=document.querySelector('#pointsBtn'),pointsModal=document.querySelector('#pointsModal'),guestCode=document.querySelector('#guestCode');
if(guestCode)guestCode.textContent='游客积分会自动保存在当前设备。注册正式账号后可合并兑换。';
if(pointsBtn)pointsBtn.onclick=()=>{if(guestCode)guestCode.textContent='游客积分会自动保存在当前设备。注册正式账号后可合并兑换。';pointsModal?.classList.add('show')};
if(new URLSearchParams(location.search).has('g'))history.replaceState(null,'',location.pathname);

import { Client } from 'https://cdn.jsdelivr.net/npm/@gradio/client/dist/index.min.js';

const SUPABASE_URL='https://afzcohtnljnmucrkgcaz.supabase.co';
const SUPABASE_KEY='sb_publishable_EqF-kTNRsSZWhUE8LWB8DQ_UNkTjImv';
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const writeModal=document.querySelector('#writeModal');
if(!writeModal) throw new Error('AI_WRITE_MODAL_MISSING');
const sheet=writeModal.querySelector('.sheet');
sheet.innerHTML=`<h3>AI 写歌</h3>
<input class="field" id="aiTheme" maxlength="300" placeholder="歌曲主题，例如：离开家乡后的第一个夜晚">
<div class="row"><select class="field" id="aiMood"><option>温暖</option><option>伤感</option><option>励志</option><option>浪漫</option><option>自由</option><option>热烈</option></select><select class="field" id="aiStyle"><option>流行</option><option>民谣</option><option>电子</option><option>说唱</option><option>摇滚</option><option>R&B</option><option>国风</option><option>纯音乐氛围</option></select></div>
<div class="row"><select class="field" id="aiLanguage"><option>中文</option><option>English</option></select><select class="field" id="aiVoice"><option>女声</option><option>男声</option><option>男女合唱</option><option>自然人声</option></select></div>
<input class="field" id="aiArtist" maxlength="80" placeholder="创作者名称">
<div class="row"><button class="btn alt close" id="aiClose">取消</button><button class="btn" id="makeLyrics">1. AI 生成歌词</button></div>
<textarea class="field" id="aiLyrics" rows="12" placeholder="AI歌词会出现在这里，也可以自己修改或直接粘贴原创歌词"></textarea>
<input class="field" id="aiTitle" maxlength="120" placeholder="歌曲名称">
<p class="notice">生成完成后保存到待审核，并按上传作品计算积分。免费 GPU 繁忙时可能排队。</p>
<div id="aiStatus" class="status"></div>
<button class="btn" id="makeSong" style="width:100%;margin-top:10px">2. 生成完整歌曲</button>
<div id="generatedBox" class="hidden" style="margin-top:12px"><audio id="generatedAudio" controls style="width:100%"></audio><div class="row"><button class="btn alt" id="regenerate">重新生成</button><button class="btn" id="saveGenerated">3. 保存到待审核</button></div></div>`;

const $=s=>sheet.querySelector(s);
const status=(text,ok=false)=>{const e=$('#aiStatus');e.textContent=text;e.className='status show'+(ok?' ok':'')};
$('#aiClose').onclick=()=>writeModal.classList.remove('show');
let generatedBlob=null;

async function guestApi(body){const r=await fetch(SUPABASE_URL+'/functions/v1/aimusic-guest-points',{method:'POST',headers:{'content-type':'application/json','apikey':SUPABASE_KEY},body:JSON.stringify(body)});const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.message||j.error||'游客身份服务失败');return j}
async function ensureGuest(){let token=localStorage.getItem('aimusic_guest_token')||'';if(token){try{const s=await guestApi({action:'status',token});return {token,...s}}catch{localStorage.removeItem('aimusic_guest_token')}}const j=await guestApi({action:'issue'});token=j.token;localStorage.setItem('aimusic_guest_token',token);return {token,...j}}

$('#makeLyrics').onclick=async()=>{
 const btn=$('#makeLyrics'),theme=$('#aiTheme').value.trim(); if(theme.length<2){status('先写歌曲主题');return}
 btn.disabled=true; status('AI 正在写完整歌词…');
 try{
  const r=await fetch(`${SUPABASE_URL}/functions/v1/aimusic-lyrics`,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY},body:JSON.stringify({theme,mood:$('#aiMood').value,style:$('#aiStyle').value,language:$('#aiLanguage').value,voice:$('#aiVoice').value})});
  const j=await r.json(); if(!r.ok||!j?.ok)throw new Error(j?.message||j?.error||'歌词生成失败');
  $('#aiLyrics').value=j.lyrics; $('#aiTitle').value=j.title||''; status('歌词已生成 ✓ 可以修改后再生成歌曲。',true);
 }catch(e){status('歌词生成失败：'+(e?.message||'请稍后重试'))}finally{btn.disabled=false}
};

async function makeFullSong(){
 const lyrics=$('#aiLyrics').value.trim(),style=$('#aiStyle').value,mood=$('#aiMood').value,voice=$('#aiVoice').value;
 if(lyrics.length<40){status('请先生成或填写完整歌词');return}
 const btn=$('#makeSong'); btn.disabled=true; $('#generatedBox').classList.add('hidden'); generatedBlob=null;
 status('正在连接免费歌曲生成 GPU…');
 try{
  const app=await Client.connect('ASLP-lab/DiffRhythm2',{events:['data','status']});
  const info=await app.view_api();
  let endpoint=Object.keys(info?.named_endpoints||{}).find(k=>{const p=info.named_endpoints[k]?.parameters||[];return p.some(x=>String(x.label||'').toLowerCase().includes('lyrics'))})||Object.keys(info?.named_endpoints||{})[0];
  if(!endpoint) endpoint='/predict';
  const payload=[lyrics,'text',null,`${style}, ${mood}, ${voice}, polished original song`,0,true,16,1.3,'mp3','euler'];
  status('已进入歌曲生成队列，请保持页面打开…');
  const result=await app.predict(endpoint,payload);
  const out=Array.isArray(result?.data)?result.data[0]:result?.data;
  const url=typeof out==='string'?out:(out?.url||out?.path);
  if(!url)throw new Error('生成服务没有返回音频');
  const audioRes=await fetch(url); if(!audioRes.ok)throw new Error('生成音频读取失败');
  generatedBlob=await audioRes.blob(); if(!generatedBlob.size)throw new Error('生成音频为空');
  const local=URL.createObjectURL(generatedBlob); $('#generatedAudio').src=local; $('#generatedBox').classList.remove('hidden'); status('完整歌曲生成成功 ✓ 先试听，满意后保存。',true);
 }catch(e){console.error(e);status('歌曲生成失败：'+(e?.message||'免费通道繁忙，请稍后重试'))}finally{btn.disabled=false}
}
$('#makeSong').onclick=makeFullSong; $('#regenerate').onclick=makeFullSong;

$('#saveGenerated').onclick=async()=>{
 const btn=$('#saveGenerated'),title=$('#aiTitle').value.trim(),artist=$('#aiArtist').value.trim(); if(!generatedBlob){status('请先生成完整歌曲');return} if(!title||!artist){status('请填写歌曲名称和创作者名称');return}
 btn.disabled=true; status('正在保存歌曲到云端待审核…');
 const path=`ai/${Date.now()}-${crypto.randomUUID()}.mp3`;
 try{
  const g=await ensureGuest();
  const up=await db.storage.from('aimusic-audio').upload(path,generatedBlob,{cacheControl:'3600',upsert:false,contentType:'audio/mpeg'}); if(up.error)throw up.error;
  const meta=await db.from('aimusic_tracks').insert({title,artist,genre:$('#aiStyle').value,description:`AI原创 · ${$('#aiMood').value} · ${$('#aiVoice').value}`,storage_path:path,status:'pending',plays:0,guest_id:g.guest_id}).select('id').single();
  if(meta.error){await db.storage.from('aimusic-audio').remove([path]);throw meta.error}
  if(typeof window.AIMUSIC_GUEST_AWARD==='function')await window.AIMUSIC_GUEST_AWARD('upload',meta.data.id);
  status('保存成功 ✓ 已进入待审核，并已记录上传积分。',true);
 }catch(e){console.error(e);status('保存失败：'+(e?.message||'请稍后重试'))}finally{btn.disabled=false}
};

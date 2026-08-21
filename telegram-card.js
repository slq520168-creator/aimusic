(function(){
  if(!window.AIMUSIC_IS_TELEGRAM)return;

  function boot(){
    const tg=window.Telegram?.WebApp;
    if(!tg)return;
    let tries=0;
    const wait=()=>{
      tries++;
      if(typeof db==='undefined'||typeof STORAGE_BUCKET==='undefined'){
        if(tries<80)setTimeout(wait,100);
        return;
      }
      build(tg);
    };
    wait();
  }

  function build(tg){
    document.querySelector('#tgCompactPlayer')?.remove();
    document.querySelector('#tgBetterCard')?.remove();
    document.documentElement.classList.add('tg-compact-mode');

    const style=document.createElement('style');
    style.id='tgBetterCardStyle';
    style.textContent=`
      .tg-compact-mode body{margin:0!important;min-height:100%!important;overflow:hidden!important;background:var(--tg-theme-bg-color,#f3f4f8)!important}
      .tg-compact-mode body>.app,.tg-compact-mode body>.dock,.tg-compact-mode body>.modal,.tg-compact-mode body>#toast{display:none!important}
      #tgBetterCard{height:calc(var(--tg-viewport-stable-height,100vh) - 10px);max-height:680px;min-height:420px;padding:10px 10px max(12px,var(--tg-content-safe-area-inset-bottom,env(safe-area-inset-bottom)));font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden}
      #tgBetterInner{height:100%;display:flex;flex-direction:column;gap:10px;padding:12px;border-radius:22px;background:var(--tg-theme-secondary-bg-color,#fff);border:1px solid var(--tg-theme-section-separator-color,#e5e8ef);box-shadow:0 10px 30px #0000000d}
      .tgHead{display:flex;align-items:center;justify-content:space-between;gap:10px}.tgBrand{font-size:13px;font-weight:850;color:var(--tg-theme-hint-color,#717887)}.tgCount{font-size:11px;color:var(--tg-theme-hint-color,#8b91a0)}
      .tgPlayer{display:grid;grid-template-columns:58px minmax(0,1fr) auto;gap:10px;align-items:center;padding:12px;border-radius:18px;background:var(--tg-theme-bg-color,#f5f6fa)}
      .tgCover{width:58px;height:58px;border-radius:16px;display:grid;place-items:center;background:linear-gradient(135deg,#7257ed,#5d7df5);color:#fff;font-size:27px;font-weight:900}.tgMeta{min-width:0}.tgTitle{font-size:17px;font-weight:900;color:var(--tg-theme-text-color,#171a22);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tgSub{font-size:11px;color:var(--tg-theme-hint-color,#8a90a0);margin-top:5px}.tgCtl{display:flex;gap:5px}.tgCtl button{width:38px;height:38px;border:0;border-radius:50%;background:var(--tg-theme-secondary-bg-color,#fff);color:var(--tg-theme-button-color,#2481cc);font-size:17px;font-weight:900}.tgCtl .main{background:var(--tg-theme-button-color,#2481cc);color:var(--tg-theme-button-text-color,#fff)}
      .tgProgress{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;font-size:10px;color:var(--tg-theme-hint-color,#8a90a0);padding:0 3px}.tgProgress input{width:100%;accent-color:var(--tg-theme-button-color,#2481cc)}
      .tgActions{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.tgActions button{border:1px solid var(--tg-theme-section-separator-color,#e4e7ee);background:var(--tg-theme-bg-color,#f7f8fb);color:var(--tg-theme-text-color,#171a22);border-radius:13px;padding:10px 2px;font-size:12px;font-weight:850}
      .tgListTitle{font-size:12px;font-weight:850;color:var(--tg-theme-hint-color,#737989);padding:1px 2px}.tgTracks{flex:1;min-height:0;overflow:auto;border-radius:15px;background:var(--tg-theme-bg-color,#f7f8fb)}.tgTrack{display:grid;grid-template-columns:34px minmax(0,1fr) 32px;gap:8px;align-items:center;padding:9px 10px;border-bottom:1px solid var(--tg-theme-section-separator-color,#e8eaf0)}.tgTrack:last-child{border-bottom:0}.tgNum{font-size:11px;font-weight:850;color:var(--tg-theme-hint-color,#9298a5)}.tgTrackName{font-size:13px;font-weight:800;color:var(--tg-theme-text-color,#171a22);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tgTrack button{width:31px;height:31px;border:0;border-radius:50%;background:var(--tg-theme-secondary-bg-color,#fff);color:var(--tg-theme-button-color,#2481cc);font-weight:900}
    `;
    document.head.appendChild(style);

    const root=document.createElement('div');
    root.id='tgBetterCard';
    root.innerHTML=`<div id="tgBetterInner">
      <div class="tgHead"><div class="tgBrand">♫ AI Music</div><div class="tgCount" id="tgCardCount">读取中…</div></div>
      <div class="tgPlayer">
        <div class="tgCover">♫</div>
        <div class="tgMeta"><div class="tgTitle" id="tgCardTitle">正在读取歌曲…</div><div class="tgSub" id="tgCardSub">AI 原创音乐</div></div>
        <div class="tgCtl"><button id="tgCardPrev">‹</button><button class="main" id="tgCardPlay">▶</button><button id="tgCardNext">›</button></div>
      </div>
      <div class="tgProgress"><span id="tgNowTime">0:00</span><input id="tgSeek" type="range" min="0" max="100" value="0"><span id="tgDuration">0:00</span></div>
      <div class="tgActions"><button data-act="write">写歌</button><button data-act="upload">上传</button><button data-act="download">下载</button><button data-act="points">积分</button></div>
      <div class="tgListTitle">歌曲</div><div class="tgTracks" id="tgCardTracks"></div>
    </div>`;
    document.body.appendChild(root);

    let list=[],pos=0,audio=new Audio();
    audio.preload='metadata';
    const title=root.querySelector('#tgCardTitle'),sub=root.querySelector('#tgCardSub'),play=root.querySelector('#tgCardPlay'),seek=root.querySelector('#tgSeek'),nowTime=root.querySelector('#tgNowTime'),duration=root.querySelector('#tgDuration'),tracks=root.querySelector('#tgCardTracks'),count=root.querySelector('#tgCardCount');
    const fmt=s=>{s=Number.isFinite(s)?Math.max(0,Math.floor(s)):0;return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`};
    const current=()=>list[pos];
    const render=()=>{
      const s=current();
      if(!s){title.textContent='暂无歌曲';sub.textContent='AI 原创音乐';count.textContent='0首';tracks.innerHTML='';return}
      title.textContent=s.title||'未命名歌曲';sub.textContent=s.genre||'AI 原创音乐';count.textContent=list.length+'首';
      tracks.innerHTML=list.slice(0,8).map((x,n)=>`<div class="tgTrack"><div class="tgNum">${String(n+1).padStart(2,'0')}</div><div class="tgTrackName">${String(x.title||'未命名歌曲').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]))}</div><button data-i="${n}">${n===pos&&!audio.paused?'Ⅱ':'▶'}</button></div>`).join('');
      tracks.querySelectorAll('button').forEach(b=>b.onclick=()=>{pos=+b.dataset.i;start()});
    };
    const loadSrc=()=>{const s=current();if(!s)return;audio.src=db.storage.from(STORAGE_BUCKET).getPublicUrl(s.storage_path).data.publicUrl};
    const start=async()=>{if(!current())return;loadSrc();try{await audio.play()}catch{}render()};
    const switchTo=d=>{if(!list.length)return;pos=(pos+d+list.length)%list.length;start()};
    root.querySelector('#tgCardPrev').onclick=()=>switchTo(-1);
    root.querySelector('#tgCardNext').onclick=()=>switchTo(1);
    play.onclick=()=>{if(!current())return;if(!audio.src)loadSrc();audio.paused?audio.play().catch(()=>{}):audio.pause()};
    audio.onplay=()=>{play.textContent='Ⅱ';render()};
    audio.onpause=()=>{play.textContent='▶';render()};
    audio.onended=()=>switchTo(1);
    audio.onloadedmetadata=()=>duration.textContent=fmt(audio.duration);
    audio.ontimeupdate=()=>{nowTime.textContent=fmt(audio.currentTime);duration.textContent=fmt(audio.duration);seek.value=audio.duration?String((audio.currentTime/audio.duration)*100):'0'};
    seek.oninput=()=>{if(audio.duration)audio.currentTime=(+seek.value/100)*audio.duration};

    const openOriginal=id=>{
      document.documentElement.classList.remove('tg-compact-mode');
      root.remove();
      setTimeout(()=>document.querySelector(id)?.click(),30);
    };
    root.querySelector('[data-act="write"]').onclick=()=>openOriginal('#writeBtn');
    root.querySelector('[data-act="upload"]').onclick=()=>openOriginal('#uploadBtn');
    root.querySelector('[data-act="download"]').onclick=()=>{document.documentElement.classList.remove('tg-compact-mode');root.remove();setTimeout(()=>document.querySelector('#downloadBtn')?.click(),30)};
    root.querySelector('[data-act="points"]').onclick=()=>openOriginal('#pointsBtn');

    db.from('aimusic_tracks').select('id,title,genre,storage_path,approved_at').eq('status','approved').order('approved_at',{ascending:false}).limit(20).then(({data,error})=>{
      if(error){title.textContent='歌曲读取失败';sub.textContent='请稍后重试';count.textContent='';return}
      list=data||[];render();
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

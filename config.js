window.AIMUSIC_CONFIG=Object.freeze({
  SUPABASE_URL:'https://afzcohtnljnmucrkgcaz.supabase.co',
  SUPABASE_KEY:'sb_publishable_EqF-kTNRsSZWhUE8LWB8DQ_UNkTjImv',
  STORAGE_BUCKET:'aimusic-audio',
  MAIN_SITE:'https://globalyouxuan-order.pages.dev',
  FUNCTIONS:Object.freeze({
    GUEST_POINTS:'aimusic-guest-points',
    SUBMIT_TRACK:'aimusic-submit-track',
    LYRICS:'aimusic-lyrics',
    VOCAL_GENERATE:'aimusic-vocal-generate',
    GENERATE_AUDIO:'aimusic-generate-audio',
    ADMIN:'aimusic-admin',
    ADMIN_UPLOAD:'aimusic-admin-upload'
  })
});

if(window.Telegram?.WebApp||/Telegram/i.test(navigator.userAgent)){
  const s=document.createElement('script');
  s.src='./telegram-card.js?v=20260820-1';
  s.defer=true;
  document.head.appendChild(s);
}

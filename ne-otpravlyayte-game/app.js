(() => {
  'use strict';

  const C = { k:'#000000', y:'#FEFF80', w:'#FFFFFF', e:'#E6E6E6', f:'#F5F5F5', g:'#555555' };
  const PAIRS = [
    [
      { id:'S01', topic:'Помощь', source:'Сервис', channel:'PUSH', context:'Оплата холодильника у Алексея сорвалась. Сервис уже починил сбой кассы.', message:'Оплату можно повторить. Холодильник снова в резерве.', rule:'Статус открытого обращения нужно донести до покупателя.', correct:'send', why:'Покупатель ждёт, когда снова получится оплатить заказ.' },
      { id:'B01', topic:'Помощь', source:'Продажи', channel:'PUSH', context:'Оплата холодильника у Алексея сорвалась. Обращение в сервис ещё открыто.', message:'Добавьте защиту экрана и продлённую гарантию со скидкой.', rule:'Продажи стоп, пока не закрыта проблема покупателя.', correct:'block', why:'Сначала доставка и оплата. Потом допродажи.' }
    ],
    [
      { id:'S02', topic:'Намерение', source:'Продажи', channel:'SMS', context:'Мария вчера отказалась от стиральной машины. Сегодня сама запросила размер и слот доставки.', message:'Вы просили слот доставки. Курьер приедет в выбранное время.', rule:'Новый явный запрос покупателя снова разрешает контакт.', correct:'send', why:'Отказ устарел — появился новый запрос.' },
      { id:'B02', topic:'Намерение', source:'Продажи', channel:'SMS', context:'Мария вчера отказалась от стиральной машины. Новых запросов не было.', message:'Передумали? Стиральная машина снова со скидкой 20%.', rule:'Не повторять предложение 7 дней после отказа.', correct:'block', why:'Пауза после отказа ещё действует.' }
    ],
    [
      { id:'S03', topic:'Частота', source:'Маркетинг', channel:'PUSH', context:'Антон смотрел кроссовки и согласился на акции магазина.', message:'Кроссовки, которые вы смотрели, снова в наличии.', rule:'Лимит — 2 рекламных контакта за 7 дней. Использовано: 0.', correct:'send', why:'Интерес есть, согласие есть, лимит свободен.' },
      { id:'B03', topic:'Частота', source:'Маркетинг', channel:'PUSH', context:'Антон смотрел кроссовки и согласился на акции магазина.', message:'Кроссовки, которые вы смотрели, снова в наличии.', rule:'Лимит — 2 рекламных контакта за 7 дней. Использовано: 2.', correct:'block', why:'Релевантность не отменяет лимит контактов.' }
    ],
    [
      { id:'S04', topic:'Актуальность', source:'Сервис', channel:'PUSH', context:'Заказ продуктов Ирины ждут в пункте выдачи до завтра. Уведомления о заказах включены.', message:'Завтра сгорит бронь на продукты. Заберите заказ в пункте выдачи.', rule:'Сервисные сообщения о сроке заказа разрешены.', correct:'send', why:'Актуально для действующего заказа покупателя.' },
      { id:'B04', topic:'Актуальность', source:'Удержание', channel:'PUSH', context:'Ирина уже забрала заказ продуктов полчаса назад.', message:'Ещё не забрали продукты? Самое время зайти в пункт выдачи.', rule:'Оформивших и получивших заказ исключают из кампании.', correct:'block', why:'Целевое действие уже выполнено.' }
    ],
    [
      { id:'S05', topic:'Канал', source:'Маркетинг', channel:'EMAIL', context:'Олег отключил рекламу в push, но запросил подборку новой коллекции одежды по email.', message:'Подборка коллекции, которую вы запросили.', rule:'Использовать канал, который выбрал покупатель. Лимит свободен.', correct:'send', why:'Отказ от push не отменяет запрос по email.' },
      { id:'B05', topic:'Канал', source:'Маркетинг', channel:'PUSH', context:'Олег отключил рекламные push. Кампания шлёт именно push про новую коллекцию.', message:'Новая коллекция уже в магазине. Смотрите образы недели.', rule:'Учитывать канал, который покупатель выбрал сам.', correct:'block', why:'Для этой коммуникации push не подходит.' }
    ],
    [
      { id:'S06', topic:'Обратная связь', source:'Исследования', channel:'SMS', context:'Возврат блендера Елены закрыли два дня назад. Она согласилась на опрос.', message:'Как мы справились с возвратом блендера?', rule:'Один опрос после закрытия. Лимит не исчерпан.', correct:'send', why:'Проблема решена, момент и согласие подходят.' },
      { id:'B06', topic:'Обратная связь', source:'Исследования', channel:'SMS', context:'Возврат блендера Елены всё ещё открыт. Решения пока нет.', message:'Как мы справились с возвратом блендера?', rule:'Опрос о решении — только после закрытия обращения.', correct:'block', why:'Нельзя спрашивать о результате до решения.' }
    ]
  ];
  const ROUND_SECONDS = [22, 18, 18, 15, 15, 12];
  const SOURCES = ['Маркетинг','Продажи','Сервис','Удержание','Исследования'];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = false;
  const blockBtn = document.getElementById('blockBtn');
  const sendBtn = document.getElementById('sendBtn');
  const soundBtn = document.getElementById('soundBtn');
  const fullBtn = document.getElementById('fullBtn');

  let IW = 480, IH = 270;

  const state = {
    phase:'attract', deck:[], index:0, score:0, trust:5, streak:0, answers:[],
    locked:false, sound:true, remaining:22, deadline:0, timerId:null, frozen:false,
    typeFull:'', typeShown:'', typeT:0,
    packet:{ t:0, from:2, mode:'hold', bits:[], ch:'PUSH' },
    face:'idle', frame:0, tick:0, flash:0, shake:0, banner:null, bannerT:0,
    comboPop:0, wave:0, noise:[], demoT:0, lastInput:0, sparks:[],
    reviewOff:0, hits:[]
  };

  function shuffle(a){ a=[...a]; for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); const t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
  function makeDeck(){ const s=new Set(shuffle([0,1,2,3,4,5]).slice(0,3)); return shuffle(PAIRS.map((p,i)=>s.has(i)?p[0]:p[1])); }
  function cur(){ return state.deck[state.index]; }
  function pad(n,w){ return String(n).padStart(w,'0'); }

  const audio = { ctx:null, master:null, musicOn:false, loopTimer:null };

  function ensureAudio(){
    if (audio.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    audio.ctx = new AC();
    audio.master = audio.ctx.createGain();
    audio.master.gain.value = 0.2;
    audio.master.connect(audio.ctx.destination);
  }
  function envGain(t, a, d, v){
    const g = audio.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t+a);
    g.gain.exponentialRampToValueAtTime(0.0001, t+d);
    return g;
  }
  function tone(freq, dur, type, vol, slide){
    if (!state.sound || !audio.ctx) return;
    const t = audio.ctx.currentTime;
    const o = audio.ctx.createOscillator();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t+dur);
    const g = envGain(t, 0.01, dur, vol||0.12);
    o.connect(g).connect(audio.master); o.start(t); o.stop(t+dur+0.02);
  }
  function noise(dur, vol, hp){
    if (!state.sound || !audio.ctx) return;
    const t = audio.ctx.currentTime;
    const n = audio.ctx.createBufferSource();
    const buf = audio.ctx.createBuffer(1, Math.max(1, audio.ctx.sampleRate*dur), audio.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i=0;i<d.length;i++) d[i] = Math.random()*2-1;
    n.buffer = buf;
    const g = envGain(t, 0.004, dur, vol||0.08);
    const f = audio.ctx.createBiquadFilter(); f.type='highpass'; f.frequency.value=hp||900;
    n.connect(f).connect(g).connect(audio.master); n.start(t);
  }
  const sfx = {
    start(){ [262,330,392,523].forEach((f,i)=>setTimeout(()=>tone(f,.1,'square',.1), i*60)); },
    spawn(){ tone(880,.06,'square',.05,1320); noise(.03,.025,1800); },
    tick(){ tone(330,.03,'square',.04); },
    open(){ tone(262,.12,'square',.08,523); tone(392,.18,'triangle',.07); },
    block(){ noise(.12,.1,500); tone(196,.14,'square',.09,120); },
    good(){ [523,659,784].forEach((f,i)=>setTimeout(()=>tone(f,.1,'square',.1), i*55)); },
    bad(){ tone(110,.28,'square',.13,70); },
    combo(){ [523,659,784,1046].forEach((f,i)=>setTimeout(()=>tone(f,.09,'square',.11), i*55)); },
    level(){ tone(392,.07,'triangle',.07); setTimeout(()=>tone(523,.14,'triangle',.08),70); },
    win(){ [523,659,784,1046,1318].forEach((f,i)=>setTimeout(()=>tone(f,.16,'square',.11), i*95)); }
  };

  function scheduleMusic(at){
    if (!audio.ctx || !state.sound || !audio.musicOn) return;
    const eighth = 60/126/2;
    const step = Math.pow(2,1/12);
    const c4 = 261.63;
    const extra = state.comboPop>0;
    const hook = [
      0,null,4,7, 12,null,7,4,
      7,9,7,null, 4,0,null,4,
      5,null,9,12, 16,null,12,9,
      7,11,12,null, 7,4,0,null
    ];
    const bass = [0,0,7,7, 9,9,5,5, 0,0,7,7, 2,2,7,7];
    const bars = 6;
    for (let n=0;n<16*bars;n++){
      const t = at + n*eighth;
      const hi = extra ? 12 : 0;
      const deg = hook[n%32];
      if (deg !== null){
        const o = audio.ctx.createOscillator(); o.type='square';
        o.frequency.value = c4*Math.pow(step, deg + hi);
        const g = envGain(t, 0.004, eighth*0.52, extra?0.046:0.03);
        o.connect(g).connect(audio.master); o.start(t); o.stop(t+eighth*0.55);
      }
      if (n%2===0){
        const b = audio.ctx.createOscillator(); b.type='triangle';
        b.frequency.value = (c4/2)*Math.pow(step, bass[(n/2)%16]);
        const gb = envGain(t, 0.01, eighth*1.7, 0.05);
        b.connect(gb).connect(audio.master); b.start(t); b.stop(t+eighth*1.6);
      }
      if (n%2===1){
        const nsrc = audio.ctx.createBufferSource();
        const buf = audio.ctx.createBuffer(1, Math.max(1, audio.ctx.sampleRate*0.028), audio.ctx.sampleRate);
        const data = buf.getChannelData(0); for (let k=0;k<data.length;k++) data[k]=Math.random()*2-1;
        nsrc.buffer=buf;
        const gn = envGain(t, 0.001, 0.028, n%4===1?0.04:0.016);
        nsrc.connect(gn).connect(audio.master); nsrc.start(t);
      }
      if (extra && n%4===2 && deg !== null){
        const h = audio.ctx.createOscillator(); h.type='square';
        h.frequency.value = c4*2*Math.pow(step, deg%12);
        const gh = envGain(t, 0.006, eighth*0.4, 0.026);
        h.connect(gh).connect(audio.master); h.start(t); h.stop(t+eighth*0.45);
      }
    }
    const len = 16*bars*eighth;
    audio.loopTimer = setTimeout(() => scheduleMusic(audio.ctx.currentTime+0.02), len*1000-40);
  }
  function startMusic(){
    ensureAudio(); audio.ctx.resume(); audio.musicOn = true;
    clearTimeout(audio.loopTimer); scheduleMusic(audio.ctx.currentTime+0.04);
  }
  function stopMusic(){ audio.musicOn=false; clearTimeout(audio.loopTimer); }
  function comboVoice(){
    if (!state.sound || !audio.ctx) return;
    const t = audio.ctx.currentTime;
    [659,784,988,1175].forEach((f,i) => {
      const o=audio.ctx.createOscillator(); o.type='square'; o.frequency.value=f;
      const g=envGain(t+i*0.07,0.01,0.4,0.055); o.connect(g).connect(audio.master); o.start(t+i*0.07); o.stop(t+0.55);
    });
  }

  function px(x,y,w,h,col){ ctx.fillStyle=col; ctx.fillRect(x|0,y|0,Math.max(1,w|0),Math.max(1,h|0)); }
  function rect(x,y,w,h,fill,stroke){
    px(x,y,w,h,fill);
    if (stroke){
      px(x,y,w,1,stroke); px(x,y+h-1,w,1,stroke); px(x,y,1,h,stroke); px(x+w-1,y,1,h,stroke);
    }
  }
  function font(size){ ctx.font = size+'px Arcade'; ctx.imageSmoothingEnabled=false; ctx.textBaseline='top'; ctx.textAlign='left'; }
  function text(str,x,y,col,size){ font(size||8); ctx.fillStyle=col||C.w; ctx.fillText(str, x|0, y|0); }
  function wrap(str, maxW, size){
    const cw = size||8;
    const max = Math.max(4, Math.floor(maxW/cw));
    const words = String(str).split(' '); const lines=[]; let line='';
    for (const w of words){
      const t = line ? line+' '+w : w;
      if (t.length > max && line){ lines.push(line); line=w; }
      else line=t;
    }
    if (line) lines.push(line);
    return lines;
  }
  function blit(map, ox, oy, pal, s){
    pal = pal || { '.':null, k:C.k, w:C.w, y:C.y, e:C.e, f:C.f, g:C.g };
    s = s || 1;
    const rows = map.trim().split('\n');
    for (let j=0;j<rows.length;j++){
      const row = rows[j].trim();
      for (let i=0;i<row.length;i++){
        const c = pal[row[i]]; if (c) px(ox+i*s, oy+j*s, s, s, c);
      }
    }
  }

  const SPR = {
    idle:`
........eeee........
.......eewwwwee.....
......ewffffffwe....
......ewfkkkkfwe....
......ewffffffwe....
......ewffyyffwe....
.......ewffffwe.....
........ewwwe.......
.........ww.........
......wyyyyyyyyw....
.....wfyyyyyyyyfw...
.....wfyyyyyyyyfw...
.....w.yyyyyyyy.w...
.....w.yyyyyyyy.w...
.....w..wwyyww..w...
........weeeew......
........weeeew......
........we..ew......
........we..ew......
........we..ew......
........we..ew......
.......www..www.....
.......www..www.....`,
    wait:`
........eeee........
.......eewwwwee.....
......ewffffffwe....
......ewfkkkkfwe....
......ewffffffwe....
......ewffyyffwe.ww.
.......ewffffwe.wyw.
........ewwwe...wyw.
.........ww.....www.
......wyyyyyyyyw....
.....wfyyyyyyyyw....
.....wfyyyyyyyyw....
.....w.yyyyyyyyw....
.....w.yyyyyyyyw....
........wwyyww......
........weeeew......
........weeeew......
........we..ew......
........we..ew......
........we..ew......
........we..ew......
.......www..www.....
.......www..www.....`,
    happy:`
........eeee........
.......eewwwwee.....
......ewffffffwe....
......ewfkffkfwe....
......ewffffffwe....
......ewffyyyywe....
.......ewffffwe.....
........ewwwe.......
.........ww.........
...w..wyyyyyyyyw..w.
...wf.yyyyyyyyyy.fw.
...wf.yyyyyyyyyy.fw.
...w..yyyyyyyyyy..w.
...w...yyyyyyyy...w.
........wyyyyyyw....
........weeeew......
........weeeew......
........we..ew......
........we..ew......
.......www..www.....
.......www..www.....
......wwww..wwww....
......wwww..wwww....`,
    angry:`
........eeee........
.......eewwwwee.....
......eewffffwee....
......eekkkkkkee....
......ewffffffwe....
......ewffkkffwe....
.......ewffffwe.....
........ewwwe.......
.........ww.........
......wyyyyyyyyw....
.....wwyyyyyyyyww...
.....wwyyyyyyyyww...
.....w.yyyyyyyy.w...
.....w.yyyyyyyy.w...
.....ww.wwyyww.ww...
........weeeew......
........weeeew......
.......www..www.....
........we..ew......
.......www..www.....
.......www..www.....
......wwww..wwww....
......wwww..wwww....`,
    missed:`
........eeee........
.......eewwwwee.....
......ewffffffwe....
......ewf.kk.fwe....
......ewffffffwe....
......ewffffffwe....
.......eewwwwee.....
........ewwwe.......
.........ww.........
......wyyyyyyyyw....
.....wfyyyyyyyyfw...
.....wfyywwwwyyfw...
.....w.yywwwwyy.w...
.....w.yywkkkwy.w...
........wwyyww......
........weeeew......
........weeeew......
........we..ew......
........we..ew......
........we..ew......
........we..ew......
.......www..www.....
.......www..www.....`
  };

  function drawStar(x,y,s,col){
    px(x, y-s, 2, s*2, col);
    px(x-s, y, s*2, 2, col);
    px(x-s+1, y-s+1, 2, 2, col);
    px(x+s-1, y-s+1, 2, 2, col);
  }

  function drawBackdrop(){
    const fy = IH - (IH>IW ? 118 : 86);
    for (let i=0;i<28;i++){
      const x = (i*53 + (state.tick>>1)) % IW;
      const y = 20 + (i*17)%Math.max(8, fy-28);
      px(x, y, 1, 1, i%4?C.g:C.y);
    }
    for (let x=0;x<IW;x+=8){
      rect(x, fy, 8, 8, ((x>>3)+(state.tick>>5))%2 ? C.k : C.y, C.w);
      rect(x, fy+8, 8, 6, (x>>3)%2 ? C.y : C.k, C.e);
    }
  }

  function drawClient(x,y){
    const s = IH>IW ? 3 : 4;
    let key = state.face;
    if ((state.phase==='wait'||state.phase==='typing') && (state.face==='idle'||state.face==='wait')) key='wait';
    const walk = reduced ? 0 : ((state.tick>>3)&1);
    let hop = 0;
    if (!reduced && key==='happy') hop = ((state.tick>>2)%6)<3 ? -5 : -1;
    if (!reduced && key==='wait') hop = walk ? -2 : 0;
    if (!reduced && key==='angry') hop = (state.tick%6)<3 ? 1 : 0;
    const h = 23*s;
    px(x+12, y+h-2, 10*s, 3, C.g);
    blit(SPR[key]||SPR.idle, x, y+hop, null, s);
    const blink = !reduced && (state.tick%52)<3 && key!=='missed' && key!=='happy';
    if (blink){
      px(x+7*s, y+3*s+hop, 2*s, s, C.f);
      px(x+11*s, y+3*s+hop, 2*s, s, C.f);
    }
    if (key==='wait' && ((state.tick>>2)&1)){
      px(x+17*s, y+6*s+hop, 2*s, 2*s, C.y);
    }
    if (key==='happy'){
      drawStar(x-2, y+8+hop, 3, C.y);
      drawStar(x+17*s, y+4+hop, 4, C.w);
    }
  }

  function drawGate(x,y,openAmt){
    rect(x-4, y+52, 52, 8, C.e, C.w);
    rect(x, y, 10, 54, C.w, C.e);
    rect(x+34, y, 10, 54, C.w, C.e);
    rect(x+2, y+2, 6, 50, C.k);
    rect(x+36, y+2, 6, 50, C.k);
    const lamp = ((state.tick>>3)&1) ? C.y : C.w;
    px(x+2, y-4, 6, 4, lamp);
    px(x+36, y-4, 6, 4, lamp);
    const shut = 1 - Math.max(0, Math.min(1, openAmt));
    const leaf = Math.floor(12 * shut);
    if (leaf>0){
      rect(x+10, y+8, leaf, 40, C.y, C.k);
      rect(x+34-leaf, y+8, leaf, 40, C.y, C.k);
    }
    if (shut>0.75){
      rect(x+10, y+8, 24, 40, C.y, C.k);
      rect(x+20, y+12, 4, 32, C.k);
      for (let i=0;i<4;i++) px(x+14, y+16+i*6, 16, 2, C.k);
    } else {
      const pulse = ((state.tick>>2)&1) ? C.y : C.w;
      for (let i=0;i<5;i++) px(x+16, y+14+i*6, 12, 2, pulse);
    }
    text('DOMS360', x-8, y-14, C.y, 8);
    text('GATE', x+8, y+62, C.e, 8);
  }

  function drawPortal(x,y,w,label,on){
    const bounce = on && !reduced && ((state.tick>>3)&1) ? -1 : 0;
    rect(x, y+bounce, w, 18, on?C.y:C.k, on?C.k:C.w);
    px(x,y+bounce,3,3,C.y); px(x+w-3,y+bounce,3,3,C.y);
    px(x,y+15+bounce,3,3,C.y); px(x+w-3,y+15+bounce,3,3,C.y);
    if (on){
      px(x+w, y+7+bounce, 8, 4, C.y);
      px(x+w+8, y+8+bounce, 5, 2, C.y);
    }
    ctx.save(); ctx.beginPath(); ctx.rect(x+4,y+4+bounce,w-8,12); ctx.clip();
    text(label, x+5, y+5+bounce, on?C.k:C.w, 8);
    ctx.restore();
  }

  function drawPacket(x,y,ch){
    const spin = (state.tick>>2)%4;
    const ox = spin===1 ? 1 : spin===3 ? -1 : 0;
    const slim = spin===2;
    const w = slim ? 8 : 16;
    const h = slim ? 14 : 12;
    px(x-2, y+4, 3, 2, C.y);
    px(x+w, y+4, 3, 2, C.y);
    if (ch==='EMAIL'){
      rect(x+ox, y, w, h, C.w, C.y);
      px(x+ox+1,y+1,Math.max(1,w-2),1,C.k);
      px(x+ox+(w>>1), y+5, 2, 2, C.k);
    } else if (ch==='SMS'){
      rect(x+ox, y, w, h, C.e, C.y);
      px(x+ox+2,y+3,Math.max(2,w-4),2,C.k);
    } else {
      if (!slim) rect(x+ox+8, y-5, 8, 6, C.y, C.k);
      rect(x+ox, y, w, h, C.w, C.y);
      px(x+ox+2,y+3,Math.max(2,w-4),2,C.k);
    }
  }

  function layout(){
    const portrait = IH > IW;
    if (portrait){
      return {
        hudY: 6,
        portalW: 126,
        portals: SOURCES.map((_,i)=>({x:6, y:24+i*20})),
        gate:{x:148, y:118},
        client:{x:168, y:168},
        dialog:{x:6, y:286, w:258, h:188},
        bannerY: 168
      };
    }
    return {
      hudY: 6,
      portalW: 118,
      portals: SOURCES.map((_,i)=>({x:6, y:24+i*20})),
      gate:{x:196, y:58},
      client:{x:300, y:86},
      dialog:{x:132, y:176, w:300, h:88},
      bannerY: 122
    };
  }

  function sourceIndex(name){ const i=SOURCES.indexOf(name); return i<0?2:i; }
  function setButtons(on){ blockBtn.disabled = !on; sendBtn.disabled = !on; }

  function startGame(){
    ensureAudio(); audio.ctx.resume();
    if (state.sound) { startMusic(); sfx.start(); }
    clearTimer();
    state.phase='typing'; state.deck=makeDeck(); state.index=0; state.score=0;
    state.trust=5; state.streak=0; state.answers=[]; state.face='wait';
    state.noise=[]; state.banner=null; state.comboPop=0; state.wave=0; state.sparks=[];
    loadCase();
  }

  function caseLines(){
    const c = cur(); const d = layout().dialog;
    const w = d.w-10;
    return []
      .concat(wrap(c.context, w, 8).slice(0,2))
      .concat(wrap('MSG '+c.message, w, 8).slice(0,2))
      .concat(wrap('RULE '+c.rule, w, 8).slice(0,2));
  }

  function loadCase(){
    const c = cur();
    state.locked=false; state.face='wait'; state.lastInput=0;
    state.banner=null; state.bannerT=0; state.wave=0; state.shake=0; state.flash=0;
    state.packet = { t:0, from:sourceIndex(c.source), mode:'fly', bits:[], ch:c.channel };
    state.typeFull = caseLines().join('\n'); state.typeShown=''; state.typeT=0;
    state.phase = reduced ? 'wait' : 'typing';
    setButtons(true);
    if (reduced) { state.typeShown=state.typeFull; beginWait(); }
    sfx.spawn();
  }

  function beginWait(){
    state.phase='wait'; setButtons(true);
    state.packet.t = 1;
    const sec = ROUND_SECONDS[state.index]||15;
    state.remaining=sec; state.deadline=performance.now()+sec*1000;
    if (state.frozen) return;
    clearTimer();
    state.timerId=setInterval(()=>{
      if (state.frozen || state.phase!=='wait') return;
      state.remaining=Math.max(0, Math.ceil((state.deadline-performance.now())/1000));
      if (state.remaining<=5 && state.remaining>0) sfx.tick();
      if (state.remaining<=0) decide('timeout');
    }, 180);
  }
  function clearTimer(){ if(state.timerId){clearInterval(state.timerId);state.timerId=null;} }

  function skipOrType(){
    if (state.phase!=='typing') return false;
    state.typeShown=state.typeFull; beginWait(); return true;
  }

  function decide(choice){
    const now=performance.now();
    if (state.phase!=='wait' || state.locked || now-state.lastInput<140) return;
    state.lastInput=now; state.locked=true; clearTimer(); setButtons(false);
    const c=cur(); const ok=choice===c.correct;
    if (ok){ state.score+=100; state.streak++; }
    else { state.streak=0; state.trust=Math.max(0,state.trust-1); }
    state.answers.push({...c, choice, isCorrect:ok});
    let kind;
    if (choice==='timeout') kind='timeout';
    else if (choice==='send' && ok) kind='send-good';
    else if (choice==='send') kind='send-bad';
    else if (ok) kind='block-good';
    else kind='block-bad';
    resolve(kind, ok);
  }

  function resolve(kind, ok){
    state.phase='resolve';
    state.packet.mode = kind;
    state.packet.t = 0;
    if (kind==='block-good'){
      state.face='idle'; state.flash=8; sfx.block(); sfx.good();
      state.banner='NOISE BLOCKED +100';
      shatter('gate');
    } else if (kind==='send-good'){
      state.face='happy'; state.wave=1; sfx.open(); sfx.good();
      state.banner='RIGHT MESSAGE +100';
      burst(layout().client.x+24, layout().client.y+20);
    } else if (kind==='send-bad'){
      state.face='angry'; state.shake=12; sfx.bad();
      state.banner='TOO MUCH NOISE';
      state.noise.push({life:1, seed:state.tick});
    } else if (kind==='block-bad'){
      state.face='missed'; sfx.block(); sfx.bad();
      state.banner='MESSAGE MISSED';
      shatter('client');
    } else {
      state.face='angry'; sfx.bad(); state.banner='TIME UP';
    }
    state.bannerT=78;
    if (ok && state.streak>=3 && state.streak%3===0){
      state.comboPop=70; sfx.combo(); comboVoice();
      const L=layout();
      burst(L.gate.x+20, L.gate.y+20);
    }
    const wait = reduced ? 420 : 1250;
    setTimeout(()=>{
      if (state.frozen) return;
      if (state.index<5){ state.index++; sfx.level(); loadCase(); }
      else finish();
    }, wait);
  }

  function burst(x,y){
    for (let i=0;i<14;i++){
      state.sparks.push({ x, y, vx:(Math.random()-.5)*3.4, vy:(Math.random()-.9)*3.2, life:1 });
    }
  }

  function shatter(where){
    const L=layout();
    const gx = where==='client' ? L.client.x+8 : L.gate.x+18;
    const gy = where==='client' ? L.client.y+18 : L.gate.y+22;
    state.packet.bits=[];
    for (let i=0;i<28;i++) state.packet.bits.push({
      x:gx+(i%6)*2, y:gy+((i/6)|0)*2, vx:(Math.random()-.5)*3.2, vy:(Math.random()-.85)*3, life:1
    });
  }

  function finish(){
    clearTimer(); state.phase='result'; setButtons(false); stopMusic(); sfx.win();
    state.flash=0; state.shake=0; state.banner=null;
    try{
      const st=JSON.parse(localStorage.getItem('orion-dont-send-stats')||'{"games":0,"stopped":0}');
      st.games++; st.stopped += state.answers.filter(a=>a.isCorrect&&a.choice==='block').length;
      localStorage.setItem('orion-dont-send-stats', JSON.stringify(st));
    }catch(_){}
  }

  function drawHud(){
    const L=layout();
    if (IH>IW){
      text('SCORE '+pad(state.score,6), 6, L.hudY, C.y, 8);
      text((state.index+1)+'/6', 150, L.hudY, C.w, 8);
      for (let i=0;i<5;i++) rect(186+i*10, L.hudY, 8, 8, i<state.trust?C.y:C.k, C.w);
      if (state.phase==='wait') text(String(state.remaining).padStart(2,'0'), 242, L.hudY, state.remaining<=5?C.y:C.w, 8);
      if (state.streak>=2) text('x'+state.streak, 6, L.hudY+12, C.y, 8);
      return;
    }
    text('SCORE '+pad(state.score,6), 6, L.hudY, C.y, 8);
    text('LEVEL '+(state.index+1)+'/6', 154, L.hudY, C.w, 8);
    text('TRUST', 270, L.hudY, C.e, 8);
    for (let i=0;i<5;i++) rect(318+i*10, L.hudY, 8, 8, i<state.trust?C.y:C.k, C.w);
    if (state.streak>=2) text('COMBO x'+state.streak, 372, L.hudY+12, C.y, 8);
    if (state.phase==='wait'){
      const low = state.remaining<=5;
      text(String(state.remaining).padStart(2,'0'), 430, L.hudY, low?C.y:C.w, 8);
    }
  }

  function drawScene(){
    const L=layout();
    drawBackdrop();
    const open = (state.packet.mode==='send-good' && state.phase==='resolve') ? Math.min(1, state.packet.t*2) : 0;
    L.portals.forEach((p,i)=>drawPortal(p.x,p.y,L.portalW, SOURCES[i], i===state.packet.from && state.phase!=='attract' && state.phase!=='result' && state.phase!=='review'));
    drawGate(L.gate.x, L.gate.y, open);
    drawClient(L.client.x, L.client.y);
    state.noise.forEach((n,i)=>{
      const blink = ((state.tick+i*7)&7)<5;
      if (!blink && !reduced) return;
      const ox = L.client.x - 14 + (i%3)*22;
      const oy = L.client.y - 12 + ((i*13+state.tick*2)%48);
      rect(ox, oy, 14, 10, C.w, C.y);
      px(ox+2, oy+2, 10, 2, C.k);
      px(ox+2, oy+6, 6, 2, C.k);
    });
    if (state.wave>0){
      const s = 8 + state.wave*2;
      ctx.strokeStyle=C.y; ctx.lineWidth=2;
      ctx.strokeRect((L.client.x+10-s)|0, (L.client.y+20-s)|0, (s*2)|0, (s*2)|0);
      if (!reduced) state.wave += 1.4; else state.wave += 4;
      if (state.wave>36) state.wave=0;
    }
  }

  function packetPos(L){
    const from = L.portals[state.packet.from];
    const gate = {x:L.gate.x-10, y:L.gate.y+20};
    const phone = {x:L.client.x+64, y:L.client.y+24};
    const t = Math.min(1, state.packet.t);
    if (state.phase==='typing' || state.phase==='wait'){
      const u = Math.min(1, t);
      return {x:from.x+L.portalW+4 + (gate.x-(from.x+L.portalW+4))*u, y:from.y+2 + (gate.y-(from.y+2))*u, show:true};
    }
    if (state.packet.mode==='send-good'){
      return {x:gate.x+(phone.x-gate.x)*t, y:gate.y+(phone.y-gate.y)*t, show:t<1};
    }
    if (state.packet.mode==='send-bad'){
      const u = Math.min(1,t*1.35);
      return {x:gate.x+(phone.x-gate.x)*u, y:gate.y+(phone.y-gate.y)*u, show:u<0.95};
    }
    if (state.packet.mode==='block-bad'){
      const u = Math.min(1,t*1.2);
      return {x:gate.x+(phone.x-gate.x)*u*0.72, y:gate.y+(phone.y-gate.y)*u*0.72, show:u<0.55};
    }
    return {x:gate.x, y:gate.y, show:false};
  }

  function drawDialog(){
    if (!['typing','wait','resolve'].includes(state.phase)) return;
    const L=layout(); const d=L.dialog;
    rect(d.x, d.y, d.w, d.h, C.k, C.w);
    px(d.x,d.y,4,4,C.y); px(d.x+d.w-4,d.y,4,4,C.y); px(d.x,d.y+d.h-4,4,4,C.y); px(d.x+d.w-4,d.y+d.h-4,4,4,C.y);
    const lines = state.typeShown.split('\n').slice(0, IH>IW ? 12 : 6);
    lines.forEach((ln,i)=>{
      const col = ln.startsWith('MSG')?C.y: ln.startsWith('RULE')?C.w:C.e;
      text(ln, d.x+6, d.y+6+i*12, col, 8);
    });
    if (state.phase==='wait'){
      const low = state.remaining<=5;
      text(String(state.remaining).padStart(2,'0'), d.x+d.w-28, d.y+d.h-14, low?C.y:C.w, 8);
    }
    if (state.phase==='typing' && !reduced) text('SKIP', d.x+d.w-44, d.y+d.h-14, C.e, 8);
  }

  function drawAttract(){
    const L=layout();
    L.portals = SOURCES.map((_,i)=>({x:6, y:(IH>IW?86:78)+i*20}));
    L.gate = {x: IH>IW?148:196, y: IH>IW?160:108};
    L.client = {x: IH>IW?158:300, y: IH>IW?262:86};
    state.demoT += reduced ? 0.04 : 0.018;
    const src = Math.floor(state.demoT)%5;
    const u = state.demoT%1;
    L.portals.forEach((p,i)=>drawPortal(p.x,p.y,L.portalW, SOURCES[i], i===src));
    const pass = src%2===0;
    drawGate(L.gate.x, L.gate.y, pass && u>0.55 ? Math.min(1,(u-0.55)*4) : 0);
    const prevFace = state.face;
    state.face = pass && u>0.85 ? 'happy' : (!pass && u>0.85 ? 'angry' : 'wait');
    drawClient(L.client.x, L.client.y);
    state.face = prevFace;
    drawBackdrop();
    const from=L.portals[src];
    const gx=L.gate.x-8, gy=L.gate.y+20;
    const px0=from.x+L.portalW+4, py0=from.y+2;
    const x=px0+(gx-px0)*Math.min(1,u*1.15);
    const y=py0+(gy-py0)*Math.min(1,u*1.15);
    if (u<0.72) drawPacket(x,y, ['PUSH','SMS','EMAIL'][src%3]);
    else if (!pass){
      for (let i=0;i<12;i++) px(gx+((i*7+state.tick)%18)-4, gy+((i*5)%16)-4, 2,2, C.y);
    } else if (u<0.95){
      const t=(u-0.72)/0.23;
      drawPacket(gx+(L.client.x+20-gx)*t, gy+(L.client.y+30-gy)*t, 'PUSH');
    }
    rect(6, 6, IW-12, IH>IW ? 72 : 54, C.k, C.y);
    text('ОРИОН ТЕХНОЛОГИИ ПРЕДСТАВЛЯЕТ', 12, 12, C.e, 8);
    text('НЕ ОТПРАВЛЯЙТЕ', 12, 26, C.y, 16);
    wrap('ЛУЧШЕЕ СООБЩЕНИЕ ИНОГДА — ТО, КОТОРОЕ НЕ ОТПРАВИЛИ', IW-28, 8)
      .slice(0, IH>IW?3:1)
      .forEach((t,i)=>text(t, 12, 44+i*10, C.w, 8));
    if ((state.tick>>4)%2===0){
      const bw = 116;
      rect((IW-bw)>>1, IH-26, bw, 16, C.k, C.y);
      text('PRESS START', ((IW-bw)>>1)+6, IH-22, C.y, 8);
    }
  }

  function drawResult(){
    const ok = state.answers.filter(a=>a.isCorrect).length;
    const stopped = state.answers.filter(a=>a.isCorrect&&a.choice==='block').length;
    const sent = state.answers.filter(a=>a.isCorrect&&a.choice==='send').length;
    text('MISSION COMPLETE', 12, 16, C.y, 16);
    text(ok+' / 6 ТОЧНЫХ РЕШЕНИЙ', 12, 48, C.w, 8);
    text((stopped*100)+' NOISE BLOCKED', 12, 66, C.e, 8);
    text((sent*100)+' RIGHT MESSAGES', 12, 82, C.e, 8);
    wrap('ПОКУПАТЕЛЬ ВИДИТ ОДИН МАГАЗИН', IW-24, 8).forEach((t,i)=>text(t, 12, 108+i*12, C.y, 8));
    wrap('DOMS360 — УПРАВЛЕНИЕ КОММУНИКАЦИЯМИ В РИТЕЙЛЕ', IW-24, 8).forEach((t,i)=>text(t, 12, 148+i*12, C.w, 8));
    const stacked = IH>IW;
    const by = stacked ? IH-64 : IH-40;
    const bw = stacked ? IW-24 : 150;
    rect(12, by, bw, 22, C.k, C.y);
    text('PLAY AGAIN', 24, by+7, C.y, 8);
    const lx = stacked ? 12 : 176;
    const ly = stacked ? IH-36 : by;
    rect(lx, ly, bw, 22, C.k, C.w);
    text('DECISION LOG', lx+8, ly+7, C.w, 8);
    state.hits = [
      {x:12,y:by,w:bw,h:22,act:'again'},
      {x:lx,y:ly,w:bw,h:22,act:'log'}
    ];
  }

  function drawReview(){
    text('DECISION LOG', 8, 8, C.y, 8);
    state.answers.forEach((a,i)=>{
      const y = 28+i*36 - state.reviewOff;
      if (y<20 || y>IH-24) return;
      text((i+1)+' '+(a.isCorrect?'OK':'NO')+' '+a.topic, 8, y, a.isCorrect?C.y:C.w, 8);
      wrap(a.why, IW-16, 8).slice(0,2).forEach((ln,j)=>text(ln, 8, y+12+j*10, C.e, 8));
    });
    text('A BACK', 8, IH-14, C.y, 8);
  }

  function frame(){
    const portrait = innerHeight > innerWidth * 1.05;
    const nw = portrait ? 270 : 480, nh = portrait ? 480 : 270;
    if (nw!==IW || nh!==IH){ IW=nw; IH=nh; canvas.width=IW; canvas.height=IH; ctx.imageSmoothingEnabled=false; }

    if (state.phase==='typing' && !reduced){
      state.typeT++;
      if (state.typeT%2===0 && state.typeShown.length<state.typeFull.length){
        state.typeShown = state.typeFull.slice(0, state.typeShown.length+1);
        if (state.typeShown.length===state.typeFull.length) beginWait();
      }
    }
    if (state.phase==='typing' || state.phase==='wait') state.packet.t = Math.min(1, state.packet.t+(reduced?1:0.045));
    if (state.phase==='resolve') state.packet.t = Math.min(1.25, state.packet.t+(reduced?1:0.055));
    if (state.packet.bits) state.packet.bits.forEach(b=>{ b.x+=b.vx; b.y+=b.vy; b.life-=0.035; });
    state.sparks = (state.sparks||[]).filter(s=>s.life>0);
    state.sparks.forEach(s=>{ s.x+=s.vx; s.y+=s.vy; s.vy+=0.08; s.life-=0.03; });
    if (state.bannerT>0) state.bannerT--;
    if (state.comboPop>0) state.comboPop--;
    if (state.shake>0) state.shake--;
    if (state.flash>0) state.flash--;
    state.tick++;

    ctx.fillStyle=C.k; ctx.fillRect(0,0,IW,IH);
    const ox = state.shake? ((state.tick%2)*3-1) : 0;
    ctx.save(); ctx.translate(ox,0);

    if (state.phase==='attract'){
      drawAttract();
    } else if (state.phase==='result'){
      drawResult();
    } else if (state.phase==='review'){
      drawReview();
    } else {
      drawHud();
      drawScene();
      const L=layout();
      const p=packetPos(L);
      if (p.show){
        const trail = state.packet.trail || (state.packet.trail=[]);
        trail.push({x:p.x, y:p.y, life:1});
        if (trail.length>7) trail.shift();
        trail.forEach((t,i)=> px(t.x+4, t.y+4, 3, 3, i%2?C.y:C.w));
        drawPacket(p.x|0, p.y|0, (cur()&&cur().channel)||'PUSH');
      }
      (state.packet.bits||[]).forEach(b=>{ if(b.life>0) px(b.x,b.y,3,3, C.y); });
      state.sparks.forEach(s=>{ if (s.life>0) drawStar(s.x, s.y, s.life>0.5?4:2, s.life>0.6?C.y:C.w); });
      drawDialog();
      if (state.banner && state.bannerT>0){
        const bw = Math.min(IW-16, state.banner.length*8+16);
        rect((IW-bw)/2, L.bannerY, bw, 18, C.k, C.y);
        text(state.banner, (IW-bw)/2+8, L.bannerY+5, C.y, 8);
      }
      if (state.comboPop>0){
        text('COMBO x'+state.streak, (IW>>1)-44, 36, C.y, 8);
        for (let i=0;i<36;i++) px((state.tick*4+i*19)%IW, 48+((i*17+state.tick*3)%(IH-80)), 3,3, C.y);
      }
    }
    if (state.flash>0){ ctx.fillStyle='rgba(254,255,128,0.28)'; ctx.fillRect(0,0,IW,IH); }
    ctx.restore();
    requestAnimationFrame(frame);
  }

  function canvasHit(ev){
    const r = canvas.getBoundingClientRect();
    const x = (ev.clientX-r.left) * (IW/r.width);
    const y = (ev.clientY-r.top) * (IH/r.height);
    return {x,y};
  }

  function onStart(){
    if (state.phase==='attract') startGame();
    else if (state.phase==='result') startGame();
  }
  function key(e){
    if (e.repeat) return;
    const code=e.code;
    if (['Space','Enter','KeyA','KeyD','ArrowLeft','ArrowRight'].includes(code)) e.preventDefault();
    if (skipOrType()) return;
    if (state.phase==='attract' && ['Space','Enter','KeyA','KeyD','ArrowLeft','ArrowRight'].includes(code)) { onStart(); return; }
    if (state.phase==='wait'){
      if (code==='KeyA'||code==='ArrowLeft') { blockBtn.classList.add('is-down'); decide('block'); setTimeout(()=>blockBtn.classList.remove('is-down'),120); }
      if (code==='KeyD'||code==='ArrowRight') { sendBtn.classList.add('is-down'); decide('send'); setTimeout(()=>sendBtn.classList.remove('is-down'),120); }
    }
    if (state.phase==='result'){
      if (code==='KeyD'||code==='Enter'||code==='Space'||code==='ArrowRight') startGame();
      if (code==='KeyA'||code==='ArrowLeft') state.phase='review';
    }
    if (state.phase==='review' && (code==='KeyA'||code==='Enter'||code==='Escape'||code==='ArrowLeft')) state.phase='result';
  }

  blockBtn.addEventListener('click', ()=>{ if(!skipOrType()) decide('block'); });
  sendBtn.addEventListener('click', ()=>{ if(!skipOrType()) decide('send'); });
  soundBtn.addEventListener('click', (e)=>{
    e.stopPropagation();
    ensureAudio(); audio.ctx.resume();
    state.sound=!state.sound;
    soundBtn.textContent = state.sound?'SOUND ON':'SOUND OFF';
    if (state.sound && state.phase!=='attract' && state.phase!=='result' && state.phase!=='review') startMusic();
    else stopMusic();
  });
  fullBtn.addEventListener('click', ()=>{ document.documentElement.requestFullscreen?.().catch(()=>{}); });
  canvas.addEventListener('click', (ev)=>{
    if (state.phase==='attract') { onStart(); return; }
    if (skipOrType()) return;
    if (state.phase==='result'){
      const p=canvasHit(ev);
      const hit=(state.hits||[]).find(h=>p.x>=h.x&&p.x<=h.x+h.w&&p.y>=h.y&&p.y<=h.y+h.h);
      if (hit&&hit.act==='log') { state.phase='review'; return; }
      startGame(); return;
    }
    if (state.phase==='review') state.phase='result';
  });
  document.addEventListener('keydown', key);
  document.addEventListener('visibilitychange', ()=>{
    if (document.hidden) { clearTimer(); stopMusic(); }
    else if (state.phase==='wait'&&!state.locked) beginWait();
    else if (state.sound && state.phase!=='attract' && state.phase!=='result') startMusic();
  });
  window.__orion = {
    get phase(){ return state.phase; },
    get remaining(){ return state.remaining; },
    get banner(){ return state.banner; },
    decide, startGame, skip:skipOrType, cur,
    freeze(v){ state.frozen=!!v; if(v) clearTimer(); }
  };

  requestAnimationFrame(frame);
})();

'use strict';

const PIN = '6283';
const API = 'https://ex.4dgwb9f5dh.workers.dev/api';

let pin = '';
let txs = [];
let trash = [];
let rates = {USD:97500,AED:26500,OMR:253000,SAR:26000,GBP:124000,CHF:110000,BTC:4100000000,ETH:180000000,SOL:15000000,GOLD:6300000};
let tradeType = 'buy';

const CUR = {
  USD:  {name:'دلار آمریکا',    flag:'🇺🇸', unit:'دلار'},
  AED:  {name:'درهم امارات',    flag:'🇦🇪', unit:'درهم'},
  OMR:  {name:'ریال عمان',      flag:'🇴🇲', unit:'ریال عمان'},
  SAR:  {name:'ریال سعودی',     flag:'🇸🇦', unit:'ریال'},
  GBP:  {name:'پوند انگلیس',    flag:'🇬🇧', unit:'پوند'},
  CHF:  {name:'فرانک سویس',     flag:'🇨🇭', unit:'فرانک'},
  BTC:  {name:'بیتکوین',        flag:'₿',   unit:'BTC'},
  ETH:  {name:'اتریوم',         flag:'Ξ',   unit:'ETH'},
  SOL:  {name:'سولانا',         flag:'◎',   unit:'SOL'},
  GOLD: {name:'طلا ۲۴ عیار (گرم)', flag:'🥇',  unit:'گرم'}
};

const LOGO_SRC = '';
let filter = 'all';
let chartInstance = null;

const $ = id => document.getElementById(id);
const fN = (n,d=0) => {
  if(isNaN(n)) return '0';
  const v=Math.round(n*Math.pow(10,d))/Math.pow(10,d);
  return v.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
};
const fD = ts => new Date(ts).toLocaleDateString('fa-IR')+' '+new Date(ts).toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'});

// ── تبدیل میلادی به شمسی ─────────────────────────────────────────
function toJalali(date){
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('fa-IR',{year:'numeric',month:'long',day:'numeric'});
}
function toJalaliShort(dateStr){
  // dateStr مثل "2025-01-15"
  const d = new Date(dateStr);
  return d.toLocaleDateString('fa-IR',{year:'numeric',month:'short',day:'numeric'});
}

function toast(msg,type=''){
  const t=$('toast'); t.textContent=msg; t.className='toast show '+type;
  setTimeout(()=>t.className='toast',2800);
}
async function api(path,opts={}){
  const r=await fetch(API+path,{...opts,headers:{'Content-Type':'application/json',...(opts.headers||{})}});
  if(!r.ok) throw new Error('API '+r.status);
  return r.json();
}

// ══════════════════════════════════════════════════════════════════
// سیستم صدا
// ══════════════════════════════════════════════════════════════════
const _AC=(()=>{let ctx=null;return()=>{if(!ctx)ctx=new(window.AudioContext||window.webkitAudioContext)();return ctx;};})();
function playTone(freq,dur=0.09,vol=0.13,type='sine'){
  try{
    const ctx=_AC(),t=ctx.currentTime;
    const osc=ctx.createOscillator(),g=ctx.createGain();
    osc.connect(g);g.connect(ctx.destination);
    osc.type=type;osc.frequency.setValueAtTime(freq,t);
    g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    osc.start(t);osc.stop(t+dur);
  }catch(_){}
}
function playClick(){playTone(800,0.055,0.12,'triangle');}
function playIconTap(){playTone(900,0.04,0.10,'sine');}
function playPinKey(){playTone(1100,0.06,0.15,'sine');}
function playSuccess(){
  try{
    const ctx=_AC(),t=ctx.currentTime;
    [[523.25,t],[659.25,t+0.12]].forEach(([freq,when])=>{
      const osc=ctx.createOscillator(),g=ctx.createGain();
      osc.connect(g);g.connect(ctx.destination);
      osc.type='sine';osc.frequency.setValueAtTime(freq,when);
      g.gain.setValueAtTime(0.17,when);g.gain.exponentialRampToValueAtTime(0.001,when+0.22);
      osc.start(when);osc.stop(when+0.22);
    });
  }catch(_){}
}

function initSounds(){
  document.querySelectorAll('.pb[data-n]').forEach(b=>b.addEventListener('click',()=>playPinKey(),{passive:true}));
  document.querySelectorAll('.mob-nav-btn,.nb,.vab').forEach(b=>b.addEventListener('click',()=>playIconTap(),{passive:true}));
}

// ══════════════════════════════════════════════════════════════════
// تزریق استایلهای سراسری
// ══════════════════════════════════════════════════════════════════
(function injectGlobalStyles(){
  const s=document.createElement('style');
  s.textContent=`
  :root{
    --ac:#4f8cff;--ac2:#6fa3ff;
    --gr:#26d782;--rd:#ff5271;--gold:#f5c842;
    --c1:#0b1120;--c2:#111c2e;--c3:#172035;--c4:#1e2d45;
    --br:rgba(79,140,255,.15);
    --tx1:#e8f0ff;--tx2:#8fa8cc;--tx3:#4a6280;
    --sh:0 8px 32px rgba(0,0,0,.55);--sh2:0 2px 12px rgba(0,0,0,.35);
    --glass:rgba(255,255,255,.04);--glass-border:rgba(255,255,255,.10);
    --font:'Vazirmatn',Tahoma,sans-serif;
  }
  body.light{
    --c1:#f0f4fb;--c2:#ffffff;--c3:#e8edf7;--c4:#dde5f3;
    --br:rgba(79,140,255,.18);--tx1:#0d1b35;--tx2:#3a5080;--tx3:#8099bb;
    --sh:0 8px 32px rgba(79,140,255,.12);
    --glass:rgba(255,255,255,.70);--glass-border:rgba(79,140,255,.20);
  }
  /* منوی پایین شیشهای */
  .mob-nav{
    position:fixed!important;bottom:16px!important;left:12px!important;right:12px!important;
    background:var(--glass)!important;
    -webkit-backdrop-filter:blur(24px) saturate(180%)!important;
    backdrop-filter:blur(24px) saturate(180%)!important;
    border:1.5px solid var(--glass-border)!important;
    border-radius:24px!important;
    box-shadow:0 8px 40px rgba(0,0,0,.45),0 0 0 1px rgba(79,140,255,.08)!important;
    padding:6px 8px!important;
    display:flex!important;align-items:center!important;justify-content:space-around!important;
    z-index:9000!important;height:60px!important;
    transition:opacity .25s ease,transform .25s ease!important;
  }
  .mob-nav.wx-hidden{
    display:none!important;
  }
  .mob-nav-btn{
    background:none!important;border:none!important;
    color:var(--tx3)!important;font-family:var(--font)!important;
    display:flex!important;flex-direction:column!important;align-items:center!important;
    gap:2px!important;padding:6px 10px!important;border-radius:16px!important;
    cursor:pointer!important;font-size:.64rem!important;transition:all .2s ease!important;min-width:54px!important;
  }
  .mob-nav-btn span:first-child{font-size:1.35rem!important;line-height:1!important;}
  .mob-nav-btn.active{
    background:linear-gradient(135deg,rgba(79,140,255,.25),rgba(111,163,255,.12))!important;
    color:var(--ac)!important;box-shadow:0 2px 12px rgba(79,140,255,.25)!important;
  }
  .mob-nav-btn:active{transform:scale(.92)!important;}
  /* کارتهای شیشهای */
  .inv-card,.sum-card,.bours-sum-card,.rc{
    background:linear-gradient(135deg,var(--glass),rgba(255,255,255,.02))!important;
    -webkit-backdrop-filter:blur(16px)!important;backdrop-filter:blur(16px)!important;
    border:1px solid var(--glass-border)!important;
    border-radius:18px!important;box-shadow:var(--sh2)!important;
    transition:transform .18s ease,box-shadow .18s ease!important;
  }
  .inv-card:hover,.rc:hover{transform:translateY(-2px)!important;box-shadow:var(--sh)!important;}
  #lo{
    left:12px!important;right:auto!important;
    background:linear-gradient(135deg,rgba(255,82,113,.18),rgba(255,82,113,.08))!important;
    border:1px solid rgba(255,82,113,.3)!important;border-radius:12px!important;
    color:var(--rd)!important;font-size:.75rem!important;padding:6px 14px!important;
  }
  .pos{color:var(--gr)!important;}.neg{color:var(--rd)!important;}.neu{color:var(--tx1)!important;}
  .toast{
    border-radius:14px!important;
    background:linear-gradient(135deg,var(--c3),var(--c4))!important;
    border:1px solid var(--glass-border)!important;box-shadow:var(--sh)!important;
  }
  /* دکمه PDF */
  .wx-pdf-btn{
    display:block;margin:10px 12px 4px;padding:11px 22px;
    background:linear-gradient(135deg,#4f8cff,#3a6fd8);
    color:#fff;border:none;border-radius:14px;
    font-family:var(--font);font-size:.88rem;cursor:pointer;
    box-shadow:0 4px 18px rgba(79,140,255,.4);width:calc(100% - 24px);
    transition:transform .15s,box-shadow .15s;
  }
  .wx-pdf-btn:active{transform:scale(.97);box-shadow:0 2px 8px rgba(79,140,255,.3);}
  `;
  document.head.appendChild(s);
})();

// ── منوی پایین را در صفحه PIN مخفی کن ───────────────────────────
// این کد فوری اجرا میشود تا قبل از هر چیزی منو مخفی باشد
(function hideNavOnPinScreen(){
  function applyNavVisibility(){
    const nav=document.querySelector('.mob-nav');
    if(!nav) return;
    const appHidden=!$('app') || $('app').classList.contains('hidden');
    if(appHidden) nav.classList.add('wx-hidden');
    else nav.classList.remove('wx-hidden');
  }
  // اجرا بعد از DOMContentLoaded
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{
      applyNavVisibility();
      // مراقب تغییر کلاس app باش
      const app=$('app');
      if(app){
        new MutationObserver(applyNavVisibility)
          .observe(app,{attributes:true,attributeFilter:['class']});
      }
    });
  } else {
    applyNavVisibility();
    const app=$('app');
    if(app){
      new MutationObserver(applyNavVisibility)
        .observe(app,{attributes:true,attributeFilter:['class']});
    }
  }
})();

// ── برند پایین صفحه پین ──────────────────────────────────────────
(function addPinBrandFooter(){
  const ls=$('ls');
  if(!ls||ls.querySelector('.wx-pin-brand')) return;
  const f=document.createElement('div');
  f.className='wx-pin-brand';
  f.textContent='WHALIXIR BY SHAMSADDIN MOLLAEI';
  f.style.cssText='position:fixed;left:0;right:0;bottom:18px;text-align:center;color:#fff;opacity:.55;font-size:11px;letter-spacing:1.5px;font-family:inherit;direction:ltr;user-select:none;pointer-events:none;z-index:9999;';
  ls.appendChild(f);
})();

// ── logout ────────────────────────────────────────────────────────
$('lo').onclick=()=>{
  playClick();
  $('app').classList.add('hidden');
  const ls=$('ls');
  ls.classList.remove('hidden');
  ls.style.cssText='opacity:1;transform:scale(1)';
  pin='';dots();
};

// ── tabs ──────────────────────────────────────────────────────────
function tab(id){
  document.querySelectorAll('.nb').forEach(b=>b.classList.toggle('active',b.dataset.tab===id));
  document.querySelectorAll('.mob-nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===id));
  document.querySelectorAll('.ts').forEach(s=>s.classList.toggle('active',s.id==='tab-'+id));
  const main=document.querySelector('.am');
  if(main) main.scrollTop=0;
  if(id==='chart') setTimeout(renderChart,100);
  if(id==='bours') setTimeout(renderBours,80);
}
document.querySelectorAll('.nb,.vab,.mob-nav-btn').forEach(b=>b.onclick=()=>tab(b.dataset.tab));

// ── load ──────────────────────────────────────────────────────────
function loadLocal(){
  try{const r=localStorage.getItem('wx_rates');if(r)Object.assign(rates,JSON.parse(r));}catch(_){}
  try{const t=localStorage.getItem('wx_tx');if(t)txs=JSON.parse(t);}catch(_){}
  try{const tr=localStorage.getItem('wx_trash');if(tr)trash=JSON.parse(tr);}catch(_){}
  render();
}
async function loadAPI(){
  try{
    const [r,t]=await Promise.all([api('/rates'),api('/transactions')]);
    Object.assign(rates,r);
    txs=t.map(x=>({...x,savedRate:x.saved_rate||x.rate}));
    localStorage.setItem('wx_rates',JSON.stringify(rates));
    localStorage.setItem('wx_tx',JSON.stringify(txs));
    render();
  }catch(_){}
}

// ── TGJU LIVE RATES ───────────────────────────────────────────────
async function fetchTgjuRates(showStatus=true){
  const statusEl=$('rateFetchStatus'),tsEl=$('rateTs'),btn=$('rfb');
  if(btn){btn.disabled=true;btn.textContent='⏳ در حال دریافت...';}
  if(showStatus) statusEl.innerHTML='<div class="rate-fetch-box"><div class="spin"></div><span>در حال دریافت نرخهای زنده از tgju.org ...</span></div>';
  try{
    const r=await fetch('https://ex.4dgwb9f5dh.workers.dev/api/tgju?_='+Date.now(),{cache:'no-store',headers:{'Accept':'application/json'}});
    if(!r.ok) throw new Error('خطای سرور: '+r.status);
    const data=await r.json();
    if(data.error) throw new Error(data.error);
    const CODES=['USD','AED','OMR','SAR','GBP','CHF','BTC','ETH','SOL','GOLD'];
    let updated=0,changed=[];
    for(const code of CODES){
      if(data[code]&&data[code]>0){
        if(rates[code]!==data[code]) changed.push(code);
        rates[code]=data[code];updated++;
        api('/rates/'+code,{method:'PUT',body:JSON.stringify({value:data[code]})}).catch(()=>{});
      }
    }
    if(updated>0){
      localStorage.setItem('wx_rates',JSON.stringify(rates));
      renderLive();
      changed.forEach(code=>{
        const card=$('rg').querySelector('.rc[data-c="'+code+'"]');
        if(card){card.classList.add('rate-flash');setTimeout(()=>card.classList.remove('rate-flash'),1200);}
      });
      const now=new Date().toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'});
      tsEl.textContent='آخرین بروزرسانی: '+now+(changed.length?(' | '+changed.length+' نرخ تغییر کرد'):' | بدون تغییر');
      const errCount=(data._errors||[]).length,errMsg=errCount>0?' | '+errCount+' مورد دریافت نشد':'';
      if(showStatus){
        statusEl.innerHTML='<div class="rate-fetch-box" style="border-color:var(--gr)">✅ <span style="color:var(--gr)">'+updated+' نرخ از tgju.org دریافت و بروز شد'+errMsg+'</span></div>';
        setTimeout(()=>statusEl.innerHTML='',5000);
      }
      if(showStatus) toast('✅ '+updated+' نرخ بروز شد','ok');
    } else {
      throw new Error('هیچ نرخی دریافت نشد. '+(data._errors||[]).join(' | '));
    }
  }catch(err){
    if(showStatus){
      statusEl.innerHTML='<div class="rate-fetch-box" style="border-color:var(--rd)">❌ <span style="color:var(--rd)">'+err.message+'</span></div>';
      setTimeout(()=>statusEl.innerHTML='',7000);
    }
    toast('خطا در دریافت نرخها','err');
  }finally{
    if(btn){btn.disabled=false;btn.textContent='🔄 بروزرسانی از tgju.org';}
  }
}
$('rfb').onclick=()=>{playClick();fetchTgjuRates(true);};

// ── CALC ──────────────────────────────────────────────────────────
function calcAll(){
  const data={};
  for(const code of Object.keys(CUR)) data[code]={buyAmt:0,buyToman:0,sellAmt:0,sellToman:0};
  for(const tx of txs){
    if(!data[tx.code]) continue;
    const d=data[tx.code];
    if(tx.type==='buy'){d.buyAmt+=tx.amount;d.buyToman+=tx.total;}
    else{d.sellAmt+=tx.amount;d.sellToman+=tx.total;}
  }
  let totalBuy=0,totalSell=0,totalInventoryValue=0;
  const result={};
  for(const [code,d] of Object.entries(data)){
    const avgBuy=d.buyAmt>0?d.buyToman/d.buyAmt:0;
    const inventory=d.buyAmt-d.sellAmt;
    const inventoryValue=inventory>0?inventory*(rates[code]||0):0;
    const profitToman=d.sellToman+inventoryValue-d.buyToman;
    totalBuy+=d.buyToman;totalSell+=d.sellToman;totalInventoryValue+=inventoryValue;
    result[code]={inventory,avgBuy,buyAmt:d.buyAmt,sellAmt:d.sellAmt,
      buyToman:d.buyToman,sellToman:d.sellToman,profitToman,inventoryValue};
  }
  const totalProfitToman=totalSell+totalInventoryValue-totalBuy;
  const aedRate=rates['AED']||1;
  return{result,totalProfitToman,totalProfitAED:totalProfitToman/aedRate,totalInventoryValue,totalBuy};
}

// ── دادههای ماهانه/روزانه — سود واقعی (ارزش موجودی) ──────────────
function monthlyData(){
  // گروهبندی تراکنشها بر اساس ماه
  const months={};
  for(const tx of txs){
    const d=new Date(tx.ts);
    const key=d.getFullYear()+'-'+(d.getMonth()+1).toString().padStart(2,'0');
    if(!months[key]) months[key]={buyToman:0,sellToman:0};
    if(tx.type==='buy') months[key].buyToman+=tx.total;
    else months[key].sellToman+=tx.total;
  }
  const sorted=Object.entries(months).sort((a,b)=>a[0].localeCompare(b[0]));
  const labels=[],profitToman=[],profitAED=[];
  const aedRate=rates['AED']||1;
  for(const [key,v] of sorted){
    const [yr,mo]=key.split('-');
    labels.push(jalaliMonth(parseInt(yr),parseInt(mo)));
    const p=v.sellToman-v.buyToman;
    profitToman.push(Math.round(p));
    profitAED.push(parseFloat((p/aedRate).toFixed(2)));
  }
  return{labels,profitToman,profitAED};
}

function dailyData(){
  // گروهبندی تراکنشها بر اساس روز
  const days={};
  for(const tx of txs){
    const d=new Date(tx.ts);
    const key=d.getFullYear()+'-'+(d.getMonth()+1).toString().padStart(2,'0')+'-'+d.getDate().toString().padStart(2,'0');
    if(!days[key]) days[key]={buyToman:0,sellToman:0,ts:tx.ts};
    if(tx.type==='buy') days[key].buyToman+=tx.total;
    else days[key].sellToman+=tx.total;
  }
  // همه روزها مرتبشده (همه تاریخها، نه فقط ۱۴ روز آخر)
  const allDays=Object.entries(days).sort((a,b)=>a[0].localeCompare(b[0]));
  const aedRate=rates['AED']||1;
  const {totalProfitToman,totalProfitAED}=calcAll();

  // محاسبه سود/زیان تجمعی تا هر روز
  let cumBuy=0,cumSell=0;
  const allCum=allDays.map(([key,v])=>{
    cumBuy+=v.buyToman; cumSell+=v.sellToman;
    const t=cumSell-cumBuy;
    return{key,ts:v.ts,plT:Math.round(t),plA:parseFloat((t/aedRate).toFixed(2))};
  });

  // ۳۰ روز آخر برای نمایش
  const recent=allCum.slice(-30);
  const labels=[],profitToman=[],profitAED=[];
  for(const item of recent){
    const dt=new Date(item.ts);
    labels.push(dt.toLocaleDateString('fa-IR',{month:'short',day:'numeric'}));
    profitToman.push(item.plT);
    profitAED.push(item.plA);
  }
  // آخرین نقطه = سود کل واقعی (شامل ارزش موجودی لحظهای)
  if(profitToman.length){
    profitToman[profitToman.length-1]=Math.round(totalProfitToman);
    profitAED[profitAED.length-1]=parseFloat(totalProfitAED.toFixed(2));
  }
  return{labels,profitToman,profitAED};
}

function jalaliMonth(yr,mo){
  const jm=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
  let jMo=mo-3,jYr=yr-621;
  if(jMo<=0){jMo+=12;jYr--;}
  return jm[(jMo-1)%12]+' '+jYr;
}

// ── RENDER ────────────────────────────────────────────────────────
function render(){
  renderRates();renderDashboard();renderInventory();
  renderRecent();renderTxs();renderTrash();updateSummary();
  if(document.getElementById('tab-chart').classList.contains('active')) renderChart();
}
function renderLive(){
  renderRates();renderDashboard();renderInventory();updateSummary();
  if(document.getElementById('tab-chart').classList.contains('active')) renderChart();
}

function renderDashboard(){
  const{totalProfitToman,totalProfitAED,result}=calcAll();
  let totalInventoryToman=0;
  for(const [code,d] of Object.entries(result)){
    if(d.inventory>0&&rates[code]>0) totalInventoryToman+=d.inventory*rates[code];
  }
  const elT=$('pvt');
  elT.textContent=(totalProfitToman>=0?'+':'')+fN(Math.abs(totalProfitToman));
  elT.className='pv '+(totalProfitToman>=0?'pos':'neg');
  const elA=$('pvAED');
  elA.textContent=(totalProfitAED>=0?'+':'')+fN(Math.abs(totalProfitAED),2);
  elA.className='pv '+(totalProfitAED>=0?'pos':'neg');
  const elTot=$('pvTotal');
  if(elTot) elTot.textContent=fN(Math.round(totalInventoryToman));
  const balGrid=$('dashBalances');
  if(balGrid){
    const show=['USD','AED','OMR','BTC'];
    balGrid.innerHTML=show.map(code=>{
      const d=result[code],inv=d?d.inventory:0,invToman=inv>0?(inv*rates[code]):0;
      const c=CUR[code],dec=code==='BTC'?4:code==='OMR'?3:2,cls=inv>0?'pos':inv<0?'neg':'neu';
      return `<div class="inv-card" style="padding:14px 16px">
        <div class="inv-header" style="margin-bottom:8px"><div class="inv-flag" style="font-size:1.6rem">${c.flag}</div>
          <div><div class="inv-name" style="font-size:.88rem">${c.name}</div></div></div>
        <div class="inv-row"><span class="inv-label">موجودی</span>
          <span class="inv-val ${cls}">${fN(inv,dec)} ${c.unit}</span></div>
        ${invToman>0?`<div class="inv-row"><span class="inv-label">ارزش تومانی</span>
          <span class="inv-val neu" style="font-size:.78rem">${fN(Math.round(invToman))}</span></div>`:''}
      </div>`;
    }).join('');
  }
}

function renderInventory(){
  const{result}=calcAll();
  const grid=$('invGrid'),aedRate=rates['AED']||1;
  const cards=Object.entries(CUR).map(([code,c])=>{
    const d=result[code];
    if(d.buyAmt===0&&d.sellAmt===0) return '';
    const invC=d.inventory>0?'neu':d.inventory<0?'neg':'neu';
    const pC=d.profitToman>=0?'pos':'neg',pS=d.profitToman>=0?'+':'';
    const dec=code==='BTC'?6:code==='GOLD'?3:2;
    const profitAED=d.profitToman/aedRate,paC=profitAED>=0?'pos':'neg',paS=profitAED>=0?'+':'';
    return `<div class="inv-card">
      <div class="inv-header"><div class="inv-flag">${c.flag}</div>
        <div><div class="inv-name">${c.name}</div><div class="inv-code">${code}</div></div></div>
      <div class="inv-row"><span class="inv-label">موجودی</span><span class="inv-val ${invC}">${fN(d.inventory,dec)} ${c.unit}</span></div>
      <div class="inv-row"><span class="inv-label">کل خرید</span><span class="inv-val neu">${fN(d.buyAmt,dec)} ${c.unit}</span></div>
      <div class="inv-row"><span class="inv-label">کل فروش</span><span class="inv-val neu">${fN(d.sellAmt,dec)} ${c.unit}</span></div>
      <div class="inv-row"><span class="inv-label">میانگین خرید</span><span class="inv-val neu">${fN(d.avgBuy)} تومان</span></div>
      <div class="inv-row"><span class="inv-label">سود/زیان (تومان)</span><span class="inv-val ${pC}">${pS}${fN(Math.abs(d.profitToman))} تومان</span></div>
      <div class="inv-row"><span class="inv-label">سود/زیان (درهم)</span><span class="inv-val ${paC}">${paS}${fN(Math.abs(profitAED),2)} درهم</span></div>
    </div>`;
  }).join('');
  grid.innerHTML=cards||`<div class="es"><img src="${LOGO_SRC}" alt=""/><div class="etag">WHALIXIR<br/>BY SHAMSADDIN MOLLAEI</div></div>`;
}

// ── CHART صفحه نمودار ──────────────────────────────────────────
let chartPeriod='monthly';
let aedChartInstance=null;
let aedRateHistory=[];  // [{date, rate}] — تاریخچه نرخ درهم
let aedTargetPct=0;     // درصد اضافه بر ۴۰۰۰۰

// ذخیره نرخ درهم روزانه (هر بار صفحه باز میشود ثبت میشود)
function recordAEDRate(){
  const today=new Date().toISOString().slice(0,10);
  const r=rates['AED']||0;
  if(!r) return;
  try{
    let hist=JSON.parse(localStorage.getItem('wx_aed_hist')||'[]');
    // آپدیت یا اضافه
    const idx=hist.findIndex(h=>h.d===today);
    if(idx>=0) hist[idx].r=r;
    else hist.push({d:today,r:r});
    // نگه داشتن ۹۰ روز آخر
    if(hist.length>90) hist=hist.slice(-90);
    localStorage.setItem('wx_aed_hist',JSON.stringify(hist));
    aedRateHistory=hist;
  }catch(_){}
}
function loadAEDHistory(){
  try{
    aedRateHistory=JSON.parse(localStorage.getItem('wx_aed_hist')||'[]');
  }catch(_){aedRateHistory=[];}
}

function calcCumulativePL(){
  // محاسبه سود/زیان تجمعی واقعی بر اساس ارزش لحظهای
  const aedRate=rates['AED']||1;
  const{totalProfitToman,totalProfitAED}=calcAll();

  // برای نمودار ماهانه: سود/زیان انباشته بر اساس تراکنشها
  const months={};
  for(const tx of txs){
    const d=new Date(tx.ts);
    const key=d.getFullYear()+'-'+(d.getMonth()+1).toString().padStart(2,'0');
    if(!months[key]) months[key]={buyToman:0,sellToman:0};
    if(tx.type==='buy') months[key].buyToman+=tx.total;
    else months[key].sellToman+=tx.total;
  }
  const sorted=Object.entries(months).sort((a,b)=>a[0].localeCompare(b[0]));
  const labels=[],plT=[],plA=[];
  let cumT=0,cumA=0;
  for(const [key,v] of sorted){
    const [yr,mo]=key.split('-');
    labels.push(jalaliMonth(parseInt(yr),parseInt(mo)));
    cumT+=v.sellToman-v.buyToman;
    cumA=cumT/aedRate;
    plT.push(Math.round(cumT));
    plA.push(parseFloat(cumA.toFixed(2)));
  }
  // آخرین نقطه را با سود واقعی جایگزین کن (شامل ارزش موجودی)
  if(plT.length){
    plT[plT.length-1]=Math.round(totalProfitToman);
    plA[plA.length-1]=parseFloat(totalProfitAED.toFixed(2));
  }
  return{labels,plT,plA};
}

function renderChart(){
  const canvas=$('myChart');
  const isDark=document.body.classList.contains('dark');
  const gc=isDark?'rgba(255,255,255,.07)':'rgba(0,0,0,.07)';
  const tc=isDark?'#90aec9':'#2c5282';
  if(chartInstance) chartInstance.destroy();

  const{totalProfitToman,totalProfitAED}=calcAll();

  let labels,plT,plA;
  if(chartPeriod==='daily'){
    const dd=dailyData();
    labels=dd.labels;plT=dd.profitToman;plA=dd.profitAED;
  } else {
    const cd=calcCumulativePL();
    labels=cd.labels;plT=cd.plT;plA=cd.plA;
  }

  if(!labels.length){
    canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
    return;
  }

  // تعیین رنگ هر نقطه بر اساس مثبت/منفی بودن
  const ptColors=plT.map(v=>v>=0?'#26d782':'#ff5271');
  const paColors=plA.map(v=>v>=0?'#4f8cff':'#ff5271');

  chartInstance=new Chart(canvas,{
    data:{
      labels,
      datasets:[
        {
          type:'bar',
          label:'سود/زیان تومان',
          data:plT,
          backgroundColor:plT.map(v=>v>=0?'rgba(38,215,130,.65)':'rgba(255,82,113,.65)'),
          borderColor:ptColors,
          borderWidth:1.5,borderRadius:5,
          yAxisID:'y',order:2
        },
        {
          type:'line',
          label:'سود/زیان درهم',
          data:plA,
          borderColor:'#f5a623',
          backgroundColor:'rgba(245,166,35,.12)',
          borderWidth:2.5,
          pointBackgroundColor:paColors,
          pointBorderColor:paColors,
          pointRadius:5,tension:.35,fill:false,
          yAxisID:'y2',order:1,
          segment:{
            borderColor:ctx=>{
              const v=plA[ctx.p1DataIndex];
              return v>=0?'#f5a623':'#ff5271';
            }
          }
        }
      ]
    },
    options:{
      responsive:true,maintainAspectRatio:false,
      interaction:{mode:'index',intersect:false},
      plugins:{
        legend:{
          display:true,
          labels:{color:tc,font:{family:'Vazirmatn',size:11},
            usePointStyle:true,pointStyleWidth:10}
        },
        tooltip:{
          rtl:true,
          callbacks:{
            title:items=>'📅 '+items[0].label,
            label:ctx=>{
              const v=ctx.raw;
              const sign=v>=0?'▲ +':'▼ ';
              if(ctx.dataset.label==='سود/زیان تومان')
                return sign+fN(Math.abs(v))+' تومان';
              return sign+fN(Math.abs(v),2)+' درهم';
            },
            afterBody:()=>[
              '─────────────────',
              'سود کل: '+fN(Math.abs(totalProfitToman))+' تومان',
              'معادل: '+fN(Math.abs(totalProfitAED),2)+' درهم'
            ]
          }
        }
      },
      scales:{
        x:{ticks:{color:tc,font:{family:'Vazirmatn'}},grid:{color:gc}},
        y:{
          position:'right',
          ticks:{color:'#26d782',font:{family:'Vazirmatn'},callback:v=>{
            if(Math.abs(v)>=1000000) return fN(v/1000000,1)+'M ت';
            if(Math.abs(v)>=1000) return fN(v/1000,0)+'K ت';
            return fN(v)+' ت';
          }},
          grid:{color:gc}
        },
        y2:{
          position:'left',
          ticks:{color:'#f5a623',font:{family:'Vazirmatn'},callback:v=>fN(v,1)+' د'},
          grid:{display:false}
        }
      }
    }
  });
}

const chartDailyBtn=$('chartDaily'),chartMonthlyBtn=$('chartMonthly');
if(chartDailyBtn&&chartMonthlyBtn){
  chartDailyBtn.onclick=()=>{chartPeriod='daily';chartDailyBtn.classList.add('active');chartMonthlyBtn.classList.remove('active');renderChart();renderAEDChart();};
  chartMonthlyBtn.onclick=()=>{chartPeriod='monthly';chartMonthlyBtn.classList.add('active');chartDailyBtn.classList.remove('active');renderChart();renderAEDChart();};
}

// ── نمودار نرخ درهم ─────────────────────────────────────────────
function injectAEDChartUI(){
  const chartTab=document.getElementById('tab-chart');
  if(!chartTab||document.getElementById('wxAEDChartWrap')) return;

  const wrap=document.createElement('div');
  wrap.id='wxAEDChartWrap';
  wrap.style.cssText='margin:18px 0 8px;';
  wrap.innerHTML=`
    <div style="background:var(--glass);backdrop-filter:blur(16px);border:1px solid var(--glass-border);border-radius:18px;padding:14px 16px 10px;box-shadow:var(--sh2)">
      <div style="font-size:.9rem;font-weight:700;color:var(--ac);margin-bottom:10px">📈 نمودار نرخ درهم (AED) — روزانه</div>
      <div style="height:200px"><canvas id="wxAEDCanvas"></canvas></div>
      <div style="display:flex;align-items:center;gap:10px;margin-top:12px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:6px">
          <div style="width:28px;height:3px;background:#4f8cff;border-radius:2px"></div>
          <span style="font-size:.75rem;color:var(--tx2)">نرخ روزانه</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <div style="width:28px;height:3px;background:#f5c842;border-radius:2px;border:1px dashed #f5c842"></div>
          <span style="font-size:.75rem;color:var(--tx2)">خط هدف</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-right:auto">
          <span style="font-size:.78rem;color:var(--tx3)">هدف: ۴۰۰۰۰ +</span>
          <input id="wxAEDPctInput" type="number" min="0" max="200" step="0.1" value="0"
            style="width:70px;background:rgba(255,255,255,.07);border:1px solid var(--br);border-radius:8px;color:var(--tx1);font-family:var(--font);font-size:.85rem;padding:5px 8px;outline:none;text-align:center"/>
          <span style="font-size:.78rem;color:var(--tx3)">٪</span>
          <span id="wxAEDTargetLabel" style="font-size:.8rem;color:var(--gold);font-weight:700">= ۴۰۰۰۰</span>
        </div>
      </div>
    </div>`;

  // اضافه کردن بعد از نمودار اصلی
  const mainChartParent=document.querySelector('#tab-chart .chart-wrap')||document.querySelector('#tab-chart canvas')?.parentNode;
  if(mainChartParent && mainChartParent.parentNode){
    mainChartParent.parentNode.insertBefore(wrap, mainChartParent.nextSibling);
  } else {
    chartTab.appendChild(wrap);
  }

  // رویداد input درصد
  const pctInput=document.getElementById('wxAEDPctInput');
  const targetLabel=document.getElementById('wxAEDTargetLabel');
  if(pctInput){
    pctInput.addEventListener('input',()=>{
      aedTargetPct=parseFloat(pctInput.value)||0;
      const target=40000*(1+aedTargetPct/100);
      if(targetLabel) targetLabel.textContent='= '+fN(Math.round(target));
      renderAEDChart();
    });
  }
}

function renderAEDChart(){
  const canvas=document.getElementById('wxAEDCanvas');
  if(!canvas) return;

  const existing=Chart.getChart(canvas);
  if(existing) existing.destroy();

  if(!aedRateHistory.length){
    // اگر تاریخچه نداریم، فقط نرخ امروز را نشان بده
    const today=new Date().toISOString().slice(0,10);
    const r=rates['AED']||0;
    if(r) aedRateHistory=[{d:today,r:r}];
    else return;
  }

  const sorted=[...aedRateHistory].sort((a,b)=>a.d.localeCompare(b.d));
  const labels=sorted.map(h=>new Date(h.d).toLocaleDateString('fa-IR',{month:'short',day:'numeric'}));
  const rateData=sorted.map(h=>h.r);
  const target=40000*(1+aedTargetPct/100);
  // خط هدف: null تا آخرین نقطه موجود، از آنجا target
  const lastIdx=sorted.length-1;
  const targetLine=sorted.map((_,i)=>i===lastIdx?target:null);

  const isDark=document.body.classList.contains('dark');
  const gc=isDark?'rgba(255,255,255,.07)':'rgba(0,0,0,.07)';
  const tc=isDark?'#90aec9':'#2c5282';

  // حداقل و حداکثر برای محور Y
  const minR=Math.min(...rateData,target)*0.98;
  const maxR=Math.max(...rateData,target)*1.02;

  new Chart(canvas,{
    type:'line',
    data:{
      labels,
      datasets:[
        {
          label:'نرخ درهم (تومان)',
          data:rateData,
          borderColor:'#4f8cff',
          backgroundColor:'rgba(79,140,255,.1)',
          borderWidth:2.5,
          pointRadius:sorted.length<=14?4:2,
          pointBackgroundColor:'#4f8cff',
          tension:.3,
          fill:true
        },
        {
          label:'خط هدف ('+fN(Math.round(target))+')',
          data:targetLine,
          borderColor:'#f5c842',
          backgroundColor:'rgba(245,200,66,.08)',
          borderWidth:2.5,
          pointRadius:0,
          tension:0,
          fill:false
        }
      ]
    },
    options:{
      responsive:true,maintainAspectRatio:false,
      interaction:{mode:'index',intersect:false},
      plugins:{
        legend:{labels:{color:tc,font:{family:'Vazirmatn',size:10},usePointStyle:true}},
        tooltip:{
          rtl:true,
          callbacks:{
            label:ctx=>{
              if(ctx.datasetIndex===0) return 'نرخ: '+fN(ctx.raw)+' تومان';
              return 'هدف: '+fN(Math.round(target))+' تومان';
            },
            afterBody:items=>{
              const rate=items.find(i=>i.datasetIndex===0);
              if(rate){
                const diff=rate.raw-target;
                const sign=diff>=0?'▲ +':'▼ ';
                return ['فاصله از هدف: '+sign+fN(Math.abs(Math.round(diff)))+' تومان'];
              }
              return [];
            }
          }
        }
      },
      scales:{
        x:{ticks:{color:tc,font:{family:'Vazirmatn',size:10},maxRotation:45},grid:{color:gc}},
        y:{
          min:minR,max:maxR,
          ticks:{color:'#4f8cff',font:{family:'Vazirmatn'},callback:v=>fN(v/1000,0)+'K'},
          grid:{color:gc}
        }
      }
    }
  });
}

// ── landscape fullscreen chart ─────────────────────────────────────
(function initChartLandscape(){
  const canvas=$('myChart');if(!canvas) return;
  const originalParent=canvas.parentNode,originalNextSibling=canvas.nextSibling;
  const fsHost=document.createElement('div');
  fsHost.id='wxChartFsHost';
  fsHost.style.cssText='display:none;position:fixed;top:0;left:0;right:0;bottom:0;width:100vw;height:100vh;z-index:99999;padding:10px;box-sizing:border-box;';
  document.body.appendChild(fsHost);
  let fsActive=false;
  function isMobileSize(){return Math.min(window.innerWidth,window.innerHeight)<=820;}
  function isLandscape(){return window.matchMedia?window.matchMedia('(orientation: landscape)').matches:window.innerWidth>window.innerHeight;}
  function resetCanvasSize(){canvas.style.width='';canvas.style.height='';canvas.removeAttribute('width');canvas.removeAttribute('height');}
  function enterFullscreen(){
    if(fsActive) return;fsActive=true;
    fsHost.style.background=document.body.classList.contains('dark')?'#0b1120':'#ffffff';
    fsHost.appendChild(canvas);fsHost.style.display='block';
    document.body.classList.add('wx-chart-fs-active');
    resetCanvasSize();canvas.style.width='100%';canvas.style.height='100%';
    requestAnimationFrame(()=>requestAnimationFrame(renderChart));
  }
  function exitFullscreen(){
    if(!fsActive) return;fsActive=false;
    if(originalNextSibling&&originalNextSibling.parentNode===originalParent)
      originalParent.insertBefore(canvas,originalNextSibling);
    else originalParent.appendChild(canvas);
    fsHost.style.display='none';document.body.classList.remove('wx-chart-fs-active');
    resetCanvasSize();requestAnimationFrame(()=>requestAnimationFrame(renderChart));
  }
  function applyChartOrientation(){
    const chartTab=document.getElementById('tab-chart');
    const onChartTab=!!(chartTab&&chartTab.classList.contains('active'));
    if(isLandscape()&&isMobileSize()&&onChartTab) enterFullscreen();else exitFullscreen();
  }
  window.addEventListener('orientationchange',()=>setTimeout(applyChartOrientation,250));
  window.addEventListener('resize',()=>{clearTimeout(window._wxChartResizeT);window._wxChartResizeT=setTimeout(applyChartOrientation,150);});
  const origTab2=window.tab;
  if(typeof origTab2==='function'){
    window.tab=function(id){origTab2(id);if(id==='chart')setTimeout(applyChartOrientation,120);else exitFullscreen();};
  }
  applyChartOrientation();
})();

function renderRates(){
  $('rg').innerHTML=Object.entries(CUR).map(([c,v])=>`
    <div class="rc" data-c="${c}">
      <div class="rf">${v.flag}</div><div class="rn">${v.name}</div>
      <div class="rco">${c}</div><div class="rv">${fN(rates[c])}</div>
      <div class="ru">تومان / ${v.unit}</div><div class="reh">کلیک برای ویرایش دستی</div>
    </div>`).join('');
  $('rg').querySelectorAll('.rc').forEach(card=>{
    card.onclick=async()=>{
      const c=card.dataset.c;if(card.querySelector('.rei')) return;
      const inp=document.createElement('input');
      inp.className='rei';inp.type='text';inp.inputMode='decimal';inp.value=rates[c];
      card.appendChild(inp);inp.focus();
      const save=async()=>{
        const v=parseFloat(inp.value);
        if(v>0){rates[c]=v;localStorage.setItem('wx_rates',JSON.stringify(rates));
          try{await api('/rates/'+c,{method:'PUT',body:JSON.stringify({value:v})});}catch(_){}
          render();toast('نرخ '+CUR[c].name+' بروز شد ✓','ok');}
        inp.remove();
      };
      inp.onkeydown=e=>{if(e.key==='Enter')save();if(e.key==='Escape')inp.remove();};
      inp.onblur=()=>setTimeout(()=>{if(card.contains(inp))inp.remove();},200);
    };
  });
}

const emptyHTML=()=>`<div class="es"><img src="${LOGO_SRC}" alt=""/><div class="etag">WHALIXIR<br/>BY SHAMSADDIN MOLLAEI</div></div>`;

function txHTML(tx){
  const c=CUR[tx.code];
  const buys=txs.filter(t=>t.type==='buy'&&t.code===tx.code&&t.ts<=tx.ts);
  const ba=buys.reduce((s,t)=>s+t.amount,0),bt=buys.reduce((s,t)=>s+t.total,0);
  const avgBuy=ba>0?bt/ba:0;
  const profit=tx.type==='sell'?(tx.rate-avgBuy)*tx.amount:0;
  const pc=profit>=0?'var(--gr)':'var(--rd)',ps=profit>=0?'+':'';
  return `<div class="ti-wrap" data-id="${tx.id}">
    <div class="ti-del-bg" data-id="${tx.id}">🗑 حذف</div>
    <div class="ti">
      <div class="tbg ${tx.type}">${c.flag}</div>
      <div class="tin">
        <div class="tm"><span class="tt2">${tx.type==='buy'?'خرید':'فروش'} ${c.name}</span>
          <span class="ta" style="color:${tx.type==='buy'?'var(--gr)':'var(--rd)'}">${tx.type==='buy'?'+':'-'}${fN(tx.amount)} ${c.unit}</span></div>
        <div class="tsb"><span class="tr">نرخ: ${fN(tx.rate)} تومان</span><span class="td2">${fD(tx.ts)}</span></div>
        ${tx.note?`<div class="tn">📝 ${tx.note}</div>`:''}
        ${tx.type==='sell'?`<div style="font-size:.75rem;color:${pc};margin-top:3px">سود/زیان: ${ps}${fN(Math.abs(profit))} تومان</div>`:''}
      </div>
      <div class="tto"><div class="ttv">${fN(tx.total)}</div><div class="ttl">تومان</div></div>
    </div>
  </div>`;
}

function bindDel(el){
  el.querySelectorAll('.ti-wrap').forEach(wrap=>{
    const inner=wrap.querySelector('.ti'),delBg=wrap.querySelector('.ti-del-bg'),id=wrap.dataset.id;
    let startX=0,curX=0,dragging=false,revealed=false;const REVEAL=90;
    const onStart=e=>{startX=(e.touches?e.touches[0].clientX:e.clientX);curX=0;dragging=true;inner.style.transition='none';};
    const onMove=e=>{
      if(!dragging) return;
      const x=(e.touches?e.touches[0].clientX:e.clientX)-startX;
      if(x<0){inner.style.transform='translateX(0)';curX=0;return;}
      curX=Math.min(x,REVEAL+10);inner.style.transform=`translateX(${curX}px)`;
      if(e.cancelable) e.preventDefault();
    };
    const onEnd=()=>{
      if(!dragging) return;dragging=false;inner.style.transition='transform .25s ease';
      if(curX>=REVEAL){inner.style.transform=`translateX(${REVEAL}px)`;revealed=true;}
      else{inner.style.transform='translateX(0)';revealed=false;}curX=0;
    };
    inner.addEventListener('touchstart',onStart,{passive:true});
    inner.addEventListener('touchmove',onMove,{passive:false});
    inner.addEventListener('touchend',onEnd);
    inner.addEventListener('mousedown',onStart);
    document.addEventListener('mousemove',e=>{if(dragging) onMove(e);});
    document.addEventListener('mouseup',()=>{if(dragging) onEnd();});
    inner.addEventListener('click',()=>{if(revealed){inner.style.transition='transform .25s ease';inner.style.transform='translateX(0)';revealed=false;}});
    if(delBg){
      delBg.addEventListener('click',async e=>{
        e.stopPropagation();if(!revealed) return;
        const tx=txs.find(t=>String(t.id)===String(id));if(!tx) return;
        trash.unshift({...tx,deletedAt:Date.now()});
        localStorage.setItem('wx_trash',JSON.stringify(trash));
        txs=txs.filter(t=>String(t.id)!==String(id));
        localStorage.setItem('wx_tx',JSON.stringify(txs));
        wrap.style.overflow='hidden';wrap.style.maxHeight=wrap.offsetHeight+'px';
        wrap.style.transition='max-height .3s ease, opacity .3s ease';wrap.style.opacity='0';
        setTimeout(()=>wrap.style.maxHeight='0',50);
        setTimeout(async()=>{render();try{await api('/transactions/'+id,{method:'DELETE'});}catch(_){}toast('تراکنش به سطل آشغال رفت 🗑','');},320);
      });
    }
  });
}

function renderRecent(){
  const el=$('rl'),r=txs.slice(0,5);
  const html=r.length?r.map(txHTML).join(''):emptyHTML();
  if(el.dataset.wxHtml===html) return;
  el.dataset.wxHtml=html;el.innerHTML=html;bindDel(el);
}
function renderTxs(){
  const el=$('tl');let list=txs;
  if(filter!=='all'){
    if(filter==='buy'||filter==='sell') list=list.filter(t=>t.type===filter);
    else list=list.filter(t=>t.code===filter);
  }
  const html=list.length?list.map(txHTML).join(''):emptyHTML();
  if(el.dataset.wxHtml===html) return;
  el.dataset.wxHtml=html;el.innerHTML=html;bindDel(el);
}

$('tab-transactions').onclick=e=>{
  const b=e.target.closest('.ftb');if(!b) return;
  filter=b.dataset.f;
  document.querySelectorAll('.ftb').forEach(x=>x.classList.toggle('active',x===b));
  renderTxs();
};
$('ca').onclick=async()=>{
  if(!confirm('همه تراکنشها حذف شوند؟')) return;
  txs=[];localStorage.setItem('wx_tx','[]');render();
  try{await api('/transactions',{method:'DELETE'});}catch(_){}
  toast('پاک شد','');
};

$('buyBtn').onclick=()=>{playClick();tradeType='buy';$('buyBtn').classList.add('active');$('sellBtn').classList.remove('active');updateSummary();};
$('sellBtn').onclick=()=>{playClick();tradeType='sell';$('sellBtn').classList.add('active');$('buyBtn').classList.remove('active');updateSummary();};

function fmtNumInp(el){
  const pos=el.selectionStart;
  const commasBefore=(el.value.slice(0,pos).match(/,/g)||[]).length;
  const raw=(el.value||'').replace(/,/g,'').replace(/\D/g,'');
  const formatted=raw.replace(/\B(?=(\d{3})+(?!\d))/g,',');
  el.value=formatted;
  const commasAfter=(formatted.slice(0,pos).match(/,/g)||[]).length;
  const newPos=Math.min(pos+(commasAfter-commasBefore),formatted.length);
  try{el.setSelectionRange(newPos,newPos);}catch(e){}
}
(function initNumericInputs(){
  ['ai','ri'].forEach(id=>{
    const el=$(id);if(!el) return;
    el.type='text';el.setAttribute('inputmode','numeric');el.setAttribute('pattern','[0-9,]*');
    el.addEventListener('input',()=>fmtNumInp(el));
  });
})();

$('usr').onclick=()=>{const v=rates[$('cs').value];$('ri').value=v||'';fmtNumInp($('ri'));updateSummary();};
$('cs').oninput=updateSummary;
$('ai').oninput=()=>{fmtNumInp($('ai'));updateSummary();};
$('ri').oninput=()=>{fmtNumInp($('ri'));updateSummary();};

function updateSummary(){
  const c=$('cs').value,am=parseFloat(($('ai').value||'').replace(/,/g,''))||0,rt=parseFloat(($('ri').value||'').replace(/,/g,''))||0;
  const box=$('tsu');
  if(!am||!rt){box.innerHTML='<span style="color:var(--tx3)">مقدار و نرخ را وارد کنید.</span>';return;}
  const tot=am*rt,sv=rates[c],diff=rt-sv,pct=sv?((diff/sv)*100).toFixed(1):0;
  const dc=diff>0?'var(--rd)':'var(--gr)',ds=diff>0?'+':'';
  box.innerHTML=`<div style="display:flex;flex-direction:column;gap:5px">
    <div>💱 <b>${fN(am)}</b> ${CUR[c].unit} × <b>${fN(rt)}</b> = <b style="color:var(--ac)">${fN(tot)}</b> تومان</div>
    <div>📊 نرخ پایه: <b>${fN(sv)}</b> | اختلاف: <span style="color:${dc}">${ds}${fN(diff)} (${ds}${pct}٪)</span></div>
    <div>${tradeType==='buy'?'🟢 <b style="color:var(--gr)">خرید</b>':'🔴 <b style="color:var(--rd)">فروش</b>'} ${CUR[c].name}</div>
  </div>`;
}

$('sub').onclick=async()=>{
  const c=$('cs').value,am=parseFloat(($('ai').value||'').replace(/,/g,'')),rt=parseFloat(($('ri').value||'').replace(/,/g,'')),nt=$('ni').value.trim();
  if(!am||am<=0){toast('مقدار را وارد کنید','err');return;}
  if(!rt||rt<=0){toast('نرخ را وارد کنید','err');return;}
  const tx={id:Date.now(),type:tradeType,code:c,amount:am,rate:rt,total:am*rt,note:nt,ts:Date.now(),savedRate:rates[c]};
  txs.unshift(tx);localStorage.setItem('wx_tx',JSON.stringify(txs));render();
  $('ai').value='';$('ri').value='';$('ni').value='';$('tsu').innerHTML='';
  toast('✅ معامله ثبت شد!','ok');playSuccess();tab('dashboard');
  try{const r=await api('/transactions',{method:'POST',body:JSON.stringify(tx)});if(r.id){tx.id=r.id;localStorage.setItem('wx_tx',JSON.stringify(txs));}}catch(_){}
};

function renderTrash(){
  const el=$('trashList');if(!el) return;
  if(!trash.length){el.innerHTML=`<div class="es"><div style="font-size:3rem">🗑</div><div class="etag" style="margin-top:8px">سطل خالی است</div></div>`;return;}
  el.innerHTML=trash.map(tx=>{
    const c=CUR[tx.code]||{flag:'?',name:tx.code,unit:''};
    return `<div class="ti" style="opacity:.75">
      <div class="tbg ${tx.type}">${c.flag}</div>
      <div class="tin">
        <div class="tm"><span class="tt2">${tx.type==='buy'?'خرید':'فروش'} ${c.name}</span>
          <span class="ta" style="color:var(--tx3)">${fN(tx.amount)} ${c.unit}</span></div>
        <div class="tsb"><span class="tr">نرخ: ${fN(tx.rate)} تومان</span><span class="td2">${fD(tx.ts)}</span></div>
        ${tx.note?`<div class="tn">📝 ${tx.note}</div>`:''}
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
        <button class="trash-restore" data-id="${tx.id}" style="background:none;border:1px solid var(--gr);color:var(--gr);font-family:var(--font);font-size:.75rem;padding:4px 10px;border-radius:6px;cursor:pointer">↩ بازگردانی</button>
        <button class="trash-del" data-id="${tx.id}" style="background:none;border:1px solid var(--rd);color:var(--rd);font-family:var(--font);font-size:.75rem;padding:4px 10px;border-radius:6px;cursor:pointer">✕ حذف کامل</button>
      </div>
    </div>`;
  }).join('');
  el.querySelectorAll('.trash-restore').forEach(btn=>{
    btn.onclick=async()=>{
      const id=btn.dataset.id,tx=trash.find(t=>String(t.id)===String(id));if(!tx) return;
      trash=trash.filter(t=>String(t.id)!==String(id));
      localStorage.setItem('wx_trash',JSON.stringify(trash));
      const r={...tx};delete r.deletedAt;txs.unshift(r);
      localStorage.setItem('wx_tx',JSON.stringify(txs));
      try{await api('/transactions',{method:'POST',body:JSON.stringify(r)});}catch(_){}
      render();toast('تراکنش بازگردانده شد ✓','ok');
    };
  });
  el.querySelectorAll('.trash-del').forEach(btn=>{
    btn.onclick=()=>{
      trash=trash.filter(t=>String(t.id)!==String(btn.dataset.id));
      localStorage.setItem('wx_trash',JSON.stringify(trash));render();toast('تراکنش برای همیشه حذف شد','');
    };
  });
}

const restoreAllBtn=$('restoreAll');
if(restoreAllBtn){
  restoreAllBtn.onclick=async()=>{
    if(!trash.length){toast('سطل خالی است','');return;}
    for(const tx of trash){const r={...tx};delete r.deletedAt;txs.unshift(r);try{await api('/transactions',{method:'POST',body:JSON.stringify(r)});}catch(_){}}
    trash=[];localStorage.setItem('wx_trash','[]');localStorage.setItem('wx_tx',JSON.stringify(txs));render();toast('همه تراکنشها بازگردانده شدند ✓','ok');
  };
}
const emptyTrashBtn=$('emptyTrash');
if(emptyTrashBtn){
  emptyTrashBtn.onclick=()=>{
    if(!trash.length){toast('سطل خالی است','');return;}
    if(!confirm('همه موارد سطل آشغال برای همیشه حذف شوند؟')) return;
    trash=[];localStorage.setItem('wx_trash','[]');render();toast('سطل خالی شد','');
  };
}

// ── PIN ───────────────────────────────────────────────────────────
function dots(){$('pd').querySelectorAll('span').forEach((s,i)=>s.classList.toggle('f',i<pin.length));}
function enter(){
  if(pin===PIN){
    const ls=$('ls');
    ls.style.cssText='transition:all .35s ease;opacity:0;transform:scale(1.06)';
    setTimeout(()=>{
      ls.classList.add('hidden');
      $('app').classList.remove('hidden');
      loadLocal();
      loadAPI().then(()=>fetchTgjuRates(false));
      if(!window._wxAutoRefresh) window._wxAutoRefresh=setInterval(()=>fetchTgjuRates(false),30000);
      initSounds();
      injectBoursUI();
      injectPDFButton();
      removeTxNavBtn();
      loadAEDHistory();
      recordAEDRate();
      setTimeout(()=>{injectAEDChartUI();renderAEDChart();},500);
    },350);
  } else {
    $('pe').textContent='❌ رمز اشتباه است';
    pin='';dots();setTimeout(()=>$('pe').textContent='',2000);
  }
}
document.querySelectorAll('.pb[data-n]').forEach(b=>{
  b.onclick=()=>{if(pin.length<4){pin+=b.dataset.n;dots();if(pin.length===4)enter();}};
});
$('pc').onclick=()=>{pin=pin.slice(0,-1);dots();};
$('pok').onclick=()=>{if(pin.length===4)enter();};

document.body.className=localStorage.getItem('wx_theme')||'dark';
$('tt').onclick=()=>{
  const t=document.body.classList.contains('dark')?'light':'dark';
  document.body.className=t;localStorage.setItem('wx_theme',t);
  if(chartInstance) renderChart();
};

// ── حذف دکمه تراکنش از منوی پایین ──────────────────────────────
function removeTxNavBtn(){
  const mobNav=document.querySelector('.mob-nav');if(!mobNav) return;
  const txBtn=[...mobNav.querySelectorAll('.mob-nav-btn')].find(b=>
    b.dataset.tab==='transactions'||b.textContent.includes('تراکنش'));
  if(txBtn) txBtn.remove();
}

// ══════════════════════════════════════════════════════════════════
// BOURS — بورس کاملاً مستقل
// ══════════════════════════════════════════════════════════════════
let boursData={tsetmc:[],dfm:[]};

function boursLoadLocal(){
  try{const s=localStorage.getItem('wx_bours');if(s) boursData=JSON.parse(s);if(!boursData.tsetmc) boursData.tsetmc=[];if(!boursData.dfm) boursData.dfm=[];}catch(_){}
}
function boursSave(){localStorage.setItem('wx_bours',JSON.stringify(boursData));}

function boursCalcPL(records){
  return records.map((rec,i)=>{
    const prev=i>0?records[i-1]:null,prevVal=prev?prev.portfolio:0;
    const netFlow=(rec.deposit||0)-(rec.withdraw||0);
    const pl=prev?(rec.portfolio-prevVal-netFlow):0;
    return{...rec,pl,prevPortfolio:prevVal};
  });
}
function tomanToAED(toman){return toman/(rates['AED']||1);}

function renderBoursCharts(recT,recD){
  const isDark=document.body.classList.contains('dark');
  const gc=isDark?'rgba(255,255,255,.07)':'rgba(0,0,0,.07)',tc=isDark?'#90aec9':'#2c5282';
  const aedRate=rates['AED']||1;

  // TSETMC سود/زیان
  const ctxTPL=document.getElementById('boursChartTPL');
  if(ctxTPL&&recT.length){
    const ex=Chart.getChart(ctxTPL);if(ex) ex.destroy();
    const labelsT=recT.map(r=>toJalaliShort(r.date));
    const plT=recT.map(r=>r.pl),plA=recT.map(r=>r.pl/aedRate);
    new Chart(ctxTPL,{
      type:'line',
      data:{labels:labelsT,datasets:[
        {label:'سود/زیان تومان',data:plT,borderColor:'#26d782',backgroundColor:'rgba(38,215,130,.08)',
          borderWidth:2.5,pointRadius:5,pointBackgroundColor:plT.map(v=>v>=0?'#26d782':'#ff5271'),
          tension:.3,yAxisID:'y',
          segment:{borderColor:ctx=>plT[ctx.p1DataIndex]>=0?'#26d782':'#ff5271'}},
        {label:'سود/زیان درهم',data:plA,borderColor:'#4f8cff',backgroundColor:'rgba(79,140,255,.06)',
          borderWidth:2,pointRadius:4,pointBackgroundColor:plA.map(v=>v>=0?'#4f8cff':'#ff5271'),
          tension:.3,yAxisID:'y2',
          segment:{borderColor:ctx=>plA[ctx.p1DataIndex]>=0?'#4f8cff':'#ff5271'}}
      ]},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{labels:{color:tc,font:{family:'Vazirmatn',size:11}}},
          tooltip:{rtl:true,callbacks:{label:ctx=>ctx.dataset.label+': '+fN(ctx.raw,2)}}},
        scales:{x:{ticks:{color:tc,font:{family:'Vazirmatn',size:10}},grid:{color:gc}},
          y:{position:'right',ticks:{color:'#26d782',font:{family:'Vazirmatn'},callback:v=>fN(v)+' ت'},grid:{color:gc}},
          y2:{position:'left',ticks:{color:'#4f8cff',font:{family:'Vazirmatn'},callback:v=>fN(v,1)+' د'},grid:{display:false}}}}
    });
  }

  // TSETMC ارزش پرتفوی
  const ctxTPF=document.getElementById('boursChartTPF');
  if(ctxTPF&&recT.length){
    const ex=Chart.getChart(ctxTPF);if(ex) ex.destroy();
    new Chart(ctxTPF,{
      type:'bar',
      data:{labels:recT.map(r=>toJalaliShort(r.date)),datasets:[{
        label:'ارزش پرتفوی (تومان)',data:recT.map(r=>r.portfolio),
        backgroundColor:'rgba(79,140,255,.65)',borderColor:'#4f8cff',borderWidth:1,borderRadius:6
      }]},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{labels:{color:tc,font:{family:'Vazirmatn',size:11}}},
          tooltip:{rtl:true,callbacks:{label:ctx=>fN(ctx.raw)+' تومان'}}},
        scales:{x:{ticks:{color:tc,font:{family:'Vazirmatn',size:10}},grid:{color:gc}},
          y:{ticks:{color:'#4f8cff',font:{family:'Vazirmatn'},callback:v=>fN(v)+' ت'},grid:{color:gc}}}}
    });
  }

  // DFM ترکیبی
  const ctxD=document.getElementById('boursChartD');
  if(ctxD&&recD.length){
    const ex=Chart.getChart(ctxD);if(ex) ex.destroy();
    const labelsD=recD.map(r=>toJalaliShort(r.date));
    const plD=recD.map(r=>r.pl),pfD=recD.map(r=>r.portfolio);
    new Chart(ctxD,{
      data:{labels:labelsD,datasets:[
        {type:'bar',label:'ارزش پرتفوی (درهم)',data:pfD,backgroundColor:'rgba(79,140,255,.6)',borderColor:'#4f8cff',borderWidth:1,borderRadius:5,yAxisID:'y',order:2},
        {type:'line',label:'سود/زیان (درهم)',data:plD,borderColor:'#f5c842',backgroundColor:'rgba(245,200,66,.1)',borderWidth:2.5,
          pointRadius:5,pointBackgroundColor:plD.map(v=>v>=0?'#26d782':'#ff5271'),tension:.3,fill:false,yAxisID:'y2',order:1,
          segment:{borderColor:ctx=>plD[ctx.p1DataIndex]>=0?'#26d782':'#ff5271'}}
      ]},
      options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
        plugins:{legend:{labels:{color:tc,font:{family:'Vazirmatn',size:11}}},
          tooltip:{rtl:true,callbacks:{label:ctx=>ctx.dataset.label+': '+fN(ctx.raw,2)+' درهم'}}},
        scales:{x:{ticks:{color:tc,font:{family:'Vazirmatn',size:10}},grid:{color:gc}},
          y:{position:'right',ticks:{color:'#4f8cff',font:{family:'Vazirmatn'},callback:v=>fN(v,1)+' د'},grid:{color:gc}},
          y2:{position:'left',ticks:{color:'#f5c842',font:{family:'Vazirmatn'},callback:v=>fN(v,1)+' د'},grid:{display:false}}}}
    });
  }
}

function renderBours(){
  const page=document.getElementById('tab-bours');if(!page) return;
  const sortedT=[...boursData.tsetmc].sort((a,b)=>a.date.localeCompare(b.date));
  const sortedD=[...boursData.dfm].sort((a,b)=>a.date.localeCompare(b.date));
  const recT=boursCalcPL(sortedT),recD=boursCalcPL(sortedD);
  const lastT=recT.length?recT[recT.length-1]:null,lastD=recD.length?recD[recD.length-1]:null;
  const totalPLT=recT.reduce((s,r)=>s+r.pl,0),totalPLD=recD.reduce((s,r)=>s+r.pl,0);

  // تاریخ امروز به شمسی
  const todayJalali=new Date().toLocaleDateString('fa-IR',{year:'numeric',month:'2-digit',day:'2-digit'});

  const tableT=recT.length?`
  <div class="bours-table-wrap"><table class="bours-table">
    <thead><tr><th>تاریخ شمسی</th><th>ارزش (تومان)</th><th>≈ درهم</th><th>واریز</th><th>برداشت</th><th>سود/زیان</th><th>یادداشت</th><th></th></tr></thead>
    <tbody>${[...recT].reverse().map(r=>`<tr>
      <td style="white-space:nowrap">${toJalaliShort(r.date)}</td>
      <td class="num">${fN(r.portfolio)}</td>
      <td class="num" style="color:var(--tx3);font-size:.78rem">${fN(tomanToAED(r.portfolio),2)}</td>
      <td class="num ${(r.deposit||0)>0?'pos':''}">${r.deposit?fN(r.deposit):'-'}</td>
      <td class="num ${(r.withdraw||0)>0?'neg':''}">${r.withdraw?fN(r.withdraw):'-'}</td>
      <td class="num ${r.pl>0?'pos':r.pl<0?'neg':''}">${r.pl!==0?(r.pl>0?'+':'')+fN(Math.abs(r.pl)):'—'}</td>
      <td style="font-size:.76rem">${r.note||''}</td>
      <td><button class="bours-del-btn" data-section="tsetmc" data-id="${r.id}">🗑</button></td>
    </tr>`).join('')}</tbody>
  </table></div>`:`<div class="bours-empty">هنوز رکوردی ثبت نشده.</div>`;

  const tableD=recD.length?`
  <div class="bours-table-wrap"><table class="bours-table">
    <thead><tr><th>تاریخ شمسی</th><th>ارزش (درهم)</th><th>واریز</th><th>برداشت</th><th>سود/زیان</th><th>یادداشت</th><th></th></tr></thead>
    <tbody>${[...recD].reverse().map(r=>`<tr>
      <td style="white-space:nowrap">${toJalaliShort(r.date)}</td>
      <td class="num">${fN(r.portfolio,2)}</td>
      <td class="num ${(r.deposit||0)>0?'pos':''}">${r.deposit?fN(r.deposit,2):'-'}</td>
      <td class="num ${(r.withdraw||0)>0?'neg':''}">${r.withdraw?fN(r.withdraw,2):'-'}</td>
      <td class="num ${r.pl>0?'pos':r.pl<0?'neg':''}">${r.pl!==0?(r.pl>0?'+':'')+fN(Math.abs(r.pl),2):'—'}</td>
      <td style="font-size:.76rem">${r.note||''}</td>
      <td><button class="bours-del-btn" data-section="dfm" data-id="${r.id}">🗑</button></td>
    </tr>`).join('')}</tbody>
  </table></div>`:`<div class="bours-empty">هنوز رکوردی ثبت نشده.</div>`;

  page.innerHTML=`
  <div class="bours-page">
    <div class="bours-header">
      <div class="bours-title">📈 بورس</div>
      <div class="bours-subtitle">پیگیری هفتگی — مستقل از داشبورد اصلی</div>
    </div>
    <div class="bours-summary">
      <div class="bours-sum-card"><div class="bours-sum-label">سود/زیان TSETMC</div>
        <div class="bours-sum-val ${totalPLT>=0?'pos':'neg'}">${totalPLT>=0?'+':''}${fN(Math.abs(totalPLT))} ت</div>
        <div class="bours-sum-sub">${fN(tomanToAED(totalPLT),2)} درهم</div></div>
      <div class="bours-sum-card"><div class="bours-sum-label">سود/زیان DFM</div>
        <div class="bours-sum-val ${totalPLD>=0?'pos':'neg'}">${totalPLD>=0?'+':''}${fN(Math.abs(totalPLD),2)} درهم</div></div>
      ${lastT?`<div class="bours-sum-card"><div class="bours-sum-label">ارزش TSETMC</div>
        <div class="bours-sum-val neu">${fN(lastT.portfolio)} ت</div>
        <div class="bours-sum-sub">${fN(tomanToAED(lastT.portfolio),2)} د</div></div>`:''}
      ${lastD?`<div class="bours-sum-card"><div class="bours-sum-label">ارزش DFM</div>
        <div class="bours-sum-val neu">${fN(lastD.portfolio,2)} درهم</div></div>`:''}
    </div>

    <!-- TSETMC -->
    <div class="bours-section">
      <div class="bours-sec-header">
        <div class="bours-sec-title">🇮🇷 TSETMC — بورس تهران</div>
        <button class="bours-add-btn" id="boursAddT">➕ ثبت</button>
      </div>
      <div class="bours-form" id="boursFormT" style="display:none">
        <div class="bours-form-row"><label>تاریخ:</label><input type="date" id="bfT-date" value="${new Date().toISOString().slice(0,10)}"/></div>
        <div class="bours-form-row"><label>ارزش پرتفوی (تومان):</label><input type="text" id="bfT-val" inputmode="numeric" placeholder="150,000,000"/></div>
        <div class="bours-form-row"><label>واریز (تومان):</label><input type="text" id="bfT-dep" inputmode="numeric" placeholder="0"/></div>
        <div class="bours-form-row"><label>برداشت (تومان):</label><input type="text" id="bfT-wdr" inputmode="numeric" placeholder="0"/></div>
        <div class="bours-form-row"><label>یادداشت:</label><input type="text" id="bfT-note" placeholder="اختیاری"/></div>
        <div class="bours-form-btns"><button id="bfT-save" class="bours-btn-save">✅ ثبت</button><button id="bfT-cancel" class="bours-btn-cancel">❌ لغو</button></div>
      </div>
      ${tableT}
    </div>

    ${recT.length?`
    <div class="bours-section bours-chart-section">
      <div class="bours-sec-header"><div class="bours-sec-title">📊 نمودار سود/زیان TSETMC</div></div>
      <div style="height:210px;padding:12px"><canvas id="boursChartTPL"></canvas></div>
      <div class="bours-sec-header"><div class="bours-sec-title">📊 ارزش پرتفوی TSETMC</div></div>
      <div style="height:190px;padding:12px"><canvas id="boursChartTPF"></canvas></div>
    </div>`:''}

    <!-- DFM -->
    <div class="bours-section">
      <div class="bours-sec-header">
        <div class="bours-sec-title">🇦🇪 DFM — بورس دبی</div>
        <button class="bours-add-btn" id="boursAddD">➕ ثبت</button>
      </div>
      <div class="bours-form" id="boursFormD" style="display:none">
        <div class="bours-form-row"><label>تاریخ:</label><input type="date" id="bfD-date" value="${new Date().toISOString().slice(0,10)}"/></div>
        <div class="bours-form-row"><label>ارزش پرتفوی (درهم):</label><input type="text" id="bfD-val" inputmode="numeric" placeholder="50,000"/></div>
        <div class="bours-form-row"><label>واریز (درهم):</label><input type="text" id="bfD-dep" inputmode="numeric" placeholder="0"/></div>
        <div class="bours-form-row"><label>برداشت (درهم):</label><input type="text" id="bfD-wdr" inputmode="numeric" placeholder="0"/></div>
        <div class="bours-form-row"><label>یادداشت:</label><input type="text" id="bfD-note" placeholder="اختیاری"/></div>
        <div class="bours-form-btns"><button id="bfD-save" class="bours-btn-save">✅ ثبت</button><button id="bfD-cancel" class="bours-btn-cancel">❌ لغو</button></div>
      </div>
      ${tableD}
    </div>

    ${recD.length?`
    <div class="bours-section bours-chart-section">
      <div class="bours-sec-header"><div class="bours-sec-title">📊 نمودار ترکیبی DFM</div></div>
      <div style="height:230px;padding:12px"><canvas id="boursChartD"></canvas></div>
    </div>`:''}
  </div>`;

  // رویدادها
  page.querySelector('#boursAddT').onclick=()=>{playClick();const f=page.querySelector('#boursFormT');f.style.display=f.style.display==='none'?'block':'none';};
  page.querySelector('#bfT-cancel').onclick=()=>{page.querySelector('#boursFormT').style.display='none';};
  ['bfT-val','bfT-dep','bfT-wdr'].forEach(id=>{const el=page.querySelector('#'+id);if(el) el.addEventListener('input',()=>fmtNumInp(el));});
  page.querySelector('#bfT-save').onclick=()=>{
    playSuccess();
    const date=page.querySelector('#bfT-date').value;
    const val=parseFloat((page.querySelector('#bfT-val').value||'').replace(/,/g,''));
    const dep=parseFloat((page.querySelector('#bfT-dep').value||'').replace(/,/g,''))||0;
    const wdr=parseFloat((page.querySelector('#bfT-wdr').value||'').replace(/,/g,''))||0;
    const note=page.querySelector('#bfT-note').value.trim();
    if(!date||!val||val<=0){toast('تاریخ و ارزش اجباری است','err');return;}
    boursData.tsetmc.push({id:Date.now(),date,portfolio:val,deposit:dep,withdraw:wdr,note});
    boursSave();toast('✅ رکورد TSETMC ثبت شد','ok');renderBours();
  };
  page.querySelector('#boursAddD').onclick=()=>{playClick();const f=page.querySelector('#boursFormD');f.style.display=f.style.display==='none'?'block':'none';};
  page.querySelector('#bfD-cancel').onclick=()=>{page.querySelector('#boursFormD').style.display='none';};
  ['bfD-val','bfD-dep','bfD-wdr'].forEach(id=>{const el=page.querySelector('#'+id);if(el) el.addEventListener('input',()=>fmtNumInp(el));});
  page.querySelector('#bfD-save').onclick=()=>{
    playSuccess();
    const date=page.querySelector('#bfD-date').value;
    const val=parseFloat((page.querySelector('#bfD-val').value||'').replace(/,/g,''));
    const dep=parseFloat((page.querySelector('#bfD-dep').value||'').replace(/,/g,''))||0;
    const wdr=parseFloat((page.querySelector('#bfD-wdr').value||'').replace(/,/g,''))||0;
    const note=page.querySelector('#bfD-note').value.trim();
    if(!date||!val||val<=0){toast('تاریخ و ارزش اجباری است','err');return;}
    boursData.dfm.push({id:Date.now(),date,portfolio:val,deposit:dep,withdraw:wdr,note});
    boursSave();toast('✅ رکورد DFM ثبت شد','ok');renderBours();
  };
  page.querySelectorAll('.bours-del-btn').forEach(btn=>{
    btn.onclick=()=>{
      if(!confirm('این رکورد حذف شود؟')) return;
      const sec=btn.dataset.section,id=String(btn.dataset.id);
      boursData[sec]=boursData[sec].filter(r=>String(r.id)!==id);
      boursSave();renderBours();
    };
  });
  setTimeout(()=>renderBoursCharts(recT,recD),80);
}

// ── تزریق CSS بورس + تب ──────────────────────────────────────────
function injectBoursUI(){
  if(document.getElementById('bours-style')) return;
  const s=document.createElement('style');
  s.id='bours-style';
  s.textContent=`
  .bours-page{padding:12px 8px 100px;max-width:900px;margin:0 auto;}
  .bours-header{text-align:center;padding:14px 0 6px;}
  .bours-title{font-size:1.3rem;font-weight:700;color:var(--ac);}
  .bours-subtitle{font-size:.76rem;color:var(--tx3);margin-top:3px;}
  .bours-summary{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:10px;margin:12px 0 14px;}
  .bours-sum-card{background:linear-gradient(135deg,rgba(79,140,255,.12),rgba(79,140,255,.04));border:1px solid rgba(79,140,255,.2);border-radius:16px;padding:12px 14px;text-align:center;backdrop-filter:blur(12px);}
  .bours-sum-label{font-size:.7rem;color:var(--tx3);margin-bottom:4px;}
  .bours-sum-val{font-size:.95rem;font-weight:700;}
  .bours-sum-sub{font-size:.68rem;color:var(--tx3);margin-top:2px;}
  .bours-section{background:linear-gradient(135deg,var(--glass),rgba(255,255,255,.01));backdrop-filter:blur(16px);border:1px solid var(--glass-border);border-radius:18px;margin-bottom:12px;overflow:hidden;}
  .bours-chart-section{background:linear-gradient(135deg,rgba(79,140,255,.05),rgba(79,140,255,.01));}
  .bours-sec-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--br);}
  .bours-sec-title{font-size:.86rem;font-weight:600;color:var(--tx1);}
  .bours-add-btn{background:linear-gradient(135deg,var(--ac),#3a6fd8);color:#fff;border:none;border-radius:10px;padding:7px 14px;font-family:var(--font);font-size:.78rem;cursor:pointer;box-shadow:0 2px 10px rgba(79,140,255,.3);}
  .bours-add-btn:active{transform:scale(.94);}
  .bours-form{padding:13px 16px;border-bottom:1px solid var(--br);}
  .bours-form-row{display:flex;align-items:center;gap:8px;margin-bottom:7px;flex-wrap:wrap;}
  .bours-form-row label{font-size:.76rem;color:var(--tx3);min-width:155px;text-align:right;}
  .bours-form-row input{flex:1;min-width:120px;background:rgba(255,255,255,.05);border:1px solid var(--br);border-radius:10px;color:var(--tx1);font-family:var(--font);font-size:.84rem;padding:7px 10px;outline:none;}
  .bours-form-row input:focus{border-color:var(--ac);box-shadow:0 0 0 2px rgba(79,140,255,.15);}
  .bours-form-btns{display:flex;gap:10px;margin-top:9px;}
  .bours-btn-save{background:linear-gradient(135deg,var(--ac),#3a6fd8);color:#fff;border:none;border-radius:10px;padding:8px 20px;font-family:var(--font);font-size:.82rem;cursor:pointer;}
  .bours-btn-cancel{background:rgba(255,255,255,.05);color:var(--tx2);border:1px solid var(--br);border-radius:10px;padding:8px 16px;font-family:var(--font);font-size:.82rem;cursor:pointer;}
  .bours-table-wrap{overflow-x:auto;padding:4px;}
  .bours-table{width:100%;border-collapse:collapse;font-size:.78rem;}
  .bours-table th{padding:8px 10px;text-align:right;color:var(--tx2);font-weight:600;border-bottom:1px solid var(--br);white-space:nowrap;}
  .bours-table td{padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.04);color:var(--tx1);}
  .bours-table tr:last-child td{border-bottom:none;}
  .bours-table td.num{text-align:left;direction:ltr;}
  .bours-del-btn{background:none;border:none;cursor:pointer;font-size:.9rem;opacity:.5;}
  .bours-del-btn:hover{opacity:1;}
  .bours-empty{padding:22px;text-align:center;color:var(--tx3);font-size:.83rem;}
  `;
  document.head.appendChild(s);

  // تب بورس در منوی پایین — بعد از «معامله»
  const mobNav=document.querySelector('.mob-nav');
  if(mobNav&&!document.querySelector('.mob-nav-btn[data-tab="bours"]')){
    const tradeBtn=[...mobNav.querySelectorAll('.mob-nav-btn')].find(b=>b.dataset.tab==='trade'||b.textContent.includes('معامله'));
    const btn=document.createElement('button');
    btn.className='mob-nav-btn';btn.dataset.tab='bours';
    btn.innerHTML=`<span style="font-size:1.3rem">📈</span><span>بورس</span>`;
    btn.onclick=()=>{playIconTap();tab('bours');};
    if(tradeBtn&&tradeBtn.nextSibling) mobNav.insertBefore(btn,tradeBtn.nextSibling);
    else mobNav.appendChild(btn);
  }

  // صفحه بورس
  if(!document.getElementById('tab-bours')){
    const sec=document.createElement('section');
    sec.id='tab-bours';sec.className='ts';
    sec.innerHTML='<div style="padding:40px;text-align:center;color:var(--tx3)">در حال بارگذاری...</div>';
    const all=document.querySelectorAll('section.ts');
    if(all.length) all[all.length-1].after(sec);
    else{const am=document.querySelector('.am');if(am) am.appendChild(sec);}
  }
  boursLoadLocal();
}

// ══════════════════════════════════════════════════════════════════
// PDF — گزارش کامل
// ══════════════════════════════════════════════════════════════════
function injectPDFButton(){
  if(document.getElementById('wxPdfBtn')) return;
  const dash=document.getElementById('tab-dashboard');if(!dash) return;
  const btn=document.createElement('button');
  btn.id='wxPdfBtn';btn.className='wx-pdf-btn';
  btn.innerHTML='📄 دانلود گزارش PDF';
  btn.onclick=()=>{playClick();generatePDF();};
  dash.prepend(btn);
}

async function generatePDF(){
  toast('در حال ساخت گزارش...','');
  async function loadScript(src){
    return new Promise((res,rej)=>{
      if(document.querySelector('script[src="'+src+'"]')){res();return;}
      const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s);
    });
  }
  try{
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
  }catch(e){toast('خطا در بارگذاری کتابخانه','err');return;}

  const now=new Date();
  const {result,totalProfitToman,totalProfitAED,totalInventoryValue,totalBuy}=calcAll();
  const aedRate=rates['AED']||1;
  const ret=totalBuy>0?((totalProfitToman/totalBuy)*100).toFixed(1):0;
  boursLoadLocal();
  const recT=boursCalcPL([...boursData.tsetmc].sort((a,b)=>a.date.localeCompare(b.date)));
  const recD=boursCalcPL([...boursData.dfm].sort((a,b)=>a.date.localeCompare(b.date)));
  const totalPLT=recT.reduce((s,r)=>s+r.pl,0);
  const totalPLD=recD.reduce((s,r)=>s+r.pl,0);

  const LOGO_PNG_PARTS=[
    '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'
  ];
  const LOGO_PNG_B64=LOGO_PNG_PARTS.join('');

  const logoTag='<img src="data:image/png;base64,'+LOGO_PNG_B64+'" width="110" height="90" style="object-fit:contain;display:block"/>';

  const vc=(v)=>v>=0?'#15803d':'#b91c1c';
  const vbg=(v)=>v>=0?'#dcfce7':'#fee2e2';

  function row(label,value,color){
    color=color||'#334155';
    return '<tr><td class="rl">'+label+'</td><td class="rv" style="color:'+color+'">'+value+'</td></tr>';
  }
  function secHead(icon,title,color){
    color=color||'#1e3a8a';
    return '<tr><td colspan="2" class="sh" style="color:'+color+';border-right:4px solid '+color+'">'+icon+' '+title+'</td></tr>';
  }
  function mth(cols,bg,color){
    bg=bg||'#eff6ff';color=color||'#1e3a8a';
    return '<tr style="background:'+bg+'">'+cols.map(function(c){return '<th style="padding:6px 8px;font-size:11px;color:'+color+';font-weight:700;text-align:center;border-bottom:2px solid '+color+'40">'+c+'</th>';}).join('')+'</tr>';
  }
  function mtr(cells,colors){
    colors=colors||[];
    return '<tr>'+cells.map(function(c,i){return '<td style="padding:5px 8px;font-size:11px;color:'+(colors[i]||'#334155')+';text-align:center;border-bottom:1px solid #f1f5f9;direction:ltr">'+c+'</td>';}).join('')+'</tr>';
  }

  var tsetmcTbl='';
  if(recT.length){
    tsetmcTbl='<div class="mt-wrap"><table class="mt">'+mth(['تاریخ','ارزش (تومان)','واریز','برداشت','سود/زیان'])+
    [...recT].reverse().slice(0,8).map(function(r){return mtr(
      [toJalaliShort(r.date),fN(r.portfolio),r.deposit?fN(r.deposit):'-',r.withdraw?fN(r.withdraw):'-',(r.pl>=0?'+ ':'-  ')+fN(Math.abs(r.pl))],
      ['#475569','#1e3a8a','#15803d','#b91c1c',vc(r.pl)]
    );}).join('')+'</table></div>';
  }
  var dfmTbl='';
  if(recD.length){
    dfmTbl='<div class="mt-wrap"><table class="mt">'+mth(['تاریخ','ارزش (درهم)','واریز','برداشت','سود/زیان'],'#fefce8','#92400e')+
    [...recD].reverse().slice(0,8).map(function(r){return mtr(
      [toJalaliShort(r.date),fN(r.portfolio,2),r.deposit?fN(r.deposit,2):'-',r.withdraw?fN(r.withdraw,2):'-',(r.pl>=0?'+ ':'-  ')+fN(Math.abs(r.pl),2)],
      ['#475569','#92400e','#15803d','#b91c1c',vc(r.pl)]
    );}).join('')+'</table></div>';
  }
  var curRows=Object.entries(CUR).map(function(pair){
    var code=pair[0],c=pair[1],d=result[code];
    if(!d||d.buyAmt===0) return '';
    var dec=code==='BTC'?6:code==='GOLD'?3:2;
    return mtr([c.flag+' '+code,fN(d.inventory,dec),fN(d.avgBuy),fN(Math.round(d.inventoryValue>0?d.inventoryValue:0)),(d.profitToman>=0?'+ ':'-  ')+fN(Math.abs(d.profitToman))],['#334155','#1e3a8a','#475569','#475569',vc(d.profitToman)]);
  }).join('');

  var html='<!DOCTYPE html><html dir="rtl" lang="fa"><head><meta charset="UTF-8"/>'
  +'<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700;800&display=swap" rel="stylesheet"/>'
  +'<style>'
  +'*{margin:0;padding:0;box-sizing:border-box;}'
  +'body{font-family:Vazirmatn,Tahoma,Arial,sans-serif;background:#fff;color:#1e293b;direction:rtl;width:794px;padding:32px 40px 28px;}'
  +'.hdr{display:flex;align-items:center;gap:18px;padding-bottom:16px;border-bottom:3px solid #1e3a8a;margin-bottom:20px;}'
  +'.hdr-brand h1{font-size:24px;font-weight:800;color:#1e3a8a;}'
  +'.hdr-brand h2{font-size:12px;color:#64748b;margin-top:2px;}'
  +'.hdr-meta{font-size:11px;color:#64748b;margin-top:6px;line-height:1.8;}'
  +'.badge{display:inline-block;padding:3px 12px;border-radius:20px;font-size:11px;font-weight:700;margin-top:4px;}'
  +'table.main{width:100%;border-collapse:collapse;margin-bottom:16px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;}'
  +'td.sh{padding:8px 12px;background:#f8fafc;font-size:13px;font-weight:800;border-bottom:1px solid #e2e8f0;}'
  +'td.rl{padding:6px 12px;color:#475569;font-size:12px;border-bottom:1px solid #f1f5f9;text-align:right;}'
  +'td.rv{padding:6px 12px;font-weight:700;font-size:12px;border-bottom:1px solid #f1f5f9;text-align:left;direction:ltr;font-variant-numeric:tabular-nums;}'
  +'.mt-wrap{border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:16px;}'
  +'table.mt{width:100%;border-collapse:collapse;}'
  +'.sg{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px;}'
  +'.sb{border:1px solid #e2e8f0;border-radius:8px;padding:12px;text-align:center;}'
  +'.sb .sl{font-size:10px;color:#64748b;margin-bottom:3px;}'
  +'.sb .sv{font-size:13px;font-weight:800;}'
  +'.ftr{margin-top:20px;padding-top:10px;border-top:1px solid #e2e8f0;text-align:center;font-size:10px;color:#94a3b8;}'
  +'</style></head><body>'
  +'<div class="hdr"><div>'+logoTag+'</div>'
  +'<div class="hdr-brand"><h1>WHALIXIR</h1>'
  +'<div class="hdr-meta">تاریخ: '+toJalali(now)+'   |   ساعت: '+now.toLocaleTimeString('fa-IR')+'   |   نرخ AED: '+fN(rates['AED'])+' تومان</div>'
  +'<span class="badge" style="background:'+vbg(totalProfitToman)+';color:'+vc(totalProfitToman)+'">'+(totalProfitToman>=0?'سودده':'زیانده')+'</span>'
  +'</div></div>'

  +'<table class="main">'+secHead('📊','خلاصه وضعیت مالی','#1e3a8a')
  +row('سود / زیان کل (تومان)',(totalProfitToman>=0?'+ ':'-  ')+fN(Math.abs(totalProfitToman))+' تومان',vc(totalProfitToman))
  +row('سود / زیان کل (درهم)',(totalProfitAED>=0?'+ ':'-  ')+fN(Math.abs(totalProfitAED),2)+' درهم',vc(totalProfitAED))
  +row('ارزش کل دارایی',fN(Math.round(totalInventoryValue))+' تومان')
  +row('کل سرمایهگذاری',fN(Math.round(totalBuy))+' تومان')
  +row('بازدهی',ret+'%',vc(parseFloat(ret)))
  +'</table>';

  if(recT.length){
    html+='<table class="main">'+secHead('🇮🇷','TSETMC','#1e3a8a')
    +row('سود / زیان کل',(totalPLT>=0?'+ ':'-  ')+fN(Math.abs(totalPLT))+' تومان',vc(totalPLT))
    +row('معادل درهم',(totalPLT>=0?'+ ':'-  ')+fN(Math.abs(tomanToAED(totalPLT)),2)+' درهم',vc(totalPLT))
    +(recT[recT.length-1]?row('ارزش جاری',fN(recT[recT.length-1].portfolio)+' تومان'):'')
    +'</table>'+tsetmcTbl;
  }
  if(recD.length){
    html+='<table class="main">'+secHead('🇦🇪','DFM','#92400e')
    +row('سود / زیان کل',(totalPLD>=0?'+ ':'-  ')+fN(Math.abs(totalPLD),2)+' درهم',vc(totalPLD))
    +(recD[recD.length-1]?row('ارزش جاری',fN(recD[recD.length-1].portfolio,2)+' درهم'):'')
    +'</table>'+dfmTbl;
  }
  if(curRows){
    html+='<div style="font-size:12px;font-weight:700;color:#065f46;margin-bottom:6px">پرتفوی ارزها</div>'
    +'<div class="mt-wrap"><table class="mt">'+mth(['ارز','موجودی','میانگین خرید (ت)','ارزش فعلی (ت)','سود/زیان (ت)'],'#f0fdf4','#065f46')+curRows+'</table></div>';
  }
  html+='<div class="sg">'
  +'<div class="sb"><div class="sl">سود/زیان کل</div><div class="sv" style="color:'+vc(totalProfitToman)+'">'+(totalProfitToman>=0?'+':'-')+fN(Math.abs(Math.round(totalProfitToman)))+' ت</div></div>'
  +'<div class="sb"><div class="sl">بازدهی</div><div class="sv" style="color:'+vc(parseFloat(ret))+'">'+ret+'%</div></div>'
  +'<div class="sb"><div class="sl">ارزش کل</div><div class="sv" style="color:#1e3a8a">'+fN(Math.round(totalInventoryValue))+' ت</div></div>'
  +'</div>'
  +'<div class="ftr">WHALIXIR by Shamsaddin Mollaei &mdash; '+toJalali(now)+'</div>'
  +'</body></html>';

  var container=document.createElement('div');
  container.style.cssText='position:fixed;left:-9999px;top:0;width:794px;z-index:-1;background:#fff;';
  var iframe=document.createElement('iframe');
  iframe.style.cssText='width:794px;height:2200px;border:none;background:#fff;';
  container.appendChild(iframe);
  document.body.appendChild(container);
  iframe.contentDocument.open();
  iframe.contentDocument.write(html);
  iframe.contentDocument.close();

  await new Promise(function(r){setTimeout(r,2800);});
  try{await iframe.contentDocument.fonts.ready;}catch(e){}
  await new Promise(function(r){setTimeout(r,400);});

  try{
    var el=iframe.contentDocument.body;
    el.style.height='auto';
    var fullH=Math.max(el.scrollHeight,el.offsetHeight,1100);
    iframe.style.height=fullH+'px';
    await new Promise(function(r){setTimeout(r,200);});

    var canvas=await html2canvas(el,{
      scale:2,useCORS:true,allowTaint:false,
      backgroundColor:'#ffffff',width:794,windowWidth:794,height:fullH,scrollY:0,logging:false,
      onclone:function(doc){
        var s=doc.createElement('style');
        s.textContent='*{font-family:Vazirmatn,Tahoma,Arial,sans-serif!important;}';
        doc.head.appendChild(s);
      }
    });

    var {jsPDF}=window.jspdf;
    var pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
    var pW=210,pH=297;
    var pxPerPage=Math.floor((pH/pW)*canvas.width);
    var srcY=0,pageNum=0;
    while(srcY<canvas.height){
      var sliceH=Math.min(pxPerPage*2,canvas.height-srcY);
      var sc=document.createElement('canvas');
      sc.width=canvas.width;sc.height=sliceH;
      sc.getContext('2d').drawImage(canvas,0,srcY,canvas.width,sliceH,0,0,canvas.width,sliceH);
      var sImg=sc.toDataURL('image/png',1.0);
      var sMmH=(sliceH/canvas.width)*pW;
      if(pageNum>0) pdf.addPage();
      pdf.addImage(sImg,'PNG',0,0,pW,sMmH);
      srcY+=sliceH;pageNum++;
    }
    pdf.save('whalixir-'+now.toISOString().slice(0,10)+'.pdf');
    toast('گزارش PDF دانلود شد','ok');
  }catch(err){
    toast('خطا: '+err.message,'err');
  }finally{
    document.body.removeChild(container);
  }
}

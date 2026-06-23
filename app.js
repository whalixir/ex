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
  const days={};
  for(const tx of txs){
    const d=new Date(tx.ts);
    const key=d.getFullYear()+'-'+(d.getMonth()+1).toString().padStart(2,'0')+'-'+d.getDate().toString().padStart(2,'0');
    if(!days[key]) days[key]={buyToman:0,sellToman:0,ts:tx.ts};
    if(tx.type==='buy') days[key].buyToman+=tx.total;
    else days[key].sellToman+=tx.total;
  }
  const sorted=Object.entries(days).sort((a,b)=>a[0].localeCompare(b[0])).slice(-14);
  const labels=[],profitToman=[],profitAED=[];
  const aedRate=rates['AED']||1;
  for(const [,v] of sorted){
    const dt=new Date(v.ts);
    labels.push(dt.toLocaleDateString('fa-IR',{month:'short',day:'numeric'}));
    const p=v.sellToman-v.buyToman;
    profitToman.push(Math.round(p));
    profitAED.push(parseFloat((p/aedRate).toFixed(2)));
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

// ── CHART صفحه نمودار — سود/زیان واقعی تجمعی ────────────────────
let chartPeriod='monthly';

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
  chartDailyBtn.onclick=()=>{chartPeriod='daily';chartDailyBtn.classList.add('active');chartMonthlyBtn.classList.remove('active');renderChart();};
  chartMonthlyBtn.onclick=()=>{chartPeriod='monthly';chartMonthlyBtn.classList.add('active');chartDailyBtn.classList.remove('active');renderChart();};
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

  const LOGO_B64='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';
  const logoTag='<img src="data:image/png;base64,'+LOGO_B64+'" width="88" height="88" style="object-fit:contain;border-radius:8px;display:block"/>';

  const vc=(v)=>v>=0?'#15803d':'#b91c1c';
  const vbg=(v)=>v>=0?'#dcfce7':'#fee2e2';

  function row(label,value,color){
    color=color||'#334155';
    return '<tr><td class="rl">'+label+'</td><td class="rv" style="color:'+color+'"><span style="direction:ltr;display:inline-block">'+value+'</span></td></tr>';
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
  +'td.rv{padding:6px 12px;font-weight:700;font-size:12px;border-bottom:1px solid #f1f5f9;text-align:left;direction:ltr;}'
  +'.mt-wrap{border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:16px;}'
  +'table.mt{width:100%;border-collapse:collapse;}'
  +'.sg{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px;}'
  +'.sb{border:1px solid #e2e8f0;border-radius:8px;padding:12px;text-align:center;}'
  +'.sb .sl{font-size:10px;color:#64748b;margin-bottom:3px;}'
  +'.sb .sv{font-size:13px;font-weight:800;}'
  +'.ftr{margin-top:20px;padding-top:10px;border-top:1px solid #e2e8f0;text-align:center;font-size:10px;color:#94a3b8;}'
  +'</style></head><body>'
  +'<div class="hdr"><div>'+logoTag+'</div>'
  +'<div class="hdr-brand"><h1>WHALIXIR</h1><h2>by Shamsaddin Mollaei</h2>'
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

'use strict';

const PIN = '6283';
const API = '/api';

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
    opacity:0!important;pointer-events:none!important;transform:translateY(20px)!important;
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
(function wxRun(){
  if(!document.getElementById('lo')){
    document.addEventListener('DOMContentLoaded',wxRun,{once:true});
    return;
  }
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
    const r=await fetch('https://whalixir.pages.dev/api/tgju?_='+Date.now(),{cache:'no-store',headers:{'Accept':'application/json'}});
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

  // ── سود تجمعی روزانه (نه سود هر روز به تنهایی) ──
  // ابتدا سود انباشته تا قبل از ۱۴ روز اخیر را حساب می‌کنیم
  const allSorted=Object.entries(days).sort((a,b)=>a[0].localeCompare(b[0]));
  const cutoffKey=sorted.length ? sorted[0][0] : '';
  let baseCum=0;
  for(const [key,v] of allSorted){
    if(key >= cutoffKey) break;
    baseCum+=v.sellToman-v.buyToman;
  }

  const {totalProfitToman,totalProfitAED}=calcAll();

  let cumT=baseCum;
  for(let i=0;i<sorted.length;i++){
    const [,v]=sorted[i];
    const dt=new Date(v.ts);
    labels.push(dt.toLocaleDateString('fa-IR',{month:'short',day:'numeric'}));
    cumT+=v.sellToman-v.buyToman;

    if(i===sorted.length-1){
      // آخرین نقطه = سود واقعی کل داشبورد (شامل ارزش موجودی)
      profitToman.push(Math.round(totalProfitToman));
      profitAED.push(parseFloat(totalProfitAED.toFixed(2)));
    } else {
      profitToman.push(Math.round(cumT));
      profitAED.push(parseFloat((cumT/aedRate).toFixed(2)));
    }
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
  if(!window.jspdf){
    await new Promise((res,rej)=>{
      const s=document.createElement('script');
      s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s.onload=res;s.onerror=rej;document.head.appendChild(s);
    });
  }
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  const W=210,H=297,now=new Date();
  const {result,totalProfitToman,totalProfitAED,totalInventoryValue,totalBuy}=calcAll();
  const aedRate=rates['AED']||1;
  const ret=totalBuy>0?((totalProfitToman/totalBuy)*100).toFixed(1):0;

  // بارگذاری داده بورس
  boursLoadLocal();
  const sortedT=[...boursData.tsetmc].sort((a,b)=>a.date.localeCompare(b.date));
  const sortedD=[...boursData.dfm].sort((a,b)=>a.date.localeCompare(b.date));
  const recT=boursCalcPL(sortedT),recD=boursCalcPL(sortedD);
  const totalPLT=recT.reduce((s,r)=>s+r.pl,0);
  const totalPLD=recD.reduce((s,r)=>s+r.pl,0);

  // ── رنگها ──
  const BG=[11,17,32],CARD=[17,28,46],HDR=[20,35,65];
  const BL=[79,140,255],GR=[38,215,130],RD=[255,82,113],YL=[245,200,66];
  const TX=[144,174,201],TX2=[74,98,128];

  // ── صفحه اول ──
  doc.setFillColor(...BG);doc.rect(0,0,W,H,'F');

  // لوگو/هدر
  doc.setFillColor(...HDR);doc.roundedRect(10,10,W-20,32,5,5,'F');
  // خط تزئینی آبی
  doc.setFillColor(...BL);doc.rect(10,10,4,32,'F');
  doc.setTextColor(...BL);doc.setFontSize(20);doc.setFont('helvetica','bold');
  doc.text('WHALIXIR',W/2,26,{align:'center'});
  doc.setFontSize(8);doc.setTextColor(...TX);
  doc.text('BY SHAMSADDIN MOLLAEI',W/2,32,{align:'center'});
  doc.setFontSize(9);doc.setTextColor(...BL);
  doc.text('گزارش جامع مالی',W/2,38,{align:'center'});

  // تاریخ/زمان
  doc.setFontSize(8);doc.setTextColor(...TX2);
  doc.text('تاریخ: '+toJalali(now)+'   |   ساعت: '+now.toLocaleTimeString('fa-IR'),W/2,46,{align:'center'});

  let y=54;

  function newPageIfNeeded(need=25){
    if(y+need>H-15){
      doc.addPage();
      doc.setFillColor(...BG);doc.rect(0,0,W,H,'F');
      y=15;
    }
  }

  function sectionTitle(title,color=BL){
    newPageIfNeeded(14);
    doc.setFillColor(...HDR);doc.roundedRect(10,y,W-20,9,2,2,'F');
    doc.setFillColor(...color);doc.rect(10,y,3,9,'F');
    doc.setTextColor(...color);doc.setFontSize(10);doc.setFont('helvetica','bold');
    doc.text(title,W-16,y+6.2,{align:'right'});
    y+=12;
  }

  function dataRow(label,value,valColor=TX){
    newPageIfNeeded(9);
    const even=(Math.round((y-54)/8.5))%2===0;
    doc.setFillColor(even?17:14,even?28:22,even?46:38);
    doc.rect(10,y,W-20,8,'F');
    doc.setTextColor(...TX);doc.setFontSize(8);doc.setFont('helvetica','normal');
    doc.text(label,W-14,y+5.2,{align:'right'});
    doc.setTextColor(...valColor);doc.setFont('helvetica','bold');
    doc.text(String(value),24,y+5.2,{align:'left'});
    y+=8.5;
  }

  // ═══ ۱. خلاصه مالی ═══
  sectionTitle('خلاصه وضعیت مالی',BL);
  const plC=totalProfitToman>=0?GR:RD;
  dataRow('سود/زیان کل (تومان)',(totalProfitToman>=0?'+ ':'- ')+fN(Math.abs(totalProfitToman))+' تومان',plC);
  dataRow('سود/زیان کل (درهم)',(totalProfitAED>=0?'+ ':'- ')+fN(Math.abs(totalProfitAED),2)+' درهم',plC);
  dataRow('ارزش کل داراییها',fN(Math.round(totalInventoryValue))+' تومان',TX);
  dataRow('بازدهی کل',ret+'٪',(parseFloat(ret)>=0?GR:RD));
  dataRow('کل سرمایهگذاری',fN(Math.round(totalBuy))+' تومان',TX);
  y+=4;

  // ═══ ۲. TSETMC ═══
  if(recT.length){
    sectionTitle('بورس تهران — TSETMC',[79,140,255]);
    dataRow('سود/زیان کل',(totalPLT>=0?'+ ':'- ')+fN(Math.abs(totalPLT))+' تومان',totalPLT>=0?GR:RD);
    dataRow('معادل درهم',(totalPLT>=0?'+ ':'- ')+fN(Math.abs(tomanToAED(totalPLT)),2)+' درهم',totalPLT>=0?GR:RD);
    if(recT[recT.length-1]) dataRow('ارزش جاری پرتفوی',fN(recT[recT.length-1].portfolio)+' تومان',TX);
    // جدول هفتگی
    y+=3;
    newPageIfNeeded(10);
    doc.setFillColor(...HDR);doc.rect(10,y,W-20,7,'F');
    doc.setTextColor(...TX);doc.setFontSize(7.5);doc.setFont('helvetica','bold');
    ['تاریخ','ارزش (تومان)','واریز','برداشت','سود/زیان'].forEach((h,i)=>{
      const xs=[W-14,W-50,W-85,W-110,24];
      doc.text(h,xs[i],y+4.8,{align:i<4?'right':'left'});
    });
    y+=7;
    [...recT].slice(-8).forEach(r=>{
      newPageIfNeeded(8);
      const even2=(recT.indexOf(r))%2===0;
      doc.setFillColor(even2?17:14,even2?28:22,even2?46:38);
      doc.rect(10,y,W-20,7,'F');
      doc.setTextColor(...TX);doc.setFontSize(7);doc.setFont('helvetica','normal');
      doc.text(toJalaliShort(r.date),W-14,y+4.8,{align:'right'});
      doc.text(fN(r.portfolio),W-50,y+4.8,{align:'right'});
      doc.text(r.deposit?fN(r.deposit):'-',W-85,y+4.8,{align:'right'});
      doc.text(r.withdraw?fN(r.withdraw):'-',W-110,y+4.8,{align:'right'});
      doc.setTextColor(...(r.pl>=0?GR:RD));
      doc.text((r.pl>=0?'+ ':'- ')+fN(Math.abs(r.pl)),24,y+4.8,{align:'left'});
      y+=7;
    });
    y+=5;
  }

  // ═══ ۳. DFM ═══
  if(recD.length){
    sectionTitle('بورس دبی — DFM',[245,200,66]);
    dataRow('سود/زیان کل',(totalPLD>=0?'+ ':'- ')+fN(Math.abs(totalPLD),2)+' درهم',totalPLD>=0?GR:RD);
    if(recD[recD.length-1]) dataRow('ارزش جاری پرتفوی',fN(recD[recD.length-1].portfolio,2)+' درهم',TX);
    y+=3;
    newPageIfNeeded(10);
    doc.setFillColor(...HDR);doc.rect(10,y,W-20,7,'F');
    doc.setTextColor(...TX);doc.setFontSize(7.5);doc.setFont('helvetica','bold');
    ['تاریخ','ارزش (درهم)','واریز','برداشت','سود/زیان'].forEach((h,i)=>{
      const xs=[W-14,W-50,W-85,W-110,24];
      doc.text(h,xs[i],y+4.8,{align:i<4?'right':'left'});
    });
    y+=7;
    [...recD].slice(-8).forEach(r=>{
      newPageIfNeeded(8);
      doc.setFillColor(17,28,46);doc.rect(10,y,W-20,7,'F');
      doc.setTextColor(...TX);doc.setFontSize(7);doc.setFont('helvetica','normal');
      doc.text(toJalaliShort(r.date),W-14,y+4.8,{align:'right'});
      doc.text(fN(r.portfolio,2),W-50,y+4.8,{align:'right'});
      doc.text(r.deposit?fN(r.deposit,2):'-',W-85,y+4.8,{align:'right'});
      doc.text(r.withdraw?fN(r.withdraw,2):'-',W-110,y+4.8,{align:'right'});
      doc.setTextColor(...(r.pl>=0?GR:RD));
      doc.text((r.pl>=0?'+ ':'- ')+fN(Math.abs(r.pl),2),24,y+4.8,{align:'left'});
      y+=7;
    });
    y+=5;
  }

  // ═══ ۴. ارزها ═══
  const curRows=Object.entries(CUR).map(([code,c])=>{
    const d=result[code];if(!d||d.buyAmt===0) return null;
    return{code,c,d};
  }).filter(Boolean);
  if(curRows.length){
    sectionTitle('پرتفوی ارزها',GR);
    newPageIfNeeded(10);
    doc.setFillColor(...HDR);doc.rect(10,y,W-20,7,'F');
    doc.setTextColor(...TX);doc.setFontSize(7.5);doc.setFont('helvetica','bold');
    ['ارز','موجودی','میانگین خرید','ارزش فعلی','سود/زیان'].forEach((h,i)=>{
      const xs=[W-14,W-45,W-80,W-115,24];
      doc.text(h,xs[i],y+4.8,{align:i<4?'right':'left'});
    });
    y+=7;
    curRows.forEach(({code,c,d})=>{
      newPageIfNeeded(8);
      const dec=code==='BTC'?6:code==='GOLD'?3:2;
      const profitAED=d.profitToman/aedRate;
      const pColor=d.profitToman>=0?GR:RD;
      const even3=curRows.indexOf({code,c,d})%2===0;
      doc.setFillColor(17,28,46);doc.rect(10,y,W-20,7,'F');
      doc.setTextColor(...TX);doc.setFontSize(7);doc.setFont('helvetica','normal');
      doc.text(c.name,W-14,y+4.8,{align:'right'});
      doc.text(fN(d.inventory,dec)+' '+c.unit,W-45,y+4.8,{align:'right'});
      doc.text(fN(d.avgBuy)+' ت',W-80,y+4.8,{align:'right'});
      doc.text(fN(d.inventoryValue>0?d.inventoryValue:0)+' ت',W-115,y+4.8,{align:'right'});
      doc.setTextColor(...pColor);
      doc.text((d.profitToman>=0?'+ ':'- ')+fN(Math.abs(d.profitToman))+' ت',24,y+4.8,{align:'left'});
      y+=7;
    });
    y+=5;
  }

  // ═══ ۵. خلاصه نهایی ═══
  newPageIfNeeded(50);
  sectionTitle('خلاصه نهایی',[38,215,130]);
  if(recT.length) dataRow('سود کل TSETMC',(totalPLT>=0?'+ ':'- ')+fN(Math.abs(totalPLT))+' تومان',totalPLT>=0?GR:RD);
  if(recD.length) dataRow('سود کل DFM',(totalPLD>=0?'+ ':'- ')+fN(Math.abs(totalPLD),2)+' درهم',totalPLD>=0?GR:RD);
  dataRow('سود کل ارزها',(totalProfitToman>=0?'+ ':'- ')+fN(Math.abs(totalProfitToman))+' تومان',totalProfitToman>=0?GR:RD);
  dataRow('ارزش کل داراییها',fN(Math.round(totalInventoryValue))+' تومان',TX);
  dataRow('بازده کل',ret+'٪',parseFloat(ret)>=0?GR:RD);

  // ── فوتر تمام صفحات ──
  const totalPages=doc.getNumberOfPages();
  for(let p=1;p<=totalPages;p++){
    doc.setPage(p);
    doc.setFillColor(...HDR);doc.rect(0,H-11,W,11,'F');
    doc.setFillColor(...BL);doc.rect(0,H-11,W,1,'F');
    doc.setTextColor(...TX2);doc.setFontSize(7);
    doc.text('WHALIXIR  —  گزارش محرمانه  —  '+toJalali(now),W/2,H-4,{align:'center'});
    doc.text(p+'/'+totalPages,W-12,H-4,{align:'right'});
  }

  doc.save('whalixir-'+now.toISOString().slice(0,10)+'.pdf');
  toast('✅ گزارش PDF دانلود شد','ok');
}
})();

// ================================================================
// WHALIXIR — Cloudflare Pages Function + D1 (whalixir)
// ================================================================

export async function onRequest(context) {
  const { request, env } = context;
  const url  = new URL(request.url);
  const path = url.pathname;
  const cors = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  // ── فقط مسیرهای API واقعی را handle کن ────────────────────────
  // مسیرهای مجاز: /api/transactions, /api/rates, /api/tgju, /api/bours, /api/aed
  const validPaths = ['/api/transactions','/api/rates','/api/tgju','/api/bours','/api/aed','/api/debug'];
  const isValidAPI = validPaths.some(p => path === p || path.startsWith(p+'/'));
  if (!isValidAPI) {
    return context.next();
  }

  const json = (data, status=200) =>
    new Response(JSON.stringify(data), {
      status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' }
    });

  // پشتیبانی از هر دو نام binding
  const DB = env.DB || env.whalixir || env.Moaaei;
  if (!DB) {
    return json({ error: 'D1 binding not found. Set Variable name to "DB" or "whalixir" in Pages > Settings > Functions > D1 Bindings. Current env keys: ' + Object.keys(env).join(',') }, 500);
  }

  try {
    // ── Init DB — همه جداول ────────────────────────────────────
    await DB.batch([
      // جداول قدیمی
      DB.prepare(`CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts INTEGER NOT NULL, type TEXT NOT NULL, code TEXT NOT NULL,
        amount REAL NOT NULL, rate REAL NOT NULL, total REAL NOT NULL,
        saved_rate REAL, note TEXT DEFAULT ''
      )`),
      DB.prepare(`CREATE TABLE IF NOT EXISTS rates (
        code TEXT PRIMARY KEY, value REAL NOT NULL, updated_at INTEGER NOT NULL
      )`),
      // بورس TSETMC
      DB.prepare(`CREATE TABLE IF NOT EXISTS bours_tsetmc (
        id INTEGER PRIMARY KEY,
        date TEXT NOT NULL,
        portfolio REAL NOT NULL,
        deposit REAL DEFAULT 0,
        withdraw REAL DEFAULT 0,
        note TEXT DEFAULT '',
        created_at INTEGER DEFAULT 0
      )`),
      // بورس DFM
      DB.prepare(`CREATE TABLE IF NOT EXISTS bours_dfm (
        id INTEGER PRIMARY KEY,
        date TEXT NOT NULL,
        portfolio REAL NOT NULL,
        deposit REAL DEFAULT 0,
        withdraw REAL DEFAULT 0,
        note TEXT DEFAULT '',
        created_at INTEGER DEFAULT 0
      )`),
      // تاریخچه نرخ درهم روزانه
      DB.prepare(`CREATE TABLE IF NOT EXISTS aed_history (
        date TEXT PRIMARY KEY,
        rate REAL NOT NULL,
        updated_at INTEGER DEFAULT 0
      )`),
      // تنظیمات نمودار درهم (درصد هدف)
      DB.prepare(`CREATE TABLE IF NOT EXISTS aed_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`),
      // مقادیر پیش‌فرض نرخ‌ها
      DB.prepare(`INSERT OR IGNORE INTO rates VALUES ('USD',97500,0)`),
      DB.prepare(`INSERT OR IGNORE INTO rates VALUES ('AED',26500,0)`),
      DB.prepare(`INSERT OR IGNORE INTO rates VALUES ('OMR',253000,0)`),
      DB.prepare(`INSERT OR IGNORE INTO rates VALUES ('SAR',26000,0)`),
      DB.prepare(`INSERT OR IGNORE INTO rates VALUES ('GBP',124000,0)`),
      DB.prepare(`INSERT OR IGNORE INTO rates VALUES ('CHF',110000,0)`),
      DB.prepare(`INSERT OR IGNORE INTO rates VALUES ('BTC',4100000000,0)`),
      DB.prepare(`INSERT OR IGNORE INTO rates VALUES ('ETH',180000000,0)`),
      DB.prepare(`INSERT OR IGNORE INTO rates VALUES ('SOL',15000000,0)`),
      DB.prepare(`INSERT OR IGNORE INTO rates VALUES ('GOLD',6300000,0)`),
      DB.prepare(`INSERT OR IGNORE INTO aed_settings VALUES ('target_pct','0')`),
    ]);

    // ══════════════════════════════════════════════════════════
    //  TGJU LIVE RATES
    // ══════════════════════════════════════════════════════════
    if (path === '/api/tgju' && request.method === 'GET') {
      const debug = url.searchParams.get('debug');
      const PROFILES = [
        { code: 'USD',  profile: 'price_dollar_rl', inRial: true  },
        { code: 'AED',  profile: 'price_aed',        inRial: true  },
        { code: 'OMR',  profile: 'price_omr',        inRial: true  },
        { code: 'SAR',  profile: 'price_sar',        inRial: true  },
        { code: 'GBP',  profile: 'price_gbp',        inRial: true  },
        { code: 'CHF',  profile: 'price_chf',        inRial: true  },
        { code: 'GOLD', profile: 'geram24',           inRial: true  },
        { code: 'BTC',  profile: 'crypto-bitcoin',   inRial: false, isUsd: true },
        { code: 'ETH',  profile: 'crypto-ethereum',  inRial: false, isUsd: true },
        { code: 'SOL',  profile: 'crypto-solana',    inRial: false, isUsd: true },
      ];
      const result = {}, errors = [], debugInfo = {};
      await Promise.all(PROFILES.map(async ({ code, profile, inRial, isUsd }) => {
        try {
          const res = await fetch(
            `https://api.tgju.org/v1/market/indicator/summary-table-data/${profile}?_=${Date.now()}`,
            { headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.tgju.org/profile/' + profile,
                'Accept': 'application/json, text/plain, */*',
                'Origin': 'https://www.tgju.org',
                'X-Requested-With': 'XMLHttpRequest',
              }, cf: { cacheTtl: 0, cacheEverything: false }
            }
          );
          const text = await res.text();
          if (!res.ok) { errors.push(`${code}:HTTP${res.status}`); return; }
          let d;
          try { d = JSON.parse(text); } catch(e) { errors.push(`${code}:badJSON`); return; }
          let raw = 0;
          if (Array.isArray(d?.data) && d.data.length && Array.isArray(d.data[0])) {
            raw = parseFloat(String(d.data[0][3]).replace(/,/g,''));
          } else if (d?.data?.info?.today?.price) {
            raw = parseFloat(String(d.data.info.today.price).replace(/,/g,''));
          } else if (d?.p) {
            raw = parseFloat(String(d.p).replace(/,/g,''));
          }
          if (raw > 0) {
            if (isUsd) result[`_usd_${code}`] = raw;
            else if (inRial) result[code] = Math.round(raw / 10);
          } else errors.push(`${code}:parse0`);
        } catch(e) { errors.push(`${code}:${e.message.slice(0,30)}`); }
      }));
      const usdToman = result['USD'] || 0;
      for (const code of ['BTC','ETH','SOL']) {
        const usd = result[`_usd_${code}`];
        if (usd && usdToman) result[code] = Math.round(usd * usdToman);
        delete result[`_usd_${code}`];
      }
      result._ts = new Date().toISOString();
      result._errors = errors;
      result._ok = Object.keys(result).filter(k => !k.startsWith('_')).length;
      return json(result);
    }

    // ══════════════════════════════════════════════════════════
    //  TRANSACTIONS
    // ══════════════════════════════════════════════════════════
    if (path === '/api/transactions' && request.method === 'GET') {
      const { results } = await DB.prepare('SELECT * FROM transactions ORDER BY ts DESC').all();
      return json(results);
    }
    if (path === '/api/transactions' && request.method === 'POST') {
      const b = await request.json();
      const r = await DB.prepare(
        'INSERT INTO transactions (ts,type,code,amount,rate,total,saved_rate,note) VALUES (?,?,?,?,?,?,?,?)'
      ).bind(b.ts||Date.now(),b.type,b.code,b.amount,b.rate,b.total,b.savedRate||b.rate,b.note||'').run();
      return json({ success:true, id:r.meta.last_row_id }, 201);
    }
    if (path === '/api/transactions' && request.method === 'DELETE') {
      await DB.prepare('DELETE FROM transactions').run();
      return json({ success:true });
    }
    const txDel = path.match(/^\/api\/transactions\/(\d+)$/);
    if (txDel && request.method === 'DELETE') {
      await DB.prepare('DELETE FROM transactions WHERE id=?').bind(parseInt(txDel[1])).run();
      return json({ success:true });
    }

    // ══════════════════════════════════════════════════════════
    //  RATES
    // ══════════════════════════════════════════════════════════
    if (path === '/api/rates' && request.method === 'GET') {
      const { results } = await DB.prepare('SELECT * FROM rates').all();
      const obj = {};
      results.forEach(r => { obj[r.code] = r.value; });
      return json(obj);
    }
    const rateUp = path.match(/^\/api\/rates\/([A-Z]+)$/);
    if (rateUp && request.method === 'PUT') {
      const { value } = await request.json();
      await DB.prepare(
        'INSERT INTO rates (code,value,updated_at) VALUES (?,?,?) ON CONFLICT(code) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at'
      ).bind(rateUp[1], parseFloat(value), Date.now()).run();
      return json({ success:true });
    }

    // ══════════════════════════════════════════════════════════
    //  BOURS — TSETMC
    // ══════════════════════════════════════════════════════════
    if (path === 'https://whalixir.pages.dev/api/bours/tsetmc' && request.method === 'GET') {
      const { results } = await DB.prepare(
        'SELECT * FROM bours_tsetmc ORDER BY date ASC'
      ).all();
      return json(results);
    }
    if (path === '/api/bours/tsetmc' && request.method === 'POST') {
      const b = await request.json();
      await DB.prepare(
        'INSERT OR REPLACE INTO bours_tsetmc (id,date,portfolio,deposit,withdraw,note,created_at) VALUES (?,?,?,?,?,?,?)'
      ).bind(b.id,b.date,b.portfolio,b.deposit||0,b.withdraw||0,b.note||'',b.created_at||Date.now()).run();
      return json({ success:true });
    }
    const tsetmcDel = path.match(/^\/api\/bours\/tsetmc\/(\d+)$/);
    if (tsetmcDel && request.method === 'DELETE') {
      await DB.prepare('DELETE FROM bours_tsetmc WHERE id=?').bind(parseInt(tsetmcDel[1])).run();
      return json({ success:true });
    }

    // ══════════════════════════════════════════════════════════
    //  BOURS — DFM
    // ══════════════════════════════════════════════════════════
    if (path === '/api/bours/dfm' && request.method === 'GET') {
      const { results } = await DB.prepare(
        'SELECT * FROM bours_dfm ORDER BY date ASC'
      ).all();
      return json(results);
    }
    if (path === '/api/bours/dfm' && request.method === 'POST') {
      const b = await request.json();
      await DB.prepare(
        'INSERT OR REPLACE INTO bours_dfm (id,date,portfolio,deposit,withdraw,note,created_at) VALUES (?,?,?,?,?,?,?)'
      ).bind(b.id,b.date,b.portfolio,b.deposit||0,b.withdraw||0,b.note||'',b.created_at||Date.now()).run();
      return json({ success:true });
    }
    const dfmDel = path.match(/^\/api\/bours\/dfm\/(\d+)$/);
    if (dfmDel && request.method === 'DELETE') {
      await DB.prepare('DELETE FROM bours_dfm WHERE id=?').bind(parseInt(dfmDel[1])).run();
      return json({ success:true });
    }

    // ══════════════════════════════════════════════════════════
    //  AED HISTORY — تاریخچه نرخ درهم روزانه
    // ══════════════════════════════════════════════════════════
    if (path === '/api/aed/history' && request.method === 'GET') {
      const { results } = await DB.prepare(
        'SELECT * FROM aed_history ORDER BY date ASC'
      ).all();
      return json(results);
    }
    if (path === '/api/aed/history' && request.method === 'POST') {
      const b = await request.json();
      await DB.prepare(
        'INSERT INTO aed_history (date,rate,updated_at) VALUES (?,?,?) ON CONFLICT(date) DO UPDATE SET rate=excluded.rate,updated_at=excluded.updated_at'
      ).bind(b.date, b.rate, Date.now()).run();
      return json({ success:true });
    }

    // ══════════════════════════════════════════════════════════
    //  AED SETTINGS — درصد هدف
    // ══════════════════════════════════════════════════════════
    if (path === '/api/aed/settings' && request.method === 'GET') {
      const { results } = await DB.prepare('SELECT * FROM aed_settings').all();
      const obj = {};
      results.forEach(r => { obj[r.key] = r.value; });
      return json(obj);
    }
    if (path === '/api/aed/settings' && request.method === 'PUT') {
      const b = await request.json();
      for (const [key, value] of Object.entries(b)) {
        await DB.prepare(
          'INSERT INTO aed_settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value'
        ).bind(key, String(value)).run();
      }
      return json({ success:true });
    }

    // ── DEBUG: وضعیت DB ──────────────────────────────────────────
    if (path === '/api/debug' && request.method === 'GET') {
      try {
        const tables = await DB.prepare(
          "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        ).all();
        const counts = {};
        for (const t of tables.results) {
          try {
            const r = await DB.prepare(`SELECT COUNT(*) as n FROM ${t.name}`).first();
            counts[t.name] = r.n;
          } catch(e) { counts[t.name] = 'error: '+e.message; }
        }
        return json({ tables: tables.results.map(t=>t.name), counts, binding:'DB OK' });
      } catch(e) {
        return json({ error: e.message });
      }
    }

    return json({ error:'Not found' }, 404);

  } catch (err) {
    return json({ error: err.message, stack: String(err.stack||'').slice(0,500) }, 500);
  }
}

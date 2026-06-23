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

    const json = (data, status=200) =>
      new Response(JSON.stringify(data), {
        status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' }
      });

    // ── Check DB binding ─────────────────────────────────────────
    if (!env.DB) {
      return json({ error: 'D1 binding "DB" not found. Go to Pages Settings → Functions → D1 Database Bindings → Add → Variable name: DB → select Whalixir → Save.' }, 500);
    }

    try {
      // ── Init DB ──────────────────────────────────────────────────
      await env.DB.batch([
        env.DB.prepare(`CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, type TEXT NOT NULL, code TEXT NOT NULL, amount REAL NOT NULL, rate REAL NOT NULL, total REAL NOT NULL, saved_rate REAL, note TEXT DEFAULT '')`),
        env.DB.prepare(`CREATE TABLE IF NOT EXISTS rates (code TEXT PRIMARY KEY, value REAL NOT NULL, updated_at INTEGER NOT NULL)`),
        env.DB.prepare(`INSERT OR IGNORE INTO rates VALUES ('USD',97500,0)`),
        env.DB.prepare(`INSERT OR IGNORE INTO rates VALUES ('AED',26500,0)`),
        env.DB.prepare(`INSERT OR IGNORE INTO rates VALUES ('OMR',253000,0)`),
        env.DB.prepare(`INSERT OR IGNORE INTO rates VALUES ('SAR',26000,0)`),
        env.DB.prepare(`INSERT OR IGNORE INTO rates VALUES ('GBP',124000,0)`),
        env.DB.prepare(`INSERT OR IGNORE INTO rates VALUES ('CHF',110000,0)`),
        env.DB.prepare(`INSERT OR IGNORE INTO rates VALUES ('BTC',4100000000,0)`),
        env.DB.prepare(`INSERT OR IGNORE INTO rates VALUES ('ETH',180000000,0)`),
        env.DB.prepare(`INSERT OR IGNORE INTO rates VALUES ('SOL',15000000,0)`),
        env.DB.prepare(`INSERT OR IGNORE INTO rates VALUES ('GOLD',6300000,0)`),
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

        const result = {};
        const errors = [];
        const debugInfo = {};

        await Promise.all(PROFILES.map(async ({ code, profile, inRial, isUsd }) => {
          try {
            const res = await fetch(
              `https://api.tgju.org/v1/market/indicator/summary-table-data/${profile}?_=${Date.now()}`,
              {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
                  'Referer':    'https://www.tgju.org/profile/' + profile,
                  'Accept':     'application/json, text/plain, */*',
                  'Origin':     'https://www.tgju.org',
                  'X-Requested-With': 'XMLHttpRequest',
                },
                cf: { cacheTtl: 0, cacheEverything: false }
              }
            );

            const text = await res.text();
            if (debug) debugInfo[code] = { status: res.status, len: text.length, body: text.slice(0,200) };

            if (!res.ok) { errors.push(`${code}:HTTP${res.status}`); return; }

            let d;
            try { d = JSON.parse(text); } catch(e) { errors.push(`${code}:badJSON`); return; }

            let raw = 0;
            if (Array.isArray(d?.data) && d.data.length && Array.isArray(d.data[0])) {
              const row = d.data[0];
              raw = parseFloat(String(row[3]).replace(/,/g,''));
              if (debug) debugInfo[code+'_rows'] = d.data.slice(0,2);
              if (debug) debugInfo[code+'_raw'] = raw;
              if (debug) debugInfo[code+'_topkeys'] = Object.keys(d);
            } else if (d?.data?.info?.today?.price) {
              raw = parseFloat(String(d.data.info.today.price).replace(/,/g,''));
            } else if (d?.data?.last_trade?.price) {
              raw = parseFloat(String(d.data.last_trade.price).replace(/,/g,''));
            } else if (d?.p) {
              raw = parseFloat(String(d.p).replace(/,/g,''));
            } else if (d?.current) {
              raw = parseFloat(String(d.current).replace(/,/g,''));
            }

            if (raw > 0) {
              if (isUsd) {
                result[`_usd_${code}`] = raw;
              } else if (inRial) {
                result[code] = Math.round(raw / 10);
              }
            } else {
              errors.push(`${code}:parse0`);
            }
          } catch(e) {
            errors.push(`${code}:${e.message.slice(0,30)}`);
          }
        }));

        const usdToman = result['USD'] || 0;
        for (const code of ['BTC','ETH','SOL']) {
          const usd = result[`_usd_${code}`];
          if (usd && usdToman) result[code] = Math.round(usd * usdToman);
          delete result[`_usd_${code}`];
        }

        result._ts     = new Date().toISOString();
        result._errors = errors;
        result._ok     = Object.keys(result).filter(k => !k.startsWith('_')).length;
        if (debug) result._debug = debugInfo;

        return json(result);
      }

      // ══════════════════════════════════════════════════════════
      //  TRANSACTIONS
      // ══════════════════════════════════════════════════════════
      if (path === '/api/transactions' && request.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM transactions ORDER BY ts DESC').all();
        return json(results);
      }
      if (path === '/api/transactions' && request.method === 'POST') {
        const b = await request.json();
        const r = await env.DB.prepare(
          'INSERT INTO transactions (ts,type,code,amount,rate,total,saved_rate,note) VALUES (?,?,?,?,?,?,?,?)'
        ).bind(b.ts||Date.now(),b.type,b.code,b.amount,b.rate,b.total,b.savedRate||b.rate,b.note||'').run();
        return json({ success:true, id:r.meta.last_row_id }, 201);
      }
      if (path === '/api/transactions' && request.method === 'DELETE') {
        await env.DB.prepare('DELETE FROM transactions').run();
        return json({ success:true });
      }
      const txDel = path.match(/^\/api\/transactions\/(\d+)$/);
      if (txDel && request.method === 'DELETE') {
        await env.DB.prepare('DELETE FROM transactions WHERE id=?').bind(parseInt(txDel[1])).run();
        return json({ success:true });
      }

      // ══════════════════════════════════════════════════════════
      //  RATES
      // ══════════════════════════════════════════════════════════
      if (path === '/api/rates' && request.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM rates').all();
        const obj = {};
        results.forEach(r => { obj[r.code] = r.value; });
        return json(obj);
      }
      const rateUp = path.match(/^\/api\/rates\/([A-Z]+)$/);
      if (rateUp && request.method === 'PUT') {
        const { value } = await request.json();
        await env.DB.prepare(
          'INSERT INTO rates (code,value,updated_at) VALUES (?,?,?) ON CONFLICT(code) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at'
        ).bind(rateUp[1], parseFloat(value), Date.now()).run();
        return json({ success:true });
      }

      return json({ error:'Not found' }, 404);

    } catch (err) {
      return json({ error: err.message, stack: String(err.stack||'').slice(0,500) }, 500);
    }
}

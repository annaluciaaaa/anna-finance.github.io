// SignalRadar API — Cloudflare Worker
// Paste this entire file into the Cloudflare Worker editor and click Deploy.

export default {
  async fetch(request) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Content-Type': 'application/json',
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    const url = new URL(request.url);
    const m = url.pathname.match(/^\/stock\/(.+)$/);
    if (!m) return new Response('"ok"', { headers: cors });

    const symbol = decodeURIComponent(m[1]);
    const range = url.searchParams.get('range') || '5y';
    const yfRange = { '1d':'1d','1w':'5d','1m':'1mo','3m':'3mo','6m':'6mo','1y':'1y','5y':'5y','all':'10y' }[range] || '5y';

    try {
      const resp = await fetch(
        `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${yfRange}`,
        { headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept': 'application/json,*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://finance.yahoo.com/',
          'Origin': 'https://finance.yahoo.com',
        }}
      );

      if (!resp.ok) throw new Error('YF ' + resp.status);
      const json = await resp.json();
      const result = json?.chart?.result?.[0];
      if (!result) throw new Error('no data');

      const ts = result.timestamp || [];
      const q = result.indicators?.quote?.[0] || {};
      const data = ts.map((t, i) => ({
        date: new Date(t * 1000).toISOString().slice(0, 10),
        o: q.open?.[i] || null,
        h: q.high?.[i] || null,
        l: q.low?.[i] || null,
        c: q.close?.[i] || null,
        v: q.volume?.[i] || 0,
      })).filter(d => d.c && d.c > 0);

      return new Response(JSON.stringify({ data }), { headers: cors });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: cors });
    }
  }
};

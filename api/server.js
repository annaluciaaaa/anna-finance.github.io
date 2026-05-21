const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  next();
});

const YF_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  "Accept": "application/json",
  "Referer": "https://finance.yahoo.com",
};

// Stock OHLCV data
app.get("/stock/:symbol", async (req, res) => {
  const symbol = req.params.symbol;
  const range = req.query.range || "5y";
  const interval = range === "1d" ? "5m" : range === "1w" ? "60m" : "1d";
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false`;
    const r = await fetch(url, { headers: YF_HEADERS });
    const j = await r.json();
    const result = j?.chart?.result?.[0];
    if (!result) return res.status(404).json({ error: "No data" });
    const ts = result.timestamp || [];
    const q = result.indicators.quote[0];
    const data = ts.map((t, i) => ({
      date: new Date(t * 1000).toISOString().slice(0, 10),
      o: q.open?.[i] ?? null,
      h: q.high?.[i] ?? null,
      l: q.low?.[i] ?? null,
      c: q.close?.[i] ?? null,
      v: q.volume?.[i] || 0,
    })).filter(d => d.c != null && isFinite(d.c));
    // Patch last close with the live market price so displayed price matches TradingView
    const livePrice = result.meta?.regularMarketPrice;
    if (livePrice && isFinite(livePrice) && data.length > 0) {
      data[data.length - 1].c = livePrice;
    }
    res.json({ data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// News
app.get("/news/:symbol", async (req, res) => {
  const symbol = req.params.symbol;
  try {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&newsCount=10&quotesCount=0&enableFuzzyQuery=false`;
    const r = await fetch(url, { headers: YF_HEADERS });
    const j = await r.json();
    const news = (j.news || []).map(n => ({
      title: n.title,
      link: n.link,
      publisher: n.publisher,
      time: n.providerPublishTime,
      thumb: n.thumbnail?.resolutions?.[0]?.url || null,
    }));
    res.json({ news });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Fear & Greed Index (CNN)
app.get("/fgi", async (req, res) => {
  try {
    const r = await fetch("https://production.dataviz.cnn.io/index/fearandgreed/graphdata/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Origin": "https://edition.cnn.com",
        "Referer": "https://edition.cnn.com/markets/fear-and-greed",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-site",
      }
    });
    if (!r.ok) return res.status(r.status).json({ error: `CNN returned ${r.status}` });
    const j = await r.json();
    res.json(j);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/", (req, res) => res.json({ status: "ok" }));
app.listen(PORT, () => console.log(`Running on port ${PORT}`));

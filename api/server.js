const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  next();
});

app.get("/stock/:symbol", async (req, res) => {
  const symbol = req.params.symbol;
  const range = req.query.range || "5y";
  const interval = range === "1d" ? "5m" : range === "1w" ? "60m" : "1d";

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false`;
    const r = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "application/json",
        "Referer": "https://finance.yahoo.com",
      },
    });

    const j = await r.json();
    const result = j?.chart?.result?.[0];
    if (!result) return res.status(404).json({ error: "No data" });

    const ts = result.timestamp || [];
    const closes = result.indicators.quote[0].close || [];
    const volumes = result.indicators.quote[0].volume || [];

    const data = ts
      .map((t, i) => ({ date: new Date(t * 1000).toISOString().slice(0, 16), c: closes[i], v: volumes[i] || 0 }))
      .filter(d => d.c != null && isFinite(d.c));

    res.json({ data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/", (req, res) => res.json({ status: "ok", usage: "/stock/AAPL?range=5y" }));

app.listen(PORT, () => console.log(`Running on port ${PORT}`));

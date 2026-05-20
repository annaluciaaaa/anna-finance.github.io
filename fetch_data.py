import json, os, time
from urllib.request import Request, urlopen
from urllib.error import URLError
from datetime import datetime

SYMBOLS = [
    "AAPL","MSFT","GOOGL","AMZN","META","NVDA","TSLA",
    "AMD","INTC","VRT","TMO","HIMS","LNTH","FSLR","NVO","PYPL","BABA","AOS",
    "LLY","MELI","CLS","C",
    "SPY","QQQ","URTH","EEM","ACWI","GLD",
    "BTC-USD","ETH-USD","SOL-USD","XRP-USD","HYPE-USD",
    "^GSPC","^IXIC","^DJI","^GDAXI","^FTSE","^N225","^HSI","^FCHI","^NSEI"
]

os.makedirs("data", exist_ok=True)

def fetch(symbol):
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?range=5y&interval=1d&includePrePost=false"
    req = Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "application/json",
        "Referer": "https://finance.yahoo.com"
    })
    with urlopen(req, timeout=15) as r:
        return json.loads(r.read())

ok, fail = 0, 0
for sym in SYMBOLS:
    try:
        raw = fetch(sym)
        res = raw["chart"]["result"][0]
        ts  = res["timestamp"]
        cl  = res["indicators"]["quote"][0]["close"]
        vo  = res["indicators"]["quote"][0].get("volume") or [0]*len(ts)
        points = [
            {"date": datetime.utcfromtimestamp(t).strftime("%Y-%m-%d"), "c": c, "v": int(v or 0)}
            for t, c, v in zip(ts, cl, vo) if c is not None
        ]
        key = sym.replace("^","_").replace("-","_")
        with open(f"data/{key}.json", "w") as f:
            json.dump({"symbol": sym, "updated": datetime.utcnow().isoformat()+"Z", "data": points}, f, separators=(",",":"))
        print(f"OK  {sym:20s} {len(points)} points")
        ok += 1
        time.sleep(0.4)
    except Exception as e:
        print(f"FAIL {sym:20s} {e}")
        fail += 1

print(f"\nDone: {ok} OK, {fail} failed")

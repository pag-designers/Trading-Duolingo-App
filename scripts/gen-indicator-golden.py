"""
Computes golden indicator values with pandas (an independent implementation) for the Financial Accuracy Checker.
Run: python3 scripts/gen-indicator-golden.py   (needs pandas + numpy; output is committed)
"""
import json
import numpy as np
import pandas as pd

aapl = json.load(open("src/data/market/aapl-daily.json"))["bars"][:160]
close = pd.Series([b[4] for b in aapl], dtype="float64")


def sma(s, n):
    return s.rolling(n).mean()


def ema(s, n):
    """EMA seeded with the SMA of the first n values, then the usual recursion."""
    seeded = s.copy()
    first = s.first_valid_index()
    start = first + n - 1
    seeded.iloc[:start] = np.nan
    seeded.iloc[start] = s.iloc[first : first + n].mean()
    return seeded.ewm(span=n, adjust=False).mean()


def rsi(s, n):
    d = s.diff()
    up, down = d.clip(lower=0), (-d).clip(lower=0)
    out = []
    for part in (up, down):
        seeded = part.copy()
        seeded.iloc[:n] = np.nan
        seeded.iloc[n] = part.iloc[1 : n + 1].mean()
        out.append(seeded.ewm(alpha=1 / n, adjust=False).mean())
    g, l = out
    return 100 - 100 / (1 + g / l)


def nn(s):
    return [None if pd.isna(v) else float(v) for v in s]


fast, slow, sig = ema(close, 12), ema(close, 26), None
line = fast - slow
signal = ema(line.dropna().reset_index(drop=True), 9)
signal.index = line.dropna().index
signal = signal.reindex(line.index)
bb_mid = sma(close, 20)
bb_sd = close.rolling(20).std(ddof=0)

# Intraday sample for VWAP: three made-up sessions of 40 bars each, from numpy.
rng = np.random.default_rng(7)
rows = []
price = 50.0
for day in range(3):
    t0 = 1_893_456_000 + day * 86_400 + 52_200  # 2030, 14:30 UTC
    for i in range(40):
        o = price
        c = o * (1 + rng.normal(0, 0.002))
        h = max(o, c) * (1 + abs(rng.normal(0, 0.001)))
        l = min(o, c) * (1 - abs(rng.normal(0, 0.001)))
        rows.append((t0 + i * 60, round(o, 4), round(h, 4), round(l, 4), round(c, 4), int(rng.integers(500, 9000))))
        price = c
df = pd.DataFrame(rows, columns=["time", "open", "high", "low", "close", "volume"])
df["day"] = df["time"] // 86_400
df["tp"] = (df["high"] + df["low"] + df["close"]) / 3
df["pv"] = df["tp"] * df["volume"]
vwap = df.groupby("day")["pv"].cumsum() / df.groupby("day")["volume"].cumsum()

out = {
    "about": "Computed with pandas by scripts/gen-indicator-golden.py. Do not edit by hand.",
    "closes": [float(v) for v in close],
    "sma": {"5": nn(sma(close, 5)), "20": nn(sma(close, 20))},
    "ema": {"12": nn(ema(close, 12)), "26": nn(ema(close, 26))},
    "rsi": {"14": nn(rsi(close, 14)), "5": nn(rsi(close, 5))},
    "macd": {"line": nn(line), "signal": nn(signal), "histogram": nn(line - signal)},
    "bollinger": {"middle": nn(bb_mid), "upper": nn(bb_mid + 2 * bb_sd), "lower": nn(bb_mid - 2 * bb_sd)},
    "intraday": [dict(zip(["time", "open", "high", "low", "close", "volume"], r)) for r in rows],
    "vwap": nn(vwap),
}
json.dump(out, open("agents/fixtures/indicators-golden.json", "w"), separators=(",", ":"))
print("wrote agents/fixtures/indicators-golden.json", len(out["closes"]), "bars")

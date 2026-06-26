import json, pandas as pd, numpy as np

with open("C:/Users/Kanna/projects/multi-trader-analysis/tmp_kline_data.json") as f:
    data = json.load(f)

df = pd.DataFrame(data)
df = df.rename(columns={"open":"o","high":"h","low":"l","close":"c","volume":"v"})
df[["o","h","l","c","v"]] = df[["o","h","l","c","v"]].apply(pd.to_numeric)
df["time"] = pd.to_datetime(df["timestamp"], unit="s")
df = df.sort_values("time").reset_index(drop=True)

print(f"Data: {df['time'].iloc[0].strftime('%Y-%m-%d')} to {df['time'].iloc[-1].strftime('%Y-%m-%d')}, {len(df)} bars")
print(f"Latest close: {df['c'].iloc[-1]:.2f} ({df['time'].iloc[-1].strftime('%Y-%m-%d')})")
print()

votes = {}
def ema(s, n): return s.ewm(span=n, adjust=False).mean()

ema12 = ema(df["c"], 12); ema26 = ema(df["c"], 26)
macd = ema12 - ema26; sig = ema(macd, 9); hist = macd - sig
votes["MACD"] = +1 if hist.iloc[-1] > 0 and hist.iloc[-1] > hist.iloc[-2] else (-1 if hist.iloc[-1] < 0 and hist.iloc[-1] < hist.iloc[-2] else 0)

delta = df["c"].diff(); gain = delta.clip(lower=0); loss = (-delta).clip(lower=0)
avg_g = gain.ewm(alpha=1/14, adjust=False).mean()
avg_l = loss.ewm(alpha=1/14, adjust=False).mean()
rsi_v = 100 - 100 / (1 + avg_g / avg_l.replace(0, 1e-9))
rsi_last = rsi_v.iloc[-1]
votes["RSI"] = -1 if rsi_last > 70 else (+1 if rsi_last < 30 else 0)

low9 = df["l"].rolling(9).min(); high9 = df["h"].rolling(9).max()
rsv = (df["c"] - low9) / (high9 - low9 + 1e-9) * 100
K = rsv.ewm(alpha=1/3, adjust=False).mean()
Dv = K.ewm(alpha=1/3, adjust=False).mean()
J = 3*K - 2*Dv
votes["KDJ"] = +1 if J.iloc[-1] < 20 else (-1 if J.iloc[-1] > 80 else 0)

mid_bb = df["c"].rolling(20).mean(); std_bb = df["c"].rolling(20).std()
upper_bb = mid_bb + 2*std_bb; lower_bb = mid_bb - 2*std_bb
c_last = df["c"].iloc[-1]
votes["Bollinger"] = +1 if c_last < lower_bb.iloc[-1] else (-1 if c_last > upper_bb.iloc[-1] else 0)

e12 = ema(df["c"], 12); e26 = ema(df["c"], 26); e50 = ema(df["c"], 50)
votes["EMA_align"] = +1 if e12.iloc[-1] > e26.iloc[-1] else -1

tr_v = pd.concat([df["h"]-df["l"], (df["h"]-df["c"].shift()).abs(),
    (df["l"]-df["c"].shift()).abs()], axis=1).max(axis=1)
dp = (df["h"]-df["h"].shift()).clip(lower=0)
dm = (df["l"].shift()-df["l"]).clip(lower=0)
atr14_v = tr_v.ewm(alpha=1/14, adjust=False).mean()
di_p = 100 * dp.ewm(alpha=1/14, adjust=False).mean() / atr14_v
di_m = 100 * dm.ewm(alpha=1/14, adjust=False).mean() / atr14_v
dx_v = (di_p - di_m).abs() / (di_p + di_m + 1e-9) * 100
adx_v = dx_v.ewm(alpha=1/14, adjust=False).mean()
votes["ADX"] = +1 if adx_v.iloc[-1] > 25 and di_p.iloc[-1] > di_m.iloc[-1] else (-1 if adx_v.iloc[-1] > 25 and di_m.iloc[-1] > di_p.iloc[-1] else 0)

obv = (df["v"] * df["c"].diff().apply(lambda x: 1 if x > 0 else (-1 if x < 0 else 0))).cumsum()
votes["OBV"] = +1 if obv.iloc[-1] > obv.iloc[-5] else (-1 if obv.iloc[-1] < obv.iloc[-5] else 0)

total = sum(votes.values())
comp = "Bullish" if total >= 3 else ("Bearish" if total <= -3 else "Neutral")
print("TECHNICAL_INDICATORS_COMPOSITE")
print(f"Score: {total:+d} -> {comp}")
for k, v in votes.items():
    print(f"  {k}: {v:+d}")
print()

ma5 = df["c"].rolling(5).mean(); ma10 = df["c"].rolling(10).mean()
ma20 = df["c"].rolling(20).mean(); ma60 = df["c"].rolling(60).mean()
print("MA_SYSTEM")
print(f"  MA5:{ma5.iloc[-1]:.2f} MA10:{ma10.iloc[-1]:.2f} MA20:{ma20.iloc[-1]:.2f} MA60:{ma60.iloc[-1]:.2f}")
alignment = "BULL_ALIGN" if ma5.iloc[-1] > ma10.iloc[-1] > ma20.iloc[-1] > ma60.iloc[-1] else ("BEAR_ALIGN" if ma5.iloc[-1] < ma10.iloc[-1] < ma20.iloc[-1] < ma60.iloc[-1] else "MIXED")
print(f"  Alignment: {alignment}")
print(f"  Price vs MA20: {'above' if c_last > ma20.iloc[-1] else 'below'} (diff {abs(c_last - ma20.iloc[-1]):.2f})")
print(f"  Price vs MA60: {'above' if c_last > ma60.iloc[-1] else 'below'} (diff {abs(c_last - ma60.iloc[-1]):.2f})")
print(f"  BB_width: {(upper_bb.iloc[-1]-lower_bb.iloc[-1])/mid_bb.iloc[-1]*100:.1f}%")
print()

h20 = df["h"].tail(20).max(); l20 = df["l"].tail(20).min()
h55 = df["h"].tail(55).max(); l55 = df["l"].tail(55).min()
hall = df["h"].max(); lall = df["l"].min()
print("PRICE_LEVELS")
print(f"  20d: H{h20:.2f} L{l20:.2f} (pos {(c_last-l20)/(h20-l20)*100:.1f}%)")
print(f"  55d: H{h55:.2f} L{l55:.2f} (pos {(c_last-l55)/(h55-l55)*100:.1f}%)")
print(f"  All: H{hall:.2f} L{lall:.2f}")
print()

tr_all = pd.concat([df["h"]-df["l"], (df["h"]-df["c"].shift()).abs(),
    (df["l"]-df["c"].shift()).abs()], axis=1).max(axis=1)
n_val = tr_all.ewm(alpha=1/20, adjust=False).mean()
h20_prev = df["h"].iloc[-21:-1].max(); l20_prev = df["l"].iloc[-21:-1].min()
h55_prev = df["h"].iloc[-56:-1].max() if len(df) >= 56 else df["h"].iloc[:-1].max()
l55_prev = df["l"].iloc[-56:-1].min() if len(df) >= 56 else df["l"].iloc[:-1].min()
l10 = df["l"].tail(10).min(); l20_ex = df["l"].tail(20).min()

print("TURTLE")
print(f"  N(ATR): {n_val.iloc[-1]:.2f} ({n_val.iloc[-1]/c_last*100:.1f}%)")
s1_long = c_last > h20_prev
s2_long = c_last > h55_prev
s1_exit = c_last < l10
s2_exit = c_last < l20_ex
print(f"  S1_Long(20d): {'YES' if s1_long else 'NO'} ({c_last:.2f} vs {h20_prev:.2f})")
print(f"  S2_Long(55d): {'YES' if s2_long else 'NO'} ({c_last:.2f} vs {h55_prev:.2f})")
print(f"  S1_Exit(10d_low={l10:.2f}): {'YES' if s1_exit else 'NO'}")
print(f"  S2_Exit(20d_low={l20_ex:.2f}): {'YES' if s2_exit else 'NO'}")
print(f"  Stop(entry-2N): {c_last - 2*n_val.iloc[-1]:.2f}")
print(f"  Add(entry+0.5N): {c_last + 0.5*n_val.iloc[-1]:.2f}")
print()

body = (df["c"] - df["o"]).abs()
rng = df["h"] - df["l"]
upper_shadow = df.apply(lambda r: r["h"] - max(r["c"], r["o"]), axis=1)
lower_shadow = df.apply(lambda r: min(r["c"], r["o"]) - r["l"], axis=1)
bull = df["c"] > df["o"]

signals = []
for i in range(max(0, len(df)-8), len(df)):
    r = df.iloc[i]; b = body.iloc[i]; u = upper_shadow.iloc[i]; lo = lower_shadow.iloc[i]; rg = rng.iloc[i]
    if rg > 0 and b < 0.05 * rg:
        signals.append((df["time"].iloc[i], "Doji", 0))
    elif lo > 2*b and u < 0.1*b:
        signals.append((df["time"].iloc[i], "Hammer", +1))
    elif u > 2*b and lo < 0.1*b:
        signals.append((df["time"].iloc[i], "ShootingStar", -1))
    elif rg > 0 and b > 0.9*rg and bull.iloc[i]:
        signals.append((df["time"].iloc[i], "BullMarubozu", +1))
    elif rg > 0 and b > 0.9*rg and not bull.iloc[i]:
        signals.append((df["time"].iloc[i], "BearMarubozu", -1))

for i in range(max(1, len(df)-8), len(df)):
    p, c_ = df.iloc[i-1], df.iloc[i]
    if not bull.iloc[i-1] and bull.iloc[i] and c_["o"] < p["c"] and c_["c"] > p["o"]:
        signals.append((df["time"].iloc[i], "BullEngulf", +2))
    elif bull.iloc[i-1] and not bull.iloc[i] and c_["o"] > p["c"] and c_["c"] < p["o"]:
        signals.append((df["time"].iloc[i], "BearEngulf", -2))

for i in range(max(2, len(df)-8), len(df)):
    a, b_, c_ = df.iloc[i-2], df.iloc[i-1], df.iloc[i]
    sb = body.iloc[i-1]
    if not bull.iloc[i-2] and sb < 0.3*body.iloc[i-2] and bull.iloc[i] and c_["c"] > (a["o"]+a["c"])/2:
        signals.append((df["time"].iloc[i], "MorningStar", +2))
    elif bull.iloc[i-2] and sb < 0.3*body.iloc[i-2] and not bull.iloc[i] and c_["c"] < (a["o"]+a["c"])/2:
        signals.append((df["time"].iloc[i], "EveningStar", -2))
    elif bull.iloc[i-2] and bull.iloc[i-1] and bull.iloc[i] and c_["c"]>b_["c"]>a["c"]:
        signals.append((df["time"].iloc[i], "ThreeSoldiers", +2))
    elif not bull.iloc[i-2] and not bull.iloc[i-1] and not bull.iloc[i] and c_["c"]<b_["c"]<a["c"]:
        signals.append((df["time"].iloc[i], "ThreeCrows", -2))

score = sum(s[2] for s in signals)
print("CANDLESTICK")
print(f"  Score: {score} -> {'Bullish' if score >= 2 else ('Bearish' if score <= -2 else 'Neutral')}")
for ts, name, s in signals[-5:]:
    print(f"  {ts.strftime('%Y-%m-%d')} {name} ({s:+d})")
print()

vol_ma5 = df["v"].rolling(5).mean(); vol_ma20 = df["v"].rolling(20).mean()
print("VOLUME")
print(f"  5d_avg: {vol_ma5.iloc[-1]/1e6:.1f}M  20d_avg: {vol_ma20.iloc[-1]/1e6:.1f}M  ratio: {vol_ma5.iloc[-1]/vol_ma20.iloc[-1]:.2f}x")
print(f"  Today: {df['v'].iloc[-1]/1e6:.1f}M  Max: {df['v'].max()/1e6:.1f}M ({df.loc[df['v'].idxmax(), 'time'].strftime('%Y-%m-%d')})")
print()

print("CHANLUN")
tops = []; bottoms = []
for i in range(2, len(df)-2):
    if df["h"].iloc[i] > df["h"].iloc[i-1] and df["h"].iloc[i] > df["h"].iloc[i-2] and df["h"].iloc[i] > df["h"].iloc[i+1] and df["h"].iloc[i] > df["h"].iloc[i+2]:
        tops.append((df["time"].iloc[i], df["h"].iloc[i]))
    if df["l"].iloc[i] < df["l"].iloc[i-1] and df["l"].iloc[i] < df["l"].iloc[i-2] and df["l"].iloc[i] < df["l"].iloc[i+1] and df["l"].iloc[i] < df["l"].iloc[i+2]:
        bottoms.append((df["time"].iloc[i], df["l"].iloc[i]))

print(f"  Fractals: {len(tops)} tops, {len(bottoms)} bottoms")

if tops and bottoms:
    lt_date, lt_price = tops[-1]
    lb_date, lb_price = bottoms[-1]
    if lt_date > lb_date:
        bi_dir = "DOWN"
        bi_start = lt_price
        print(f"  Bi direction: {bi_dir} from top {lt_price:.2f} ({lt_date.strftime('%Y-%m-%d')})")
        if len(bottoms) >= 2:
            print(f"  Prev bottom support: {bottoms[-2][1]:.2f}")
        print(f"  Last bottom: {lb_price:.2f} ({lb_date.strftime('%Y-%m-%d')})")
    else:
        bi_dir = "UP"
        bi_start = lb_price
        print(f"  Bi direction: {bi_dir} from bottom {lb_price:.2f} ({lb_date.strftime('%Y-%m-%d')})")
        if len(tops) >= 2:
            print(f"  Prev top resistance: {tops[-2][1]:.2f}")
        print(f"  Last top: {lt_price:.2f} ({lt_date.strftime('%Y-%m-%d')})")

    recent_h = sorted([t[1] for t in tops[-5:]])
    recent_l = sorted([b[1] for b in bottoms[-5:]])
    if len(recent_h) >= 2 and len(recent_l) >= 2:
        zs_h = min(recent_h[-2:]); zs_l = max(recent_l[:2])
        if zs_l < zs_h:
            print(f"  Zhongshu: [{zs_l:.2f} - {zs_h:.2f}], mid={(zs_l+zs_h)/2:.2f}")
            if c_last > zs_h:
                print(f"  Price {c_last:.2f} above zhongshu; potential 3rd buy point if pullback holds {zs_h:.2f}")
            elif c_last < zs_l:
                print(f"  Price {c_last:.2f} below zhongshu; potential 1st buy area")
            else:
                print(f"  Price {c_last:.2f} inside zhongshu; oscillation")

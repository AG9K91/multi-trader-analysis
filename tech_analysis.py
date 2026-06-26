import pandas as pd
import numpy as np

# 600580.SH 日线 OHLCV 数据 (2026年5月-6月)
data = [
    ('2026-05-06',38.02,38.85,38.02,38.51,354429),
    ('2026-05-07',38.80,39.76,38.42,39.53,479719),
    ('2026-05-08',39.54,42.42,39.14,41.06,1006370),
    ('2026-05-11',41.07,41.23,40.11,40.64,662684),
    ('2026-05-12',40.64,41.36,40.20,40.48,448233),
    ('2026-05-13',40.02,40.70,39.75,40.58,410788),
    ('2026-05-14',40.80,40.91,38.93,38.95,471909),
    ('2026-05-15',38.90,41.49,38.80,40.48,880348),
    ('2026-05-18',40.61,41.58,40.25,40.96,674764),
    ('2026-05-19',41.50,41.71,40.73,41.09,536749),
    ('2026-05-20',40.70,40.77,39.50,39.62,475372),
    ('2026-05-21',39.90,41.95,39.73,40.66,978617),
    ('2026-05-22',40.80,41.27,40.11,41.09,589651),
    ('2026-05-25',41.17,42.78,40.88,42.49,883517),
    ('2026-05-26',43.50,46.49,43.01,44.07,1490734),
    ('2026-05-27',43.00,45.18,42.80,44.42,1119256),
    ('2026-05-28',44.42,44.42,40.60,41.68,1016738),
    ('2026-05-29',41.69,42.15,38.31,39.46,805067),
    ('2026-06-01',39.46,40.93,37.47,40.19,613734),
    ('2026-06-02',40.85,41.90,39.68,39.90,673193),
    ('2026-06-03',39.10,40.30,38.70,38.81,617596),
    ('2026-06-04',38.15,39.82,37.77,38.84,504510),
    ('2026-06-05',38.82,40.98,37.20,40.00,871278),
    ('2026-06-08',38.68,40.25,38.38,39.03,594672),
    ('2026-06-09',39.06,39.20,37.75,38.37,487139),
    ('2026-06-10',37.78,38.25,36.00,36.01,543788),
    ('2026-06-11',35.53,35.84,34.53,34.83,425728),
    ('2026-06-12',35.30,35.88,34.09,34.09,457953),
    ('2026-06-15',34.69,35.66,34.11,35.57,403589),
    ('2026-06-16',35.58,35.90,35.11,35.35,356412),
    ('2026-06-17',35.11,35.50,34.70,34.90,317828),
    ('2026-06-18',34.90,36.36,34.66,36.20,545446),
    ('2026-06-22',35.99,36.10,34.66,35.84,488619),
    ('2026-06-23',35.50,36.35,34.80,34.81,431836),
    ('2026-06-24',34.57,35.19,34.30,34.74,309548),
    ('2026-06-25',34.60,35.06,33.31,33.56,533940),
]

df = pd.DataFrame(data, columns=['time','open','high','low','close','volume'])

def ema(s, n):
    return s.ewm(span=n, adjust=False).mean()

# === MACD (12,26,9) ===
ema12 = ema(df['close'], 12)
ema26 = ema(df['close'], 26)
macd_line = ema12 - ema26
signal_line = ema(macd_line, 9)
hist = macd_line - signal_line
print(f'MACD: DIF={macd_line.iloc[-1]:.2f}, DEA={signal_line.iloc[-1]:.2f}, HIST={hist.iloc[-1]:.4f}')

# === RSI(14) ===
period = 14
delta = df['close'].diff()
gain = delta.clip(lower=0)
loss = (-delta).clip(lower=0)
avg_g = gain.ewm(alpha=1/period, adjust=False).mean()
avg_l = loss.ewm(alpha=1/period, adjust=False).mean()
rsi = 100 - 100 / (1 + avg_g / avg_l.replace(0, 1e-9))
rsi_val = rsi.iloc[-1]
print(f'RSI(14)={rsi_val:.2f}')

# === KDJ (9,3,3) ===
low9 = df['low'].rolling(9).min()
high9 = df['high'].rolling(9).max()
rsv = (df['close'] - low9) / (high9 - low9 + 1e-9) * 100
K = rsv.ewm(alpha=1/3, adjust=False).mean()
D = K.ewm(alpha=1/3, adjust=False).mean()
J = 3*K - 2*D
j_val = J.iloc[-1]
print(f'KDJ: K={K.iloc[-1]:.2f}, D={D.iloc[-1]:.2f}, J={j_val:.2f}')

# === Bollinger Bands (20,2) ===
mid_bb = df['close'].rolling(20).mean()
std_bb = df['close'].rolling(20).std()
upper_bb = mid_bb + 2*std_bb
lower_bb = mid_bb - 2*std_bb
c_last = df['close'].iloc[-1]
bb_width = (upper_bb.iloc[-1] - lower_bb.iloc[-1]) / mid_bb.iloc[-1] * 100
print(f'Bollinger: UP={upper_bb.iloc[-1]:.2f}, MID={mid_bb.iloc[-1]:.2f}, LOW={lower_bb.iloc[-1]:.2f}, 带宽={bb_width:.1f}%')
bb_signal = "下轨附近(超卖)" if c_last < lower_bb.iloc[-1] else ("上轨附近(超买)" if c_last > upper_bb.iloc[-1] else "中轨附近")
print(f'  价格={c_last:.2f} → {bb_signal}')

# === ADX (14) ===
tr_list = []
for i in range(1, len(df)):
    h_l = df['high'].iloc[i] - df['low'].iloc[i]
    h_cp = abs(df['high'].iloc[i] - df['close'].iloc[i-1])
    l_cp = abs(df['low'].iloc[i] - df['close'].iloc[i-1])
    tr_list.append(max(h_l, h_cp, l_cp))
tr = pd.Series([tr_list[0]] + tr_list)
dm_plus = (df['high'] - df['high'].shift()).clip(lower=0)
dm_minus = (df['low'].shift() - df['low']).clip(lower=0)
atr14 = tr.ewm(alpha=1/14, adjust=False).mean()
di_plus = 100 * dm_plus.ewm(alpha=1/14, adjust=False).mean() / atr14
di_minus = 100 * dm_minus.ewm(alpha=1/14, adjust=False).mean() / atr14
dx = (di_plus - di_minus).abs() / (di_plus + di_minus + 1e-9) * 100
adx = dx.ewm(alpha=1/14, adjust=False).mean()
adx_val = adx.iloc[-1]
print(f'ADX(14)={adx_val:.2f}, DI+={di_plus.iloc[-1]:.2f}, DI-={di_minus.iloc[-1]:.2f}')
print(f'  趋势强度: {"强趋势" if adx_val > 25 else "震荡/弱趋势"}')

# === ATR / N value (20) ===
atr20 = tr.ewm(alpha=1/20, adjust=False).mean()
n_val = atr20.iloc[-1]
print(f'ATR/N值(20)={n_val:.2f}, 占价格={n_val/c_last*100:.2f}%')

# === Turtle System ===
hh_20 = df['high'].rolling(20).max()
ll_20 = df['low'].rolling(20).min()
ll_10 = df['low'].rolling(10).min()
hh_10 = df['high'].rolling(10).max()
print(f'Turtle: 20日高={hh_20.iloc[-1]:.2f}, 20日低={ll_20.iloc[-1]:.2f}, 10日低={ll_10.iloc[-1]:.2f}, 10日高={hh_10.iloc[-1]:.2f}')
print(f'  S1入场(>20日高): {"YES!" if c_last > hh_20.iloc[-1] else "NO"}')
print(f'  S1出场(<10日低): {"YES! Exit signal" if c_last < ll_10.iloc[-1] else "NO"}')
print(f'  S2出场(<20日低): {"YES! Exit signal" if c_last < ll_20.iloc[-1] else "NO"}')
print(f'  止损(S1入场-2N): {c_last - 2*n_val:.2f}')

# === Chan Theory - Fractals ===
fx_list = []
for i in range(2, len(df)-2):
    if df['high'].iloc[i] > df['high'].iloc[i-1] and df['high'].iloc[i] > df['high'].iloc[i+1] and \
       df['high'].iloc[i] > df['high'].iloc[i-2] and df['high'].iloc[i] > df['high'].iloc[i+2]:
        fx_list.append((df['time'].iloc[i], '顶分型', df['high'].iloc[i]))
    if df['low'].iloc[i] < df['low'].iloc[i-1] and df['low'].iloc[i] < df['low'].iloc[i+1] and \
       df['low'].iloc[i] < df['low'].iloc[i-2] and df['low'].iloc[i] < df['low'].iloc[i+2]:
        fx_list.append((df['time'].iloc[i], '底分型', df['low'].iloc[i]))

print(f'Chan Theory (缠论分型):')
for fx in fx_list[-6:]:
    print(f'  {fx[0]} | {fx[1]} | {fx[2]:.2f}')

recent_high = df['high'].iloc[-10:].max()
recent_low = df['low'].iloc[-10:].min()
print(f'  10日震荡区间: [{recent_low:.2f}, {recent_high:.2f}]')

# === Volume ===
avg_v5 = df['volume'].iloc[-5:].mean()
avg_v20 = df['volume'].iloc[-20:].mean()
print(f'Volume: 5日均量={avg_v5:.0f}, 20日均量={avg_v20:.0f}, 量比={avg_v5/avg_v20*100:.1f}%')

# === OBV ===
obv = (df['volume'] * df['close'].diff().apply(lambda x: 1 if x > 0 else (-1 if x < 0 else 0))).cumsum()
obv_trend = "上升" if obv.iloc[-1] > obv.iloc[-5] else "下降"
print(f'OBV(5日): {obv_trend}')

# === Price change summary ===
print(f'\\n区间统计: 最高={df["high"].max():.2f}, 最低={df["low"].min():.2f}')
print(f'  5/6开盘={df["open"].iloc[0]:.2f}, 6/25收盘={df["close"].iloc[-1]:.2f}')
print(f'  区间涨跌={((df["close"].iloc[-1]/df["open"].iloc[0])-1)*100:.1f}%')

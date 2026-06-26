const fs = require('fs');

// Load data
const raw = JSON.parse(fs.readFileSync('C:/Users/Kanna/projects/multi-trader-analysis/kline_data.json', 'utf8'));
const N = raw.length;

// Convert to numeric arrays
const dates = raw.map(r => r.day);
const opens = raw.map(r => parseFloat(r.open));
const highs = raw.map(r => parseFloat(r.high));
const lows = raw.map(r => parseFloat(r.low));
const closes = raw.map(r => parseFloat(r.close));
const volumes = raw.map(r => parseFloat(r.volume));

// Helper functions
function ema(data, period) {
    const k = 2 / (period + 1);
    let result = [data[0]];
    for (let i = 1; i < data.length; i++) {
        result.push(data[i] * k + result[i - 1] * (1 - k));
    }
    return result;
}

function sma(data, period) {
    let result = [];
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) { result.push(NaN); continue; }
        let sum = 0;
        for (let j = i - period + 1; j <= i; j++) sum += data[j];
        result.push(sum / period);
    }
    return result;
}

function rollingMax(data, period) {
    let result = [];
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) { result.push(NaN); continue; }
        let max = -Infinity;
        for (let j = i - period + 1; j <= i; j++) max = Math.max(max, data[j]);
        result.push(max);
    }
    return result;
}

function rollingMin(data, period) {
    let result = [];
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) { result.push(NaN); continue; }
        let min = Infinity;
        for (let j = i - period + 1; j <= i; j++) min = Math.min(min, data[j]);
        result.push(min);
    }
    return result;
}

const last = N - 1;
const c = closes;

console.log("=".repeat(70));
console.log("  600089.SH (特变电工) 技术分析报告");
console.log("  数据日期: " + dates[0] + " 至 " + dates[last]);
console.log("  最新收盘价: " + c[last].toFixed(2));
console.log("=".repeat(70));

// ============================================================
// 1. RSI (14)
// ============================================================
let gains = [], losses = [];
for (let i = 1; i < N; i++) {
    const d = c[i] - c[i-1];
    gains.push(d > 0 ? d : 0);
    losses.push(d < 0 ? -d : 0);
}
// Wilder's smoothing for RSI
let rsiArr = new Array(N).fill(NaN);
let avgGain = gains.slice(0, 14).reduce((a,b) => a+b, 0) / 14;
let avgLoss = losses.slice(0, 14).reduce((a,b) => a+b, 0) / 14;
for (let i = 14; i < gains.length; i++) {
    avgGain = (avgGain * 13 + gains[i]) / 14;
    avgLoss = (avgLoss * 13 + losses[i]) / 14;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsiArr[i + 1] = 100 - 100 / (1 + rs);
}
const rsiVal = rsiArr[last];

console.log("\n--- RSI(14) ---");
console.log("RSI = " + rsiVal.toFixed(2));
console.log("信号: " + (rsiVal > 70 ? "超买区 (-1)" : rsiVal < 30 ? "超卖区 (+1)" : "中性区 (0)"));

// ============================================================
// 2. MACD (12, 26, 9)
// ============================================================
const ema12 = ema(c, 12);
const ema26 = ema(c, 26);
const macd = ema12.map((v, i) => v - ema26[i]);
const signalLine = ema(macd, 9);
const hist = macd.map((v, i) => v - signalLine[i]);
const macdVote = hist[last] > 0 && hist[last] > hist[last-1] ? +1 :
                 hist[last] < 0 && hist[last] < hist[last-1] ? -1 : 0;

console.log("\n--- MACD(12,26,9) ---");
console.log("DIF = " + macd[last].toFixed(4) + ", DEA = " + signalLine[last].toFixed(4) + ", HIST = " + hist[last].toFixed(4));
console.log("信号: " + (macdVote === 1 ? "多头 (+1)" : macdVote === -1 ? "空头 (-1)" : "中性 (0)"));

// ============================================================
// 3. KDJ (9, 3, 3)
// ============================================================
const low9 = rollingMin(lows, 9);
const high9 = rollingMax(highs, 9);
let rsv = [], K = [], D = [], J = [];
for (let i = 0; i < N; i++) {
    if (i < 8 || isNaN(low9[i]) || isNaN(high9[i])) {
        rsv.push(NaN); K.push(NaN); D.push(NaN); J.push(NaN);
        continue;
    }
    const r = ((c[i] - low9[i]) / (high9[i] - low9[i] + 1e-9)) * 100;
    rsv.push(r);
    const kPrev = K.length > 0 && !isNaN(K[K.length-1]) ? K[K.length-1] : 50;
    const dPrev = D.length > 0 && !isNaN(D[D.length-1]) ? D[D.length-1] : 50;
    const kv = (2/3) * kPrev + (1/3) * r;
    const dv = (2/3) * dPrev + (1/3) * kv;
    K.push(kv);
    D.push(dv);
    J.push(3 * kv - 2 * dv);
}

console.log("\n--- KDJ(9,3,3) ---");
console.log("K = " + K[last].toFixed(2) + ", D = " + D[last].toFixed(2) + ", J = " + J[last].toFixed(2));
const kdjVote = J[last] < 20 ? +1 : J[last] > 80 ? -1 : 0;
console.log("信号: " + (kdjVote === 1 ? "超卖 (+1)" : kdjVote === -1 ? "超买 (-1)" : "中性 (0)"));

// ============================================================
// 4. Bollinger Bands (20, 2)
// ============================================================
const bbMid = sma(c, 20);
let stdArr = [];
for (let i = 0; i < N; i++) {
    if (i < 19) { stdArr.push(NaN); continue; }
    let sum = 0;
    for (let j = i - 19; j <= i; j++) sum += (c[j] - bbMid[i]) ** 2;
    stdArr.push(Math.sqrt(sum / 20));
}
const bbUpper = bbMid.map((v, i) => v + 2 * stdArr[i]);
const bbLower = bbMid.map((v, i) => v - 2 * stdArr[i]);
const bbVote = c[last] < bbLower[last] ? +1 : c[last] > bbUpper[last] ? -1 : 0;

console.log("\n--- 布林带(20,2) ---");
console.log("上轨 = " + bbUpper[last].toFixed(2) + ", 中轨 = " + bbMid[last].toFixed(2) + ", 下轨 = " + bbLower[last].toFixed(2));
console.log("收盘价 " + c[last].toFixed(2) + " 位于: " + (c[last] < bbLower[last] ? "下轨之下 (超卖)" : c[last] > bbUpper[last] ? "上轨之上 (超买)" : "轨道之内"));
console.log("信号: " + (bbVote === 1 ? "超卖 (+1)" : bbVote === -1 ? "超买 (-1)" : "中性 (0)"));

// ============================================================
// 5. EMA Cross (20/50/200)
// ============================================================
const ema20 = ema(c, 20);
const ema50 = ema(c, 50);
const ema200 = ema(c, 200);
const emaVote = ema50[last] > ema200[last] ? +1 : -1;

console.log("\n--- EMA 排列 ---");
console.log("EMA20 = " + ema20[last].toFixed(2) + ", EMA50 = " + ema50[last].toFixed(2));
if (N >= 200) console.log("EMA200 = " + ema200[last].toFixed(2));
const emaAlign = ema20[last] > ema50[last] ? (N >= 200 && ema50[last] > ema200[last] ? "多头排列" : "短期多头") : (N >= 200 && ema50[last] < ema200[last] ? "空头排列" : "短期空头");
console.log("均线排列: " + emaAlign);
console.log("信号: " + (emaVote === 1 ? "多头 (+1)" : "空头 (-1)"));

// ============================================================
// 6. ADX (14)
// ============================================================
let tr = [], dmPlus = [], dmMinus = [];
for (let i = 0; i < N; i++) {
    if (i === 0) { tr.push(NaN); dmPlus.push(NaN); dmMinus.push(NaN); continue; }
    const h = highs[i], l = lows[i], pc = c[i-1], ph = highs[i-1], pl = lows[i-1];
    tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
    dmPlus.push(h > ph && (h - ph) > (pl - l) ? Math.max(h - ph, 0) : 0);
    dmMinus.push(l < pl && (pl - l) > (h - ph) ? Math.max(pl - l, 0) : 0);
}
// Wilder's ATR
let atr = [];
let atrVal = 0;
for (let i = 1; i < 14; i++) atrVal += tr[i];
atrVal /= 14;
for (let i = 0; i < 14; i++) atr.push(NaN);
atr.push(atrVal);
for (let i = 15; i < N; i++) {
    atrVal = (atrVal * 13 + tr[i]) / 14;
    atr.push(atrVal);
}
// DI
let diPlus = [], diMinus = [];
let dipVal = 0, dimVal = 0;
for (let i = 1; i < 14; i++) { dipVal += dmPlus[i]; dimVal += dmMinus[i]; }
dipVal /= 14; dimVal /= 14;
for (let i = 0; i < 14; i++) { diPlus.push(NaN); diMinus.push(NaN); }
diPlus.push(100 * dipVal / atr[14]); diMinus.push(100 * dimVal / atr[14]);
for (let i = 15; i < N; i++) {
    dipVal = (dipVal * 13 + dmPlus[i]) / 14;
    dimVal = (dimVal * 13 + dmMinus[i]) / 14;
    diPlus.push(100 * dipVal / atr[i]);
    diMinus.push(100 * dimVal / atr[i]);
}
// ADX
let adxArr = [], dxSum = 0;
for (let i = 0; i < 14; i++) adxArr.push(NaN);
for (let i = 14; i < 28; i++) {
    const dx = Math.abs(diPlus[i] - diMinus[i]) / (diPlus[i] + diMinus[i] + 1e-9) * 100;
    dxSum += dx;
    adxArr.push(NaN);
}
adxArr.push(dxSum / 14);
let adxVal = dxSum / 14;
for (let i = 29; i < N; i++) {
    const dx = Math.abs(diPlus[i] - diMinus[i]) / (diPlus[i] + diMinus[i] + 1e-9) * 100;
    adxVal = (adxVal * 13 + dx) / 14;
    adxArr.push(adxVal);
}

const adxVote = adxArr[last] > 25 && diPlus[last] > diMinus[last] ? +1 :
                adxArr[last] > 25 && diMinus[last] > diPlus[last] ? -1 : 0;

console.log("\n--- ADX(14) ---");
console.log("ADX = " + adxArr[last].toFixed(2) + ", DI+ = " + diPlus[last].toFixed(2) + ", DI- = " + diMinus[last].toFixed(2));
console.log("趋势强度: " + (adxArr[last] > 25 ? "强趋势" : adxArr[last] > 20 ? "中等趋势" : "震荡/无趋势"));
console.log("信号: " + (adxVote === 1 ? "多头趋势 (+1)" : adxVote === -1 ? "空头趋势 (-1)" : "无趋势 (0)"));

// ============================================================
// 7. OBV
// ============================================================
let obv = [volumes[0]];
for (let i = 1; i < N; i++) {
    if (c[i] > c[i-1]) obv.push(obv[i-1] + volumes[i]);
    else if (c[i] < c[i-1]) obv.push(obv[i-1] - volumes[i]);
    else obv.push(obv[i-1]);
}
const obvVote = obv[last] > obv[last-5] ? +1 : -1;

console.log("\n--- OBV ---");
console.log("最新 OBV = " + (obv[last] / 1e9).toFixed(2) + "B");
console.log("5日趋势: " + (obvVote === 1 ? "上升 (资金流入)" : "下降 (资金流出)"));

// ============================================================
// 8. Ichimoku Cloud
// ============================================================
function midpoint(arrH, arrL, n) {
    const maxH = rollingMax(arrH, n);
    const minL = rollingMin(arrL, n);
    return maxH.map((h, i) => (isNaN(h) || isNaN(minL[i])) ? NaN : (h + minL[i]) / 2);
}
const tenkan = midpoint(highs, lows, 9);
const kijun = midpoint(highs, lows, 26);
const spanA = tenkan.map((v, i) => i + 26 < N ? (tenkan[i] + kijun[i]) / 2 : NaN);
for (let i = 0; i < 26; i++) spanA.unshift(NaN);
spanA.length = N;
const spanBraw = midpoint(highs, lows, 52);
let spanB = [];
for (let i = 0; i < 26; i++) spanB.push(NaN);
for (let i = 26; i < N; i++) spanB.push(spanBraw[i - 26]);

// Shift spanA/B back: they're plotted 26 bars ahead, so at index i their value affects future
// For analysis, we use the values computed for the current bar
// At the last bar, we need the span values that were computed 26 bars ago (if N >= 26 offset)
const saNow = spanA[last];
const sbNow = spanB[last];
const cloudTop = (!isNaN(saNow) && !isNaN(sbNow)) ? Math.max(saNow, sbNow) : NaN;
const cloudBottom = (!isNaN(saNow) && !isNaN(sbNow)) ? Math.min(saNow, sbNow) : NaN;

console.log("\n--- 一目均衡表 (Ichimoku) ---");
console.log("转折线 Tenkan(9) = " + tenkan[last].toFixed(2));
console.log("基准线 Kijun(26) = " + kijun[last].toFixed(2));
if (!isNaN(saNow)) console.log("先行带A SenkouA = " + saNow.toFixed(2));
if (!isNaN(sbNow)) console.log("先行带B SenkouB = " + sbNow.toFixed(2));
if (!isNaN(cloudTop)) console.log("云顶 = " + cloudTop.toFixed(2) + ", 云底 = " + cloudBottom.toFixed(2));
console.log("价格 " + c[last].toFixed(2) + " vs 云: " + (!isNaN(cloudTop) ? (c[last] > cloudTop ? "在云上方 (看多)" : c[last] < cloudBottom ? "在云下方 (看空)" : "在云内部 (中性)") : "N/A"));
console.log("Tenkan vs Kijun: " + (tenkan[last] > kijun[last] ? "多头排列" : "空头排列"));
console.log("云颜色: " + (!isNaN(saNow) && !isNaN(sbNow) ? (saNow > sbNow ? "阳云/看多" : "阴云/看空") : "N/A"));

// ============================================================
// 9. Turtle Trading Signals
// ============================================================
// ATR(20) using EMA method
let trFull = [];
for (let i = 0; i < N; i++) {
    if (i === 0) { trFull.push(highs[i] - lows[i]); continue; }
    trFull.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - c[i-1]), Math.abs(lows[i] - c[i-1])));
}
let nVal = trFull.slice(0, 20).reduce((a,b) => a+b, 0) / 20; // initial SMA
// EMA for N
for (let i = 20; i < N; i++) {
    nVal = (nVal * 19 + trFull[i]) / 20;
}
const currentN = nVal;

// Donchian Channels
const high20 = rollingMax(highs, 20);
const low10 = rollingMin(lows, 10);
const low20 = rollingMin(lows, 20);
const high55 = rollingMax(highs, 55);
const low55 = rollingMin(lows, 55);

const s1Entry = c[last] > high20[last - 1]; // System 1: close > 20-day high
const s2Entry = c[last] > high55[last];
const s1Exit = c[last] < low10[last];
const s2Exit = c[last] < low20[last];

console.log("\n--- 海龟交易信号 ---");
console.log("N值 (20日ATR-EMA) = " + currentN.toFixed(2));
console.log("ATR% = " + (currentN / c[last] * 100).toFixed(2) + "%");
console.log("System 1 (20日突破):");
console.log("  20日最高价 = " + high20[last].toFixed(2) + "  当前收盘 = " + c[last].toFixed(2));
console.log("  做多入场: " + (s1Entry ? "触发! 突破20日高点" : "未触发"));
console.log("  S1出场 (10日低点): " + low10[last].toFixed(2) + "  " + (s1Exit ? "触发出场!" : "未触发"));
console.log("System 2 (55日突破):");
console.log("  55日最高价 = " + high55[last].toFixed(2));
console.log("  做多入场: " + (s2Entry ? "触发!" : "未触发"));
console.log("  S2出场 (20日低点): " + low20[last].toFixed(2) + "  " + (s2Exit ? "触发出场!" : "未触发"));
console.log("止损参考 (入场-2N): 若以当前价" + c[last].toFixed(2) + "入场，止损 = " + (c[last] - 2 * currentN).toFixed(2));
console.log("加仓点 (+0.5N): " + (c[last] + 0.5 * currentN).toFixed(2));

// ============================================================
// 10. Candlestick Patterns
// ============================================================
console.log("\n--- K线形态识别 ---");
let signals = [], score = 0;
const body = closes.map((v, i) => Math.abs(v - opens[i]));
const rng = highs.map((v, i) => v - lows[i]);
const upperShadow = raw.map((r, i) => r.high - Math.max(r.close, r.open));
const lowerShadow = raw.map((r, i) => Math.min(r.close, r.open) - r.low);
const bull = closes.map((v, i) => v > opens[i]);

// Single bar patterns (check last 5 bars)
for (let i = Math.max(0, N - 5); i < N; i++) {
    const b = body[i], u = upperShadow[i], lo = lowerShadow[i], rg = rng[i];
    const date = dates[i];
    // Doji
    if (b < 0.05 * rg) {
        signals.push({ date, name: "十字星/Doji", s: 0 });
    }
    // Hammer
    if (lo > 2 * b && u < 0.1 * b) {
        signals.push({ date, name: "锤子线/Hammer", s: +1 });
        score += 1;
    }
    // Shooting Star
    if (u > 2 * b && lo < 0.1 * b && i > 0 && bull[i-1]) {
        signals.push({ date, name: "射击之星/Shooting Star", s: -1 });
        score -= 1;
    }
    // Marubozu bullish
    if (b > 0.9 * rg && bull[i]) {
        signals.push({ date, name: "光头光脚阳线/Bullish Marubozu", s: +1 });
        score += 1;
    }
    // Marubozu bearish
    if (b > 0.9 * rg && !bull[i]) {
        signals.push({ date, name: "光头光脚阴线/Bearish Marubozu", s: -1 });
        score -= 1;
    }
}

// Two-bar patterns (last 5)
for (let i = Math.max(1, N - 5); i < N; i++) {
    const p = raw[i-1], cur = raw[i];
    // Bullish engulfing
    if (!bull[i-1] && bull[i] && cur.open < p.close && cur.close > p.open) {
        signals.push({ date: dates[i], name: "看涨吞没/Bullish Engulfing", s: +2 });
        score += 2;
    }
    // Bearish engulfing
    if (bull[i-1] && !bull[i] && cur.open > p.close && cur.close < p.open) {
        signals.push({ date: dates[i], name: "看跌吞没/Bearish Engulfing", s: -2 });
        score -= 2;
    }
    // Piercing line
    if (!bull[i-1] && bull[i] && cur.open < p.low && cur.close > (p.open + p.close) / 2) {
        signals.push({ date: dates[i], name: "刺透线/Piercing Line", s: +1 });
        score += 1;
    }
    // Dark cloud cover
    if (bull[i-1] && !bull[i] && cur.open > p.high && cur.close < (p.open + p.close) / 2) {
        signals.push({ date: dates[i], name: "乌云盖顶/Dark Cloud Cover", s: -1 });
        score -= 1;
    }
}

// Three-bar patterns (last 5)
for (let i = Math.max(2, N - 5); i < N; i++) {
    const a = raw[i-2], b = raw[i-1], cur = raw[i];
    // Three white soldiers
    if (bull[i-2] && bull[i-1] && bull[i] && cur.close > b.close && b.close > a.close) {
        signals.push({ date: dates[i], name: "三白兵/Three White Soldiers", s: +2 });
        score += 2;
    }
    // Three black crows
    if (!bull[i-2] && !bull[i-1] && !bull[i] && cur.close < b.close && b.close < a.close) {
        signals.push({ date: dates[i], name: "三黑鸦/Three Black Crows", s: -2 });
        score -= 2;
    }
}

const candlestickComposite = score >= 2 ? "看多/Bullish" : score <= -2 ? "看空/Bearish" : "中性/Neutral";
console.log("综合得分: " + score + " → " + candlestickComposite);
// Show most recent 5 patterns
const recentPatterns = signals.filter(s => s.date >= dates[N-5]);
for (const p of recentPatterns) {
    console.log("  " + p.date + "  " + p.name + "  (" + (p.s >= 0 ? "+" : "") + p.s + ")");
}
if (recentPatterns.length === 0) console.log("  近5日未检测到明显形态。");

// ============================================================
// 11. 价格统计分析
// ============================================================
console.log("\n--- 价格统计 ---");
const recent10 = closes.slice(-10);
const recent20 = closes.slice(-20);
console.log("10日最高价: " + Math.max(...recent10).toFixed(2));
console.log("10日最低价: " + Math.min(...recent10).toFixed(2));
console.log("20日最高价: " + Math.max(...recent20).toFixed(2));
console.log("20日最低价: " + Math.min(...recent20).toFixed(2));
console.log("200日最高价: " + Math.max(...closes).toFixed(2));
console.log("200日最低价: " + Math.min(...closes).toFixed(2));
console.log("当前价 vs 200日最高: " + (c[last] / Math.max(...closes) * 100).toFixed(1) + "%");
console.log("当前价 vs 200日最低: " + (c[last] / Math.min(...closes) * 100).toFixed(1) + "%");

// ============================================================
// 12. 综合投票
// ============================================================
const rsiVote = rsiVal > 70 ? -1 : rsiVal < 30 ? +1 : 0;
const totalVotes = macdVote + rsiVote + kdjVote + bbVote + emaVote + adxVote + obvVote;
const composite = totalVotes >= 3 ? "买入/Buy" : totalVotes <= -3 ? "卖出/Sell" : "持观望/Neutral";

console.log("\n" + "=".repeat(70));
console.log("  综合指标投票");
console.log("=".repeat(70));
console.log("  MACD:         " + (macdVote > 0 ? "+1 多头" : macdVote < 0 ? "-1 空头" : " 0 中性"));
console.log("  RSI(14):      " + (rsiVote > 0 ? "+1 超卖" : rsiVote < 0 ? "-1 超买" : " 0 中性") + " (" + rsiVal.toFixed(1) + ")");
console.log("  KDJ J:        " + (kdjVote > 0 ? "+1 超卖" : kdjVote < 0 ? "-1 超买" : " 0 中性") + " (" + J[last].toFixed(1) + ")");
console.log("  Bollinger:    " + (bbVote > 0 ? "+1 下轨支撑" : bbVote < 0 ? "-1 上轨压力" : " 0 中性"));
console.log("  EMA 50/200:   " + (emaVote > 0 ? "+1 多头排列" : "-1 空头排列"));
console.log("  ADX(14):      " + (adxVote > 0 ? "+1 多头趋势" : adxVote < 0 ? "-1 空头趋势" : " 0 无趋势") + " (" + adxArr[last].toFixed(1) + ")");
console.log("  OBV:          " + (obvVote > 0 ? "+1 资金流入" : "-1 资金流出"));
console.log("  ────────────────────");
console.log("  总计: " + (totalVotes > 0 ? "+" : "") + totalVotes + " → " + composite);

// ============================================================
// 13. 支撑阻力分析
// ============================================================
console.log("\n--- 关键支撑阻力位 ---");

// Find local maxima and minima (swing points)
function findSwingPoints(threshold = 0.03) {
    let swingHighs = [], swingLows = [];
    for (let i = 5; i < N - 5; i++) {
        // Swing high
        let isHigh = true;
        for (let j = i - 5; j <= i + 5; j++) {
            if (j !== i && highs[j] >= highs[i]) { isHigh = false; break; }
        }
        if (isHigh) swingHighs.push({ idx: i, date: dates[i], price: highs[i] });

        // Swing low
        let isLow = true;
        for (let j = i - 5; j <= i + 5; j++) {
            if (j !== i && lows[j] <= lows[i]) { isLow = false; break; }
        }
        if (isLow) swingLows.push({ idx: i, date: dates[i], price: lows[i] });
    }
    return { swingHighs, swingLows };
}

const { swingHighs, swingLows } = findSwingPoints();

// Recent swing points for support/resistance
const recentSH = swingHighs.filter(s => s.idx >= N - 60).sort((a, b) => b.price - a.price);
const recentSL = swingLows.filter(s => s.idx >= N - 60).sort((a, b) => a.price - b.price);

console.log("近期摆动高点 (阻力位):");
for (const s of recentSH.slice(0, 3)) {
    console.log("  " + s.date + "  ¥" + s.price.toFixed(2));
}
console.log("近期摆动低点 (支撑位):");
for (const s of recentSL.slice(0, 3)) {
    console.log("  " + s.date + "  ¥" + s.price.toFixed(2));
}

// ============================================================
// 14. 缠论简化分析 (手動笔和中枢)
// ============================================================
console.log("\n--- 缠论简化分析 ---");

// Simplified 笔 detection (based on swing points)
function detectBi(swingHighs, swingLows) {
    let biList = [];
    let allSwings = [...swingHighs.map(s => ({ ...s, type: 'top' })), ...swingLows.map(s => ({ ...s, type: 'bottom' }))];
    allSwings.sort((a, b) => a.idx - b.idx);

    // Merge adjacent same-type swings keeping the extreme
    let merged = [];
    for (let i = 0; i < allSwings.length; i++) {
        if (merged.length === 0 || merged[merged.length - 1].type !== allSwings[i].type) {
            merged.push(allSwings[i]);
        } else {
            if (allSwings[i].type === 'top' && allSwings[i].price > merged[merged.length - 1].price) {
                merged[merged.length - 1] = allSwings[i];
            } else if (allSwings[i].type === 'bottom' && allSwings[i].price < merged[merged.length - 1].price) {
                merged[merged.length - 1] = allSwings[i];
            }
        }
    }

    // Each pair of alternating swing points forms a 笔
    for (let i = 0; i < merged.length - 1; i++) {
        const start = merged[i], end = merged[i + 1];
        biList.push({
            start: { date: start.date, price: start.price, type: start.type },
            end: { date: end.date, price: end.price, type: end.type },
            direction: start.type === 'bottom' ? '上升笔/Up' : '下降笔/Down',
            amplitude: Math.abs(end.price - start.price)
        });
    }
    return { biList, mergedSwings: merged };
}

const { biList, mergedSwings } = detectBi(swingHighs, swingLows);

// Recent bi list
console.log("最近笔 (近60日):");
const recentBis = biList.filter(b => {
    return mergedSwings.findIndex(s => s.date === b.start.date) >= Math.max(0, mergedSwings.length - 10);
});
for (const bi of recentBis.slice(-5)) {
    console.log("  " + bi.start.date + " → " + bi.end.date + "  " + bi.direction + "  ¥" + bi.start.price.toFixed(2) + " → ¥" + bi.end.price.toFixed(2));
}

// Simplified 中枢 detection (overlapping price ranges of at least 3 consecutive 笔)
function detectZhongshu(biList) {
    let zhongshuList = [];
    for (let i = 0; i < biList.length - 2; i++) {
        const b1 = biList[i], b2 = biList[i+1], b3 = biList[i+2];
        // Zhongshu = overlapping zone of 3 consecutive bi
        const high1 = Math.max(b1.start.price, b1.end.price);
        const low1 = Math.min(b1.start.price, b1.end.price);
        const high2 = Math.max(b2.start.price, b2.end.price);
        const low2 = Math.min(b2.start.price, b2.end.price);
        const high3 = Math.max(b3.start.price, b3.end.price);
        const low3 = Math.min(b3.start.price, b3.end.price);

        const zsHigh = Math.min(high1, high2, high3);
        const zsLow = Math.max(low1, low2, low3);

        if (zsHigh > zsLow) {
            zhongshuList.push({
                biRange: [b1.start.date, b3.end.date],
                high: zsHigh,
                low: zsLow,
                center: (zsHigh + zsLow) / 2
            });
        }
    }
    return zhongshuList;
}

const zhongshuList = detectZhongshu(biList);
console.log("\n最近中枢:");
const recentZS = zhongshuList.slice(-3);
for (const zs of recentZS) {
    console.log("  区间: ¥" + zs.low.toFixed(2) + " - ¥" + zs.high.toFixed(2) + " (中枢价: ¥" + zs.center.toFixed(2) + ")");
}

// 买卖点判断
const lastZS = zhongshuList[zhongshuList.length - 1];
if (lastZS) {
    console.log("\n买卖点分析:");
    console.log("  当前价 ¥" + c[last].toFixed(2) + " vs 最近中枢 [¥" + lastZS.low.toFixed(2) + " - ¥" + lastZS.high.toFixed(2) + "]");
    if (c[last] < lastZS.low) {
        console.log("  价格在中枢下方 → 若出现底分型可考虑一买");
    } else if (c[last] > lastZS.high) {
        console.log("  价格突破中枢上沿 → 若回踩不破可关注三买");
    } else {
        console.log("  价格在中枢内震荡 → 观察中枢突破方向");
    }
}

// ============================================================
// 15. 趋势分析总结
// ============================================================
console.log("\n" + "=".repeat(70));
console.log("  趋势与结构总结");
console.log("=".repeat(70));

// Trend by moving average alignment
const shortTermTrend = ema20[last] > ema50[last] ? "短期偏多" : "短期偏空";
const mediumTermTrend = N >= 200 ? (ema50[last] > ema200[last] ? "中期偏多" : "中期偏空") : "中期: 数据不足";

// Price vs key MAs
console.log("短期趋势 (EMA20/50): " + shortTermTrend);
console.log("中期趋势 (EMA50/200): " + mediumTermTrend);
console.log("当前价 ¥" + c[last].toFixed(2) + " vs EMA20: " + (c[last] > ema20[last] ? "上方" : "下方") + " (差距 " + ((c[last] - ema20[last]) / ema20[last] * 100).toFixed(1) + "%)");
console.log("当前价 ¥" + c[last].toFixed(2) + " vs EMA50: " + (c[last] > ema50[last] ? "上方" : "下方") + " (差距 " + ((c[last] - ema50[last]) / ema50[last] * 100).toFixed(1) + "%)");

// Volatility assessment
console.log("\n波动率评估:");
console.log("  当前ATR(20) = ¥" + currentN.toFixed(2) + " (ATR% = " + (currentN / c[last] * 100).toFixed(2) + "%)");

// Volume analysis
const avgVol10 = volumes.slice(-10).reduce((a,b) => a+b, 0) / 10;
const avgVol50 = volumes.slice(-50).reduce((a,b) => a+b, 0) / 50;
console.log("成交量分析:");
console.log("  近10日均量: " + (avgVol10 / 1e6).toFixed(0) + "万手");
console.log("  近50日均量: " + (avgVol50 / 1e6).toFixed(0) + "万手");
console.log("  量比 (10日/50日): " + (avgVol10 / avgVol50).toFixed(2));

// Additional data for structured output
console.log("\n---DATA_FOR_OUTPUT---");
console.log("RSI=" + rsiVal.toFixed(2));
console.log("MACD_HIST=" + hist[last].toFixed(4));
console.log("MACD_DIF=" + macd[last].toFixed(4));
console.log("EMA20=" + ema20[last].toFixed(2));
console.log("EMA50=" + ema50[last].toFixed(2));
console.log("EMA200=" + (N >= 200 ? ema200[last].toFixed(2) : "N/A"));
console.log("BB_UPPER=" + bbUpper[last].toFixed(2));
console.log("BB_MID=" + bbMid[last].toFixed(2));
console.log("BB_LOWER=" + bbLower[last].toFixed(2));
console.log("ADX=" + adxArr[last].toFixed(2));
console.log("ATR=" + currentN.toFixed(2));
console.log("HIGH_200=" + Math.max(...closes).toFixed(2));
console.log("LOW_200=" + Math.min(...closes).toFixed(2));
console.log("HIGH_20=" + high20[last].toFixed(2));
console.log("LOW_20=" + low20[last].toFixed(2));
console.log("HIGH_55=" + high55[last].toFixed(2));
console.log("KDJ_K=" + K[last].toFixed(2));
console.log("KDJ_D=" + D[last].toFixed(2));
console.log("KDJ_J=" + J[last].toFixed(2));
if (lastZS) {
    console.log("ZS_HIGH=" + lastZS.high.toFixed(2));
    console.log("ZS_LOW=" + lastZS.low.toFixed(2));
}
console.log("S1_ENTRY=" + s1Entry);
console.log("S2_ENTRY=" + s2Entry);
console.log("S1_EXIT=" + s1Exit);
console.log("S2_EXIT=" + s2Exit);
console.log("VOL_10D_AVG=" + (avgVol10 / 1e6).toFixed(0));
console.log("CANDLESTICK_SCORE=" + score);

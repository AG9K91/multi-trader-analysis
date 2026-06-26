// 002202.SZ Quantitative Analysis Script
// Uses Node.js built-in fetch (available from Node 18+)

// Helper: fetch Tencent K-line data (JSONP format)
async function fetchTecentKline(symbol, count = 320) {
  const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?_var=kline_dayqfq&param=${symbol},day,,,${count},qfq&r=0.5`;
  const resp = await fetch(url);
  let text = await resp.text();

  // Strip JSONP callback wrapper. Tencent API wraps response as "callback_name=(...)"
  // or "callback_name={...}" or "callback_name(...)"
  // Find the first '(' or '{' that starts actual JSON
  const jsonStart = Math.min(
    text.indexOf('(') >= 0 ? text.indexOf('(') : Infinity,
    text.indexOf('{') >= 0 ? text.indexOf('{') : Infinity
  );
  if (jsonStart >= 0 && jsonStart < Infinity) {
    text = text.substring(jsonStart);
  }
  // Remove trailing semicolon and optional closing paren
  text = text.replace(/\);?\s*$/, '').replace(/\);?$/, '');
  // If starts with '(', remove outer parens
  if (text.startsWith('(')) {
    text = text.substring(1);
    if (text.endsWith(')')) text = text.substring(0, text.length - 1);
  }

  const d = JSON.parse(text);
  const raw = d['data'] || d;
  for (const key of Object.keys(raw)) {
    const inner = raw[key];
    const klineArr = (inner && inner.qfqday) || (inner && inner.day) || null;
    if (klineArr && Array.isArray(klineArr) && klineArr.length > 0) {
      return klineArr.map(row => ({
        date: row[0],
        open: parseFloat(row[1]),
        close: parseFloat(row[2]),
        high: parseFloat(row[3]),
        low: parseFloat(row[4]),
        volume: parseFloat(row[5])
      }));
    }
  }
  throw new Error('Cannot find qfqday in response');
}

// Math helpers
function mean(arr) { return arr.reduce((a,b)=>a+b,0) / arr.length; }
function std(arr) { const m = mean(arr); return Math.sqrt(arr.reduce((s,v)=>s+(v-m)**2,0)/(arr.length-1)); }
function sum(arr) { return arr.reduce((a,b)=>a+b,0); }
function cov(x, y) {
  const mx = mean(x), my = mean(y);
  return sum(x.map((xi,i) => (xi-mx)*(y[i]-my))) / (x.length - 1);
}
function pearson(x, y) { return cov(x,y) / (std(x) * std(y)); }

function skewness(arr) {
  const m = mean(arr), s = std(arr), n = arr.length;
  return (n/((n-1)*(n-2))) * sum(arr.map(v => ((v-m)/s)**3));
}
function excessKurtosis(arr) {
  const m = mean(arr), s = std(arr), n = arr.length;
  const k = (n*(n+1))/((n-1)*(n-2)*(n-3)) * sum(arr.map(v => ((v-m)/s)**4));
  return k - (3*(n-1)**2)/((n-2)*(n-3));
}
function percentile(arr, p) {
  const sorted = [...arr].sort((a,b)=>a-b);
  const idx = (p/100) * (sorted.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function logReturns(closes) {
  const rets = [];
  for (let i = 1; i < closes.length; i++) {
    rets.push(Math.log(closes[i] / closes[i-1]));
  }
  return rets;
}

function annualVol(returns) { return std(returns) * Math.sqrt(252); }

function rollingVol(returns, window) {
  const vols = [];
  for (let i = window - 1; i < returns.length; i++) {
    vols.push(std(returns.slice(i - window + 1, i + 1)) * Math.sqrt(252));
  }
  return vols;
}

function computeMaxDrawdown(closes) {
  let peak = closes[0], maxDD = 0;
  for (const c of closes) {
    if (c > peak) peak = c;
    const dd = (peak - c) / peak;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD;
}

// ADF test (simplified OLS on diff ~ lagged_level)
function adfTest(series) {
  const y = []; // diffs
  const x = []; // lagged levels
  for (let i = 1; i < series.length; i++) {
    y.push(series[i] - series[i-1]);
    x.push(series[i-1]);
  }
  const n = y.length;
  const mx = mean(x), my = mean(y);
  let ssx = 0, sxy = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    ssx += dx * dx;
    sxy += dx * (y[i] - my);
  }
  const slope = sxy / ssx;
  const intercept = my - slope * mx;
  const resid = y.map((yi, i) => yi - intercept - slope * x[i]);
  const rss = resid.reduce((s,r) => s + r*r, 0);
  const se = Math.sqrt(rss / ((n - 2) * ssx));
  const t_stat = slope / se;

  const crit_1pct = -3.43, crit_5pct = -2.86, crit_10pct = -2.57;
  let verdict;
  if (t_stat < crit_1pct) verdict = '拒绝单位根 (1%显著) — 序列平稳';
  else if (t_stat < crit_5pct) verdict = '拒绝单位根 (5%显著) — 序列平稳';
  else if (t_stat < crit_10pct) verdict = '拒绝单位根 (10%显著) — 序列平稳';
  else verdict = '无法拒绝单位根 — 存在单位根';

  return { t_stat, crit_1pct, crit_5pct, crit_10pct, verdict, nobs: n };
}

// Seasonality
function seasonality(dates, returns) {
  const monthly = {};
  const dow = {};
  for (let i = 0; i < dates.length; i++) {
    const d = new Date(dates[i]);
    if (isNaN(d.getTime())) continue;
    const m = d.getMonth();
    const w = d.getDay();
    if (!monthly[m]) monthly[m] = [];
    if (!dow[w]) dow[w] = [];
    monthly[m].push(returns[i]);
    dow[w].push(returns[i]);
  }
  const mNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  const dNames = ['周日','周一','周二','周三','周四','周五','周六'];

  const monthResults = [];
  for (let m = 0; m < 12; m++) {
    if (!monthly[m]) continue;
    monthResults.push({
      month: mNames[m],
      avgRet: mean(monthly[m]) * 100,
      winRate: monthly[m].filter(r => r > 0).length / monthly[m].length,
      count: monthly[m].length
    });
  }
  const dowResults = [];
  for (let w = 0; w < 7; w++) {
    if (!dow[w]) continue;
    dowResults.push({
      day: dNames[w],
      avgRet: mean(dow[w]) * 100,
      winRate: dow[w].filter(r => r > 0).length / dow[w].length,
      count: dow[w].length
    });
  }
  return { monthResults, dowResults };
}

// ========== MAIN ==========
async function main() {
  console.log('=== 002202.SZ (金风科技) 量化分析 ===');
  console.log('分析日期: 2026-06-26\n');

  console.log('正在获取 K 线数据...');
  const [stockData, indexData] = await Promise.all([
    fetchTecentKline('sz002202', 320),
    fetchTecentKline('sh000300', 320)
  ]);
  console.log(`002202.SZ: ${stockData.length} 个交易日`);
  console.log(`000300.SH: ${indexData.length} 个交易日\n`);

  // Align
  const stockMap = new Map(stockData.map(d => [d.date, d]));
  const indexMap = new Map(indexData.map(d => [d.date, d]));
  const commonDates = [...stockMap.keys()].filter(d => indexMap.has(d)).sort();
  const stockAligned = commonDates.map(d => stockMap.get(d));
  const indexAligned = commonDates.map(d => indexMap.get(d));
  const stockCloses = stockAligned.map(d => d.close);
  const indexCloses = indexAligned.map(d => d.close);
  const stockRets = logReturns(stockCloses);
  const indexRets = logReturns(indexCloses);
  const retDates = commonDates.slice(1);
  console.log(`对齐后共 ${stockAligned.length} 个共同交易日\n`);

  // === 1. Factor Exposure ===
  console.log('═══════════════════════════════');
  console.log('  1. 因子暴露分析');
  console.log('═══════════════════════════════');
  const pe = 27.23, pb = 3.57, roe = 3.79;
  console.log(`  估值因子: PE=${pe}, PB=${pb}, 1/PE+1/PB 加权=${(0.5*(1/pe)+0.5*(1/pb)).toFixed(4)}`);
  const mom20 = stockCloses[stockCloses.length-1]/stockCloses[stockCloses.length-21]-1;
  const mom60 = stockCloses[stockCloses.length-1]/stockCloses[stockCloses.length-61]-1;
  const mom120 = stockCloses[stockCloses.length-1]/stockCloses[stockCloses.length-121]-1;
  console.log(`  动量因子: 20日=${(mom20*100).toFixed(1)}%, 60日=${(mom60*100).toFixed(1)}%, 120日=${(mom120*100).toFixed(1)}%`);
  console.log(`  质量因子: ROE=${roe}%`);
  const hv20Val = annualVol(stockRets.slice(-20));
  const hv60Val = annualVol(stockRets.slice(-60));
  console.log(`  低波动因子: HV20=${(hv20Val*100).toFixed(1)}%, HV60=${(hv60Val*100).toFixed(1)}%\n`);

  // === 2. Volatility ===
  console.log('═══════════════════════════════');
  console.log('  2. 波动率分析');
  console.log('═══════════════════════════════');
  const allHV20 = rollingVol(stockRets, 20);
  const curHV20 = allHV20[allHV20.length-1];
  const hvPct = allHV20.filter(v => v < curHV20).length / allHV20.length * 100;
  const hvMed = percentile(allHV20, 50);
  const hvP25 = percentile(allHV20, 25);
  const hvP75 = percentile(allHV20, 75);
  console.log(`  当前 HV20: ${(curHV20*100).toFixed(2)}%`);
  console.log(`  HV20 中位数: ${(hvMed*100).toFixed(2)}%`);
  console.log(`  HV20 25-75分位: ${(hvP25*100).toFixed(2)}% - ${(hvP75*100).toFixed(2)}%`);
  console.log(`  当前波动率分位数: ${hvPct.toFixed(1)}%`);
  const regime = hvPct < 25 ? '低波动区间 — Long Vega 策略有利' : hvPct > 75 ? '高波动区间 — Short Vega 策略有利' : '正常波动区间';
  console.log(`  波动率状态: ${regime}\n`);

  // === 3. Seasonality ===
  console.log('═══════════════════════════════');
  console.log('  3. 季节性分析');
  console.log('═══════════════════════════════');
  const { monthResults, dowResults } = seasonality(retDates, stockRets);
  monthResults.sort((a,b) => b.avgRet - a.avgRet);
  console.log('  月份效应 (按日均收益排序):');
  monthResults.forEach(r => {
    const mark = Math.abs(r.avgRet) > 0.3 ? ' ***' : Math.abs(r.avgRet) > 0.15 ? ' **' : '';
    console.log(`    ${r.month}: 日均${r.avgRet.toFixed(3)}% 胜率${(r.winRate*100).toFixed(0)}% (${r.count}天)${mark}`);
  });
  console.log('  周内效应:');
  dowResults.forEach(r => {
    console.log(`    ${r.day}: 日均${r.avgRet.toFixed(3)}% 胜率${(r.winRate*100).toFixed(0)}% (${r.count}天)`);
  });
  console.log();

  // === 4. Correlation ===
  console.log('═══════════════════════════════');
  console.log('  4. 相关性分析');
  console.log('═══════════════════════════════');
  const corr = pearson(stockRets, indexRets);
  const beta = cov(stockRets, indexRets) / (std(indexRets) ** 2);
  console.log(`  与沪深300 Pearson 相关系数: ${corr.toFixed(4)}`);
  console.log(`  Beta: ${beta.toFixed(4)}`);

  const rollCorrs = [];
  for (let i = 60; i <= stockRets.length; i++) {
    rollCorrs.push(pearson(stockRets.slice(i-60,i), indexRets.slice(i-60,i)));
  }
  console.log(`  60日滚动相关: 当前=${rollCorrs[rollCorrs.length-1].toFixed(3)}, 均值=${mean(rollCorrs).toFixed(3)}, 范围=[${Math.min(...rollCorrs).toFixed(3)}, ${Math.max(...rollCorrs).toFixed(3)}]\n`);

  // === 5. Stats ===
  console.log('═══════════════════════════════');
  console.log('  5. 统计特征');
  console.log('═══════════════════════════════');
  const adfPrice = adfTest(stockCloses);
  const adfRets = adfTest(stockRets);
  console.log(`  ADF 检验 (收盘价): t=${adfPrice.t_stat.toFixed(3)} → ${adfPrice.verdict}`);
  console.log(`  ADF 检验 (日对数收益): t=${adfRets.t_stat.toFixed(3)} → ${adfRets.verdict}`);
  const sk = skewness(stockRets);
  const kt = excessKurtosis(stockRets);
  console.log(`  偏度: ${sk.toFixed(4)} ${sk<-0.5?'(显著左偏/负偏)':sk>0.5?'(右偏/正偏)':'(近似对称)'}`);
  console.log(`  超额峰度: ${kt.toFixed(4)} ${kt>1?'(厚尾特征明显)':'(接近正态分布)'}`);

  const annRet = mean(stockRets) * 252;
  const annVol = std(stockRets) * Math.sqrt(252);
  const sharpe = annRet / annVol;
  const maxDD = computeMaxDrawdown(stockCloses);
  console.log(`  年化收益率: ${(annRet*100).toFixed(2)}%`);
  console.log(`  年化波动率: ${(annVol*100).toFixed(2)}%`);
  console.log(`  Sharpe Ratio: ${sharpe.toFixed(3)}`);
  console.log(`  最大回撤: ${(maxDD*100).toFixed(2)}%\n`);

  // === 6. Multi-factor Composite ===
  console.log('═══════════════════════════════');
  console.log('  6. 多因子综合打分');
  console.log('═══════════════════════════════');
  // Z-scores relative to A-share norms
  const peZ = (20 - pe) / 15;       // reference PE ~20, lower PE better
  const pbZ = (2.5 - pb) / 2;       // reference PB ~2.5, lower PB better
  const valueZ = 0.5 * peZ + 0.5 * pbZ;
  const momZ = (mom60 + 0.10) / 0.35;  // centered around 0%, 35% std range
  const roeZ = (roe - 8) / 8;          // reference ROE ~8%
  const volZ = (0.45 - hv60Val) / 0.20; // lower vol = better score
  const composite = 0.25 * valueZ + 0.25 * momZ + 0.25 * roeZ + 0.25 * volZ;

  console.log(`  价值因子 Z: ${valueZ.toFixed(3)} (PE=${pe}, PB=${pb})`);
  console.log(`  动量因子 Z: ${momZ.toFixed(3)} (60日动量=${(mom60*100).toFixed(1)}%)`);
  console.log(`  质量因子 Z: ${roeZ.toFixed(3)} (ROE=${roe}%)`);
  console.log(`  低波动因子 Z: ${volZ.toFixed(3)} (HV60=${(hv60Val*100).toFixed(1)}%)`);
  console.log(`  ────────────────────`);
  console.log(`  综合得分: ${composite.toFixed(3)}`);
  const signal = composite > 1.0 ? '强烈看多' : composite > 0.3 ? '偏多' : composite > -0.3 ? '中性' : composite > -1.0 ? '偏空' : '强烈看空';
  const confidence = Math.min(10, Math.max(1, Math.round(5 + composite * 3)));
  console.log(`  信号: ${signal}  置信度: ${confidence}/10\n`);

  // === Summary for StructuredOutput ===
  const topMonths = monthResults.slice(0,3).map(r=>`${r.month}(+${r.avgRet.toFixed(2)}%)`);
  const bottomMonths = monthResults.slice(-3).map(r=>`${r.month}(${r.avgRet.toFixed(2)}%)`);

  console.log('═══════════════════════════════');
  console.log('  结构化输出准备');
  console.log('═══════════════════════════════');
  console.log(JSON.stringify({
    currentPrice: stockCloses[stockCloses.length-1],
    valuation: { pe, pb, roe },
    momentum: { mom20d: mom20, mom60d: mom60, mom120d: mom120 },
    hv20: curHV20, hv60: hv60Val, hvPercentile: hvPct, hvRegime: regime,
    beta, pearsonCorr: corr,
    adfPriceStat: adfPrice.t_stat, adfPriceVerdict: adfPrice.verdict,
    adfRetsStat: adfRets.t_stat, adfRetsVerdict: adfRets.verdict,
    skewness: sk, excessKurtosis: kt,
    annualReturn: annRet, annualVol: annVol, sharpe, maxDrawdown: maxDD,
    valueZ, momZ, roeZ, volZ, composite, signal, confidence,
    topMonths, bottomMonths
  }, null, 2));
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });

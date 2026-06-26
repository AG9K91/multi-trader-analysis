#!/usr/bin/env python3
"""
000700.SZ 资金面与情绪面综合分析脚本
数据来源：东方财富/腾讯财经公开API
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
import json
import requests
from datetime import datetime, timedelta

SYMBOL = "000700"
MARKET = "SZ"
SECID = f"0.{SYMBOL}"  # 0=深交所

# 初始化默认变量以防API调用失败
chg_5, chg_10, chg_20 = 0.0, 0.0, 0.0
vol_ratio_5, vol_ratio_20 = 1.0, 1.0
chg_pct, turnover_rate, amount, price = 0.0, 0.0, 0.0, 0.0
total_main_5, total_main_10, total_main_20 = 0.0, 0.0, 0.0
inflow_days_10, inflow_days_20 = 0, 0
auto_sector_info = None
fund_flow_days = []
kline_data = None

def safe_get(url, params=None, timeout=10):
    try:
        resp = requests.get(url, params=params, timeout=timeout,
                          proxies={"http": None, "https": None},
                          headers={"User-Agent": "Mozilla/5.0"})
        return resp.json()
    except Exception as e:
        print(f"  [ERROR] {url}: {e}")
        return None

print("=" * 60)
print(f"【{SYMBOL}.{MARKET} 资金面与情绪面综合分析】")
print(f"数据来源：东方财富公开API · 长桥证券")
print(f"更新时间：{datetime.now().strftime('%Y-%m-%d %H:%M')}")
print("=" * 60)

# ============================================================
# 1. 个股资金流向 (主力/大单/中单/小单)
# ============================================================
print("\n" + "=" * 60)
print("【一、个股资金流向】")
print("=" * 60)

# 资金流向日线
ff_url = "https://push2his.eastmoney.com/api/qt/stock/fflow/daykline/get"
ff_params = {
    "secid": SECID,
    "fields1": "f1,f2,f3,f4",
    "fields2": "f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62",
    "lmt": 30,
    "klt": "101",
}
ff_data = safe_get(ff_url, ff_params)
fund_flow_days = []
if ff_data and ff_data.get("data") and ff_data["data"].get("klines"):
    for line in ff_data["data"]["klines"]:
        parts = line.split(",")
        fund_flow_days.append({
            "date": parts[0],
            "main_net": float(parts[1]) / 1e4,      # 主力净流入 (万)
            "main_pct": float(parts[2]) / 100,         # 主力净流入占比 (%)
            "super_large_net": float(parts[3]) / 1e4, # 超大单净流入
            "super_large_pct": float(parts[4]) / 100,
            "large_net": float(parts[5]) / 1e4,      # 大单净流入
            "large_pct": float(parts[6]) / 100,
            "medium_net": float(parts[7]) / 1e4,     # 中单净流入
            "medium_pct": float(parts[8]) / 100,
            "small_net": float(parts[9]) / 1e4,      # 小单净流入
            "small_pct": float(parts[10]) / 100,
        })

# 实时资金流向
ff_realtime_url = "https://push2.eastmoney.com/api/qt/stock/fflow/kline/get"
ff_rt_params = {
    "secid": SECID,
    "fields1": "f1,f2,f3,f4",
    "fields2": "f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62",
    "lmt": 5,
    "klt": "1",  # 1分钟
}
ff_rt = safe_get(ff_realtime_url, ff_rt_params)

# 分析资金流向趋势
if fund_flow_days:
    recent_5 = fund_flow_days[-5:]
    recent_10 = fund_flow_days[-10:]
    recent_20 = fund_flow_days[-20:]

    total_main_5 = sum(d["main_net"] for d in recent_5)
    total_main_10 = sum(d["main_net"] for d in recent_10)
    total_main_20 = sum(d["main_net"] for d in recent_20)

    # 主力净流入天数统计
    inflow_days_10 = sum(1 for d in recent_10 if d["main_net"] > 0)
    inflow_days_20 = sum(1 for d in recent_20 if d["main_net"] > 0)

    print(f"\n资金流向趋势 (主力/超大单/大单/中单/小单 单位:万元):")
    print(f"{'日期':<12} {'主力净额':>12} {'主力占比':>8} {'超大单':>12} {'大单':>12} {'中单':>12} {'小单':>12}")
    print("-" * 85)
    for d in recent_5:
        print(f"{d['date']:<12} {d['main_net']:>12.0f} {d['main_pct']:>7.2f}% {d['super_large_net']:>12.0f} {d['large_net']:>12.0f} {d['medium_net']:>12.0f} {d['small_net']:>12.0f}")

    print(f"\n资金流向汇总:")
    print(f"  近5日主力净流入合计: {total_main_5:,.0f} 万元")
    print(f"  近10日主力净流入合计: {total_main_10:,.0f} 万元")
    print(f"  近20日主力净流入合计: {total_main_20:,.0f} 万元")
    print(f"  近10日主力净流入天数: {inflow_days_10}/10")
    print(f"  近20日主力净流入天数: {inflow_days_20}/20")

    # 趋势判断
    if total_main_5 > 0 and total_main_10 > 0:
        flow_trend = "主力持续净流入，资金面偏多"
    elif total_main_5 < 0 and total_main_10 < 0:
        flow_trend = "主力持续净流出，资金面偏空"
    elif total_main_5 > 0 and total_main_10 < 0:
        flow_trend = "近5日主力开始流入，资金面可能出现反转"
    else:
        flow_trend = "近5日主力转流出，短期资金面转弱"
    print(f"\n  >>> 资金面趋势判断: {flow_trend}")

else:
    print("  [WARN] 未获取到资金流向数据")

# ============================================================
# 2. 北向资金 (沪深港通)
# ============================================================
print("\n" + "=" * 60)
print("【二、北向资金 — 沪深港通】")
print("=" * 60)

north_url = "https://push2his.eastmoney.com/api/qt/kamt.kline/get"
north_params = {
    "fields1": "f1,f2,f3,f4",
    "fields2": "f51,f52,f53,f54,f55,f56",
    "klt": "101",
    "lmt": 10,
}
# 北向资金整体 (沪股通+深股通)
north_data = safe_get(north_url, {**north_params, "secid": "1.000300"})
north_sz = safe_get(north_url, {**north_params, "secid": "1.399001"})

# 用另一个API获取北向资金
north_flow_url = "https://push2.eastmoney.com/api/qt/kamt.kline/get"
north_flow_params = {
    "fields1": "f1,f3",
    "fields2": "f51,f52",
    "klt": "101",
    "lmt": 10,
}

# 北向资金实时
north_rt_url = "https://push2.eastmoney.com/api/qt/kamt.rt/get"
north_rt = safe_get(north_rt_url, {"fields1": "f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13,f14,f15,f16"})

if north_rt and north_rt.get("data"):
    d = north_rt["data"]
    hgt_buy = d.get("s2n", {}).get("buyAMT", 0) / 1e8 if isinstance(d.get("s2n"), dict) else 0
    hgt_sell = d.get("s2n", {}).get("sellAMT", 0) / 1e8 if isinstance(d.get("s2n"), dict) else 0
    sgt_buy = d.get("n2s", {}).get("buyAMT", 0) / 1e8 if isinstance(d.get("n2s"), dict) else 0
    sgt_sell = d.get("n2s", {}).get("sellAMT", 0) / 1e8 if isinstance(d.get("n2s"), dict) else 0

    # Try different keys
    for key in d:
        val = d[key]
        if isinstance(val, dict):
            print(f"  key={key}: buyAMT={val.get('buyAMT',0)/1e8:.1f}亿 sellAMT={val.get('sellAMT',0)/1e8:.1f}亿")

# 北向历史
north_all_url = "https://push2his.eastmoney.com/api/qt/kamt.kline/get"
# 北向资金汇总: 1.000300 (沪深300)
north_his_params = {
    "fields1": "f1,f3",
    "fields2": "f51,f52,f53",
    "klt": "101",
    "lmt": 10,
}
# 尝试北向资金日线 - 使用不同secid
for nid, nname in [("1.000001","沪股通"), ("1.399001","深股通")]:
    nd = safe_get(north_all_url, {**north_his_params, "secid": nid})
    if nd and nd.get("data") and nd["data"].get("klines"):
        klines = nd["data"]["klines"]
        print(f"\n{nname} 近5日资金流向:")
        for line in klines[-5:]:
            parts = line.split(",")
            net = float(parts[2]) / 1e8 if len(parts) > 2 else 0
            print(f"  {parts[0]}: 净流入 {net:+.2f} 亿元")

# 北向资金板块配置
print("\n北向资金行业配置 (最近交易日):")
# 东方财富行业资金流
industry_flow_url = "https://push2.eastmoney.com/api/qt/sct/get"
ind_params = {
    "fields1": "f1,f2,f3,f4",
    "fields2": "f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63,f64",
    "sect": "1",
    "lmt": 30,
}
ind_flow = safe_get(industry_flow_url, ind_params)
if ind_flow and ind_flow.get("data") and ind_flow["data"].get("list"):
    print(f"  {'行业':<12} {'涨跌幅':>8} {'主力净流入(亿)':>14}")
    print("  " + "-" * 40)
    for item in ind_flow["data"]["list"][:10]:
        name = item.get("f14", "N/A")
        chg = item.get("f3", 0)
        main_in = item.get("f62", 0) / 1e8 if item.get("f62") else 0
        print(f"  {name:<12} {chg:>7.2f}% {main_in:>14.2f}")

# ============================================================
# 3. 市场情绪温度
# ============================================================
print("\n" + "=" * 60)
print("【三、市场情绪温度计】")
print("=" * 60)

# 涨跌家数统计
market_url = "https://push2.eastmoney.com/api/qt/ulist.np/get"
market_params = {
    "fields": "f2,f3,f4,f12,f13,f14",
    "fltt": "2",
    "secids": "1.000001,0.399001,1.000300,0.399006",
    "invt": "2",
}
market_data = safe_get(market_url, market_params)
if market_data and market_data.get("data") and market_data["data"].get("diff"):
    print("\n主要指数表现:")
    for item in market_data["data"]["diff"]:
        print(f"  {item.get('f14','N/A')}: {item.get('f2',0):.2f} 涨跌幅: {item.get('f3',0):.2f}%")

# 市场宽度
# 获取全A股涨跌统计
mk_width_url = "https://push2.eastmoney.com/api/qt/ulist.np/get"
mk_width_params = {
    "fields": "f2,f3,f12,f13,f14",
    "fltt": "2",
    "secids": "1.000001,0.399001",
    "invt": "2",
}

# 涨停跌停数量
limit_url = "https://push2.eastmoney.com/api/qt/clong/get"
limit_params = {
    "fields": "f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12",
    "fltt": "2",
}
limit_data = safe_get(limit_url, limit_params)
if limit_data and limit_data.get("data"):
    print(f"\n全市场情绪指标:")
    zd_count = limit_data["data"].get("zd", "N/A")
    dt_count = limit_data["data"].get("dt", "N/A")
    print(f"  涨停家数: {zd_count}")
    print(f"  跌停家数: {dt_count}")

# 成交量能
vol_url = "https://push2.eastmoney.com/api/qt/ulist.np/get"
vol_params = {
    "fields": "f2,f3,f4,f5,f6,f7,f15,f16,f17,f18",
    "fltt": "2",
    "secids": "1.000001,0.399001",
    "invt": "2",
}
vol_data = safe_get(vol_url, vol_params)
if vol_data and vol_data.get("data") and vol_data["data"].get("diff"):
    for item in vol_data["data"]["diff"]:
        turnover = item.get("f15", 0)
        vol_amt = item.get("f6", 0) / 1e8
        print(f"  {item.get('f14','N/A')}: 成交额 {vol_amt:.0f}亿")

# 恐惧贪婪指数近似 (基于涨跌比)
# 计算市场情绪温度 0-100
advance_url = "https://push2.eastmoney.com/api/qt/ulist.np/get"
# 尝试获取涨跌家数
adv_params = {
    "fields": "f2,f3,f12,f13,f14,f104,f105",
    "fltt": "2",
    "secids": "1.000001,0.399001",
    "invt": "2",
}
adv_data = safe_get(advance_url, adv_params)

# 模拟情绪温度 (0-100)
# 基于涨跌家数比、成交量、涨停数等综合判断
# 此处使用可用数据近似

# 指数估值情绪
print("\n市场情绪评估:")
print("  综合参考: 涨跌家数比、成交额、涨停家数、北向资金流向")

# ============================================================
# 4. 板块轮动 — 汽车行业 vs 其他行业
# ============================================================
print("\n" + "=" * 60)
print("【四、板块轮动 — 行业强弱对比】")
print("=" * 60)

# 000700.SZ 属于 汽车零部件/汽车行业 (申万汽车 801170.SH)
# 获取行业板块排名
sector_url = "https://push2.eastmoney.com/api/qt/sct/get"
sector_params = {
    "fields1": "f1,f2,f3,f4",
    "fields2": "f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63,f64,f65,f66",
    "sect": "1",  # 行业板块
    "sort": "f3",  # 按涨跌幅排序
    "sorttype": "1",  # 降序
    "lmt": 30,
}
sector_data = safe_get(sector_url, sector_params)
auto_sector_info = None
sector_list = []

if sector_data and sector_data.get("data") and sector_data["data"].get("list"):
    print(f"\n申万行业板块涨跌排名 (Top 10 & Bottom 5):")
    print(f"  {'排名':<6} {'板块':<12} {'涨跌幅':>8} {'主力净流入(亿)':>14} {'换手率':>8}")
    print("  " + "-" * 55)
    for i, item in enumerate(sector_data["data"]["list"]):
        name = item.get("f14", "N/A")
        chg = item.get("f3", 0)
        main_in = item.get("f62", 0) / 1e8 if item.get("f62") else 0
        turnover = item.get("f8", 0)
        sector_list.append({"name": name, "chg": chg, "main_in": main_in})

        # 查找汽车板块
        if "汽车" in name:
            auto_sector_info = {"name": name, "chg": chg, "main_in": main_in, "rank": i+1}

        if i < 10 or i >= len(sector_data["data"]["list"]) - 5:
            print(f"  {i+1:<6} {name:<12} {chg:>7.2f}% {main_in:>14.2f} {turnover:>7.2f}%")

if auto_sector_info:
    total = len(sector_list)
    rank = auto_sector_info["rank"]
    print(f"\n>>> 汽车行业板块位置: 排名 {rank}/{total}")
    if rank <= total * 0.3:
        print(f"    汽车行业处于强势领涨板块")
    elif rank <= total * 0.5:
        print(f"    汽车行业处于中位偏强区域")
    elif rank <= total * 0.7:
        print(f"    汽车行业处于中位偏弱区域")
    else:
        print(f"    汽车行业处于弱势落后板块")
    print(f"    板块涨跌幅: {auto_sector_info['chg']:+.2f}%")
    print(f"    板块主力净流入: {auto_sector_info['main_in']:+.2f} 亿元")

# ============================================================
# 5. 异动信号监测
# ============================================================
print("\n" + "=" * 60)
print("【五、异动信号】")
print("=" * 60)

# 个股实时行情
quote_url = "https://push2.eastmoney.com/api/qt/stock/get"
quote_params = {
    "secid": SECID,
    "fields": "f43,f44,f45,f46,f47,f48,f49,f50,f51,f52,f55,f57,f58,f60,f116,f117,f162,f167,f168,f169,f170,f171",
}
quote = safe_get(quote_url, quote_params)
if quote and quote.get("data"):
    q = quote["data"]
    price = q.get("f43", 0) / 100 if q.get("f43") else 0
    high = q.get("f44", 0) / 100 if q.get("f44") else 0
    low = q.get("f45", 0) / 100 if q.get("f45") else 0
    open_p = q.get("f46", 0) / 100 if q.get("f46") else 0
    pre_close = q.get("f60", 0) / 100 if q.get("f60") else 0
    volume = q.get("f47", 0)
    amount = q.get("f48", 0) / 1e8
    chg_pct = q.get("f170", 0) / 100 if q.get("f170") else 0
    turnover_rate = q.get("f168", 0) / 100 if q.get("f168") else 0
    amplitude = q.get("f50", 0) / 100 if q.get("f50") else 0
    pe = q.get("f162", 0) / 100 if q.get("f162") else 0

    print(f"\n实时行情:")
    print(f"  现价: {price:.2f}  涨跌幅: {chg_pct:+.2f}%")
    print(f"  开盘: {open_p:.2f}  最高: {high:.2f}  最低: {low:.2f}  昨收: {pre_close:.2f}")
    print(f"  成交额: {amount:.2f} 亿元  换手率: {turnover_rate:.2f}%  振幅: {amplitude:.2f}%")
    print(f"  市盈率(动态): {pe:.2f}")

    # 异动判断
    anomalies = []
    if abs(chg_pct) >= 7:
        anomalies.append(f"涨跌幅异常 ({chg_pct:+.2f}%)，接近涨跌停附近")
    if turnover_rate > 10:
        anomalies.append(f"换手率异常 ({turnover_rate:.2f}%)，交投极度活跃")
    elif turnover_rate > 5:
        anomalies.append(f"换手率偏高 ({turnover_rate:.2f}%)，短线资金博弈激烈")
    if amplitude > 7:
        anomalies.append(f"振幅异常 ({amplitude:.2f}%)，日内波动剧烈")
    if amount > 5:
        anomalies.append(f"成交额放大 ({amount:.2f}亿)，资金关注度高")

    if anomalies:
        print(f"\n异动信号:")
        for a in anomalies:
            print(f"  ⚠ {a}")
    else:
        print(f"\n异动信号: 暂无明显异动")

    # 量价关系
    if chg_pct > 2 and amount > 5:
        print(f"  量价配合: 放量上涨，多头占优")
    elif chg_pct < -2 and amount > 5:
        print(f"  量价配合: 放量下跌，空头占优")
    elif chg_pct > 0 and amount < 1:
        print(f"  量价配合: 缩量上涨，上行动能不足")
    elif chg_pct < 0 and amount < 1:
        print(f"  量价配合: 缩量下跌，抛压不重")

# 获取近期K线做量价异动分析
kline_url = "https://push2his.eastmoney.com/api/qt/stock/kline/get"
kline_params = {
    "secid": SECID,
    "fields1": "f1,f2,f3,f4,f5,f6",
    "fields2": "f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61",
    "klt": "101",
    "fqt": "1",
    "lmt": 30,
}
kline_data = safe_get(kline_url, kline_params)
if kline_data and kline_data.get("data") and kline_data["data"].get("klines"):
    klines = []
    for line in kline_data["data"]["klines"]:
        parts = line.split(",")
        klines.append({
            "date": parts[0],
            "open": float(parts[1]),
            "close": float(parts[2]),
            "high": float(parts[3]),
            "low": float(parts[4]),
            "volume": float(parts[5]),
            "amount": float(parts[6]),
        })

    # 均量对比
    vol_5 = sum(k["volume"] for k in klines[-6:-1]) / 5
    vol_20 = sum(k["volume"] for k in klines[-21:-1]) / 20
    vol_today = klines[-1]["volume"]
    vol_ratio_5 = vol_today / vol_5 if vol_5 > 0 else 1
    vol_ratio_20 = vol_today / vol_20 if vol_20 > 0 else 1

    print(f"\n量能分析 (最近30日):")
    print(f"  今日量/5日均量: {vol_ratio_5:.2f}x")
    print(f"  今日量/20日均量: {vol_ratio_20:.2f}x")

    if vol_ratio_20 > 2:
        print(f"  >>> 巨量异动！成交量是20日均量的{vol_ratio_20:.1f}倍")
    elif vol_ratio_20 > 1.5:
        print(f"  >>> 显著放量，关注方向选择")
    elif vol_ratio_20 < 0.5:
        print(f"  >>> 极度缩量，市场关注度低")

    # 涨跌幅统计
    chg_5 = (klines[-1]["close"] / klines[-6]["close"] - 1) * 100
    chg_10 = (klines[-1]["close"] / klines[-11]["close"] - 1) * 100
    chg_20 = (klines[-1]["close"] / klines[-21]["close"] - 1) * 100
    print(f"\n区间涨跌幅:")
    print(f"  近5日: {chg_5:+.2f}%")
    print(f"  近10日: {chg_10:+.2f}%")
    print(f"  近20日: {chg_20:+.2f}%")

# ============================================================
# 6. 热度排行
# ============================================================
print("\n" + "=" * 60)
print("【六、市场热度排行】")
print("=" * 60)

# 人气榜
hot_url = "https://push2.eastmoney.com/api/qt/clong/get"
hot_params = {
    "fields": "f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13,f14",
    "fltt": "2",
    "np": "1",
    "type": "1",
}
hot_data = safe_get(hot_url, hot_params)
if hot_data and hot_data.get("data"):
    print(f"\n市场人气指标:")
    for k, v in hot_data["data"].items():
        if v is not None:
            print(f"  {k}: {v}")

# 涨幅榜 - 获取强势个股对比
top_url = "https://push2.eastmoney.com/api/qt/ulist.np/get"
top_params = {
    "fields": "f2,f3,f12,f13,f14,f100",
    "fltt": "2",
    "fid": "f3",
    "po": "1",
    "pz": "10",
    "secids": "1.000001,0.399001",
    "invt": "2",
}

# 获取A股涨幅榜
gainers_url = "https://push2.eastmoney.com/api/qt/ulist.np/get"
gainers_params = {
    "fields": "f2,f3,f12,f13,f14",
    "fltt": "2",
    "fid": "f3",
    "po": "1",
    "pz": "10",
    "fs": "m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23",
}
gainers = safe_get(gainers_url, gainers_params)
if gainers and gainers.get("data") and gainers["data"].get("diff"):
    print(f"\n全A股涨幅榜 Top 10:")
    for i, item in enumerate(gainers["data"]["diff"], 1):
        code = item.get("f12", "N/A")
        name = item.get("f14", "N/A")
        chg = item.get("f3", 0)
        price = item.get("f2", 0)
        print(f"  {i}. {code} {name}: {price:.2f} ({chg:+.2f}%)")

# 跌幅榜
losers_url = "https://push2.eastmoney.com/api/qt/ulist.np/get"
losers_params = {
    "fields": "f2,f3,f12,f13,f14",
    "fltt": "2",
    "fid": "f3",
    "po": "0",
    "pz": "5",
    "fs": "m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23",
}
losers = safe_get(losers_url, losers_params)
if losers and losers.get("data") and losers["data"].get("diff"):
    print(f"\n全A股跌幅榜 Top 5:")
    for i, item in enumerate(losers["data"]["diff"], 1):
        code = item.get("f12", "N/A")
        name = item.get("f14", "N/A")
        chg = item.get("f3", 0)
        price = item.get("f2", 0)
        print(f"  {i}. {code} {name}: {price:.2f} ({chg:+.2f}%)")

# ============================================================
# 7. ETF资金流 (汽车相关行业ETF)
# ============================================================
print("\n" + "=" * 60)
print("【七、相关行业ETF资金流】")
print("=" * 60)

# 汽车/新能源车ETF
etf_list = [
    ("516110", "SH", "汽车ETF"),
    ("159868", "SZ", "新能源车ETF"),
    ("515030", "SH", "新能源车ETF"),
    ("516390", "SH", "新能源汽车ETF"),
    ("159824", "SZ", "新能车ETF"),
]

print("\n汽车/新能源车相关ETF表现:")
for etf_code, etf_mkt, etf_name in etf_list:
    etf_secid = f"{'1' if etf_mkt == 'SH' else '0'}.{etf_code}"
    etf_quote = safe_get(quote_url, {"secid": etf_secid, "fields": "f43,f44,f45,f46,f47,f48,f50,f57,f58,f60,f169,f170"})
    if etf_quote and etf_quote.get("data"):
        eq = etf_quote["data"]
        etf_price = eq.get("f43", 0) / 100 if eq.get("f43") else 0
        etf_chg = eq.get("f170", 0) / 100 if eq.get("f170") else 0
        etf_amt = eq.get("f48", 0) / 1e8 if eq.get("f48") else 0
        etf_vol = eq.get("f47", 0)
        print(f"  {etf_name} ({etf_code}.{etf_mkt}): {etf_price:.3f} ({etf_chg:+.2f}%) 成交: {etf_amt:.2f}亿")

# 行业ETF资金流 (通过行业板块资金流近似)
print("\n行业ETF资金流向判断:")
print("  汽车行业属于制造业板块，相关ETF资金流向参考行业板块主力资金数据")

# ============================================================
# 8. 综合情绪评估
# ============================================================
print("\n" + "=" * 60)
print("【八、综合资金情绪评估】")
print("=" * 60)

# 汇总所有信号
signals_bull = []
signals_bear = []
signals_neutral = []

# 资金流向信号
if fund_flow_days:
    if total_main_5 > 500:
        signals_bull.append(f"近5日主力净流入 {total_main_5:,.0f}万，资金积极做多")
    elif total_main_5 < -500:
        signals_bear.append(f"近5日主力净流出 {abs(total_main_5):,.0f}万，资金持续出逃")
    else:
        signals_neutral.append("近5日主力资金小幅波动，方向不明确")

    if inflow_days_10 >= 7:
        signals_bull.append(f"近10日主力净流入天数 {inflow_days_10}/10，资金持续流入")
    elif inflow_days_10 <= 3:
        signals_bear.append(f"近10日主力净流入天数仅 {inflow_days_10}/10，资金持续流出")

# 板块信号
if auto_sector_info:
    if auto_sector_info["rank"] <= 8:
        signals_bull.append(f"汽车行业排名 {auto_sector_info['rank']}，处于强势板块")
    elif auto_sector_info["rank"] >= 20:
        signals_bear.append(f"汽车行业排名 {auto_sector_info['rank']}，处于弱势板块")
    else:
        signals_neutral.append(f"汽车行业排名 {auto_sector_info['rank']}，处于中位区域")

# 量价信号 - 从已有数据推断
# chg_5/chg_10/chg_20 可能未定义，设默认值
try:
    _ = chg_5
except NameError:
    chg_5, chg_10, chg_20 = 0, 0, 0
    vol_ratio_5, vol_ratio_20 = 1.0, 1.0

if 'vol_ratio_20' in dir() and 'chg_5' in dir():
    if vol_ratio_20 > 1.5 and chg_5 > 3:
        signals_bull.append("放量上涨，量价配合良好")
    elif vol_ratio_20 > 1.5 and chg_5 < -3:
        signals_bear.append("放量下跌，量价背离")
    elif vol_ratio_20 < 0.5:
        signals_neutral.append("缩量明显，市场关注度低")

# 从实时行情推断日内情绪
if chg_pct > 2:
    signals_bull.append(f"今日涨幅 {chg_pct:.2f}%，日内强势，逆市上涨")
elif chg_pct < -2:
    signals_bear.append(f"今日跌幅 {chg_pct:.2f}%，日内弱势")

if chg_5 > 5:
    signals_bull.append(f"近5日涨幅 {chg_5:.2f}%，短期强势")
elif chg_5 < -5:
    signals_bear.append(f"近5日跌幅 {abs(chg_5):.2f}%，短期弱势")

print("\n多头信号:")
for s in signals_bull:
    print(f"  ▲ {s}")
if not signals_bull:
    print("  (暂无明确多头信号)")

print("\n空头信号:")
for s in signals_bear:
    print(f"  ▼ {s}")
if not signals_bear:
    print("  (暂无明确空头信号)")

print("\n中性信号:")
for s in signals_neutral:
    print(f"  ■ {s}")

# 综合评级
bull_score = len(signals_bull) * 2
bear_score = len(signals_bear) * 2
net_score = bull_score - bear_score

if net_score >= 4:
    rating = "bullish"
    rating_cn = "偏多"
elif net_score <= -4:
    rating = "bearish"
    rating_cn = "偏空"
else:
    rating = "neutral"
    rating_cn = "中性"

# 信心度
confidence = min(10, 5 + abs(net_score))

print(f"\n" + "=" * 60)
print(f"综合评级: {rating_cn} (confidence: {confidence}/10)")
print(f"多头得分: {bull_score}  空头得分: {bear_score}  净得分: {net_score:+d}")
print("=" * 60)

# ============================================================
# 结构化输出数据
# ============================================================
flow_summary = {}
if fund_flow_days:
    flow_summary = {
        "recent_5d_main_net": round(total_main_5, 2),
        "recent_10d_main_net": round(total_main_10, 2),
        "recent_20d_main_net": round(total_main_20, 2),
        "inflow_days_10": inflow_days_10,
        "inflow_days_20": inflow_days_20,
        "flow_trend": flow_trend,
        "latest_day": fund_flow_days[-1],
    }

auto_summary = {}
if auto_sector_info:
    auto_summary = auto_sector_info

kline_summary = {}
if kline_data:
    kline_summary = {
        "chg_5d": round(chg_5, 2),
        "chg_10d": round(chg_10, 2),
        "chg_20d": round(chg_20, 2),
        "vol_ratio_5": round(vol_ratio_5, 2),
        "vol_ratio_20": round(vol_ratio_20, 2),
    }

result = {
    "symbol": f"{SYMBOL}.{MARKET}",
    "name": "模塑科技",
    "rating": rating,
    "confidence": confidence,
    "fund_flow": flow_summary,
    "sector_rotation": auto_summary,
    "kline_stats": kline_summary,
    "signals_bull": signals_bull,
    "signals_bear": signals_bear,
    "signals_neutral": signals_neutral,
    "net_score": net_score,
}

print("\n[JSON_OUTPUT]")
print(json.dumps(result, indent=2, ensure_ascii=False, default=str))

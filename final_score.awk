BEGIN {
  printf "\n"
  printf "======================================================================\n"
  printf "  000700.SZ 模塑科技 多因子量化综合打分\n"
  printf "======================================================================\n\n"

  # === FACTOR 1: VALUE ===
  pe_current = 28.4
  pe_hist_mean = 43.8
  pe_5yr_pct = 39.8
  pe_alltime_pct = 6.8
  pb = 3.27
  roe = 11.58

  # Value Z-score (simplified)
  # PE discount to historical mean: (43.8-28.4)/43.8 = 35.2% discount
  val_discount = (pe_hist_mean - pe_current) / pe_hist_mean
  # All-time percentile: lower is better
  # Convert to Z: assuming mean=50, std=20 for percentiles
  z_value_alltime = (50 - pe_alltime_pct) / 20  # 6.8% -> very undervalued
  z_value_5yr = (50 - pe_5yr_pct) / 20  # 39.8% -> slightly undervalued

  printf "=== 1. 价值因子 (Value) ===\n"
  printf "当前PE: %.1f  vs  历史均值PE: %.1f\n", pe_current, pe_hist_mean
  printf "PE历史分位(全历史): %.1f%%  -> 深度低估区域\n", pe_alltime_pct
  printf "PE历史分位(5年): %.1f%%  -> 略低于中位\n", pe_5yr_pct
  printf "PB: %.2f, ROE: %.2f%%\n", pb, roe
  printf "价值因子信号: ★★★★☆ (偏多，全历史分位极低)\n\n"

  # === FACTOR 2: MOMENTUM ===
  printf "=== 2. 动量因子 (Momentum) ===\n"
  printf "1月动量: -2.0%% (偏弱)\n"
  printf "3月动量: +24.3%% (强势)\n"
  printf "6月动量: +2.5%% (中性)\n"
  printf "12月动量: +97.9%% (极度强势)\n"
  printf "近期50日年化收益: 112%% (异常高，主要因5-6月拉升)\n"
  printf "动量因子信号: ★★★★☆ (偏多，中长期动量强劲，但短期回调)\n\n"

  # === FACTOR 3: QUALITY ===
  printf "=== 3. 质量因子 (Quality) ===\n"
  printf "ROE: %.2f%% (中等水平)\n", roe
  printf "EPS趋势: 2024=0.56 -> 2025=0.47 -> 2026Q1=0.54 (波动)\n"
  printf "2022年曾出现亏损(-18.83)\n"
  printf "股息率: ~2.35%% (10派3.268)\n"
  printf "质量因子信号: ★★★☆☆ (中性偏弱，盈利稳定性一般)\n\n"

  # === FACTOR 4: LOW-VOL ===
  printf "=== 4. 波动率因子 (Low-Vol) ===\n"
  printf "HV20: 80.79%% (极高)\n"
  printf "HV50: 73.33%% (极高)\n"
  printf "HV20分位: 50%% (中位)\n"
  printf "近期HV20区间: 66.56%% - 88.56%%\n"
  printf "波动率因子信号: ★☆☆☆☆ (不适合低波策略)\n\n"

  # === COMPOSITE ===
  printf "=== 5. 多因子综合打分 ===\n"
  printf "价值: +3  (全历史极度低估)\n"
  printf "动量: +3  (中长期强动量，短期回调)\n"
  printf "质量: +0  (中等ROE，盈利有波动)\n"
  printf "低波: -2  (极高波动率，不适合防御)\n"
  printf "--------------------\n"
  total = 3 + 3 + 0 + (-2)
  printf "综合得分: %+d / 满分 8\n", total
  printf "综合评级: 中性偏多\n\n"

  # Additional metrics
  printf "=== 6. 附加统计特征 ===\n"
  printf "偏度: +0.654 (正偏，上涨日幅度大于下跌日)\n"
  printf "超额峰度: -3.15 (薄尾分布，极端事件风险相对低)\n"
  printf "Beta (2年): 0.99 (与大盘同步)\n"
  printf "R-squared: 19.95%% (仅20%%由大盘解释，高个股风险)\n"
  printf "跟踪误差(年化): 30-50%% (极高偏离度)\n"
  printf "行业(汽车零部件)2025: +44.44%%\n"
  printf "行业(汽车零部件)2026YTD: -5.74%% (行业走弱)\n\n"

  printf "=== 7. 季节性特征 ===\n"
  printf "最佳月份: 12月(+20.1%%), 9月(+17.0%%), 3月(+13.6%%)\n"
  printf "最差月份: 5月(-7.4%%), 6月(-6.2%%), 1月(-5.4%%)\n"
  printf "日历效应: Q4年末效应 + Q1春季效应 明显\n"
  printf "当前月份(6月): 历史上偏弱\n\n"
}

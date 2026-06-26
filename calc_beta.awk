BEGIN {
  # 000700 monthly returns for 2024
  ret700[1] = -9.31; ret700[2] = 15.40; ret700[3] = 17.79; ret700[4] = -6.71
  ret700[5] = -12.89; ret700[6] = -9.64; ret700[7] = 11.81; ret700[8] = -2.39
  ret700[9] = 18.67; ret700[10] = 3.68; ret700[11] = 5.67; ret700[12] = -5.77

  # 沪深300 monthly returns for 2024
  ret300[1] = -6.29; ret300[2] = 9.35; ret300[3] = 0.61; ret300[4] = 1.89
  ret300[5] = -0.68; ret300[6] = -3.30; ret300[7] = -0.57; ret300[8] = -3.51
  ret300[9] = 20.97; ret300[10] = -3.16; ret300[11] = 0.66; ret300[12] = 0.47

  # 000700 monthly returns for 2025
  ret700_25[1] = -1.57; ret700_25[2] = 8.54; ret700_25[3] = 9.33; ret700_25[4] = -2.44
  ret700_25[5] = -1.88; ret700_25[6] = -2.80; ret700_25[7] = 4.85; ret700_25[8] = 6.25
  ret700_25[9] = 15.29; ret700_25[10] = 1.02; ret700_25[11] = -0.51; ret700_25[12] = 45.99

  # 沪深300 monthly returns for 2025
  ret300_25[1] = -2.99; ret300_25[2] = 1.91; ret300_25[3] = -0.07; ret300_25[4] = -3.00
  ret300_25[5] = 1.85; ret300_25[6] = 2.50; ret300_25[7] = 3.54; ret300_25[8] = 10.33
  ret300_25[9] = 3.20; ret300_25[10] = 0.00; ret300_25[11] = -2.46; ret300_25[12] = 2.28

  n24 = 12
  n25 = 12
  n_all = 24

  # 2024 Beta
  sum_x = 0; sum_y = 0; sum_xy = 0; sum_x2 = 0; sum_y2 = 0
  for(i=1; i<=n24; i++) {
    sum_x += ret300[i]
    sum_y += ret700[i]
    sum_xy += ret300[i] * ret700[i]
    sum_x2 += ret300[i] * ret300[i]
    sum_y2 += ret700[i] * ret700[i]
  }

  beta_24 = (n24 * sum_xy - sum_x * sum_y) / (n24 * sum_x2 - sum_x * sum_x)
  # correlation
  r_24 = (n24 * sum_xy - sum_x * sum_y) / sqrt((n24 * sum_x2 - sum_x * sum_x) * (n24 * sum_y2 - sum_y * sum_y))

  printf "=== 2024年 Beta/CAPM 分析 ===\n"
  printf "Beta (vs 沪深300): %.4f\n", beta_24
  printf "Pearson相关系数: %.4f\n", r_24
  printf "R-squared: %.4f\n", r_24 * r_24
  printf "解释: 该股票约%.0f%%的月度收益变动可由大盘解释\n\n", r_24 * r_24 * 100

  # 2025 Beta
  sum_x = 0; sum_y = 0; sum_xy = 0; sum_x2 = 0; sum_y2 = 0
  for(i=1; i<=n25; i++) {
    sum_x += ret300_25[i]
    sum_y += ret700_25[i]
    sum_xy += ret300_25[i] * ret700_25[i]
    sum_x2 += ret300_25[i] * ret300_25[i]
    sum_y2 += ret700_25[i] * ret700_25[i]
  }

  beta_25 = (n25 * sum_xy - sum_x * sum_y) / (n25 * sum_x2 - sum_x * sum_x)
  r_25 = (n25 * sum_xy - sum_x * sum_y) / sqrt((n25 * sum_x2 - sum_x * sum_x) * (n25 * sum_y2 - sum_y * sum_y))

  printf "=== 2025年 Beta/CAPM 分析 ===\n"
  printf "Beta (vs 沪深300): %.4f\n", beta_25
  printf "Pearson相关系数: %.4f\n", r_25
  printf "R-squared: %.4f\n\n", r_25 * r_25

  # 2024-2025 combined
  # Combining both arrays
  sum_x = 0; sum_y = 0; sum_xy = 0; sum_x2 = 0; sum_y2 = 0
  for(i=1; i<=n24; i++) {
    sum_x += ret300[i]
    sum_y += ret700[i]
    sum_xy += ret300[i] * ret700[i]
    sum_x2 += ret300[i] * ret300[i]
    sum_y2 += ret700[i] * ret700[i]
  }
  for(i=1; i<=n25; i++) {
    sum_x += ret300_25[i]
    sum_y += ret700_25[i]
    sum_xy += ret300_25[i] * ret700_25[i]
    sum_x2 += ret300_25[i] * ret300_25[i]
    sum_y2 += ret700_25[i] * ret700_25[i]
  }

  beta_all = (n_all * sum_xy - sum_x * sum_y) / (n_all * sum_x2 - sum_x * sum_x)
  r_all = (n_all * sum_xy - sum_x * sum_y) / sqrt((n_all * sum_x2 - sum_x * sum_x) * (n_all * sum_y2 - sum_y * sum_y))

  printf "=== 2024-2025 综合 Beta ===\n"
  printf "Beta (vs 沪深300): %.4f\n", beta_all
  printf "Pearson相关系数: %.4f\n", r_all
  printf "R-squared: %.4f\n", r_all * r_all

  # Annualized metrics
  printf "\n=== 年化收益对比 ===\n"
  # 2024 total return for 000700
  total700_24 = close24_start = close24_end;
  # Calculate using monthly compound
  prod700_24 = 1.0
  prod300_24 = 1.0
  for(i=1; i<=n24; i++) {
    prod700_24 *= (1 + ret700[i]/100)
    prod300_24 *= (1 + ret300[i]/100)
  }
  ann700_24 = (prod700_24 - 1) * 100
  ann300_24 = (prod300_24 - 1) * 100

  prod700_25 = 1.0
  prod300_25 = 1.0
  for(i=1; i<=n25; i++) {
    prod700_25 *= (1 + ret700_25[i]/100)
    prod300_25 *= (1 + ret300_25[i]/100)
  }
  ann700_25 = (prod700_25 - 1) * 100
  ann300_25 = (prod300_25 - 1) * 100

  printf "2024年 000700收益率: %.2f%%  沪深300: %.2f%%  超额: %.2f%%\n", ann700_24, ann300_24, ann700_24 - ann300_24
  printf "2025年 000700收益率: %.2f%%  沪深300: %.2f%%  超额: %.2f%%\n", ann700_25, ann300_25, ann700_25 - ann300_25

  # Information Ratio (simplified)
  printf "\n=== 风险调整指标 ===\n"
  # Tracking error for 2024
  sum_te24 = 0
  for(i=1; i<=n24; i++) {
    diff = ret700[i] - ret300[i]
    sum_te24 += diff * diff
  }
  te24 = sqrt(sum_te24 / (n24 - 1)) * sqrt(12)  # annualized tracking error
  printf "2024年 跟踪误差(年化): %.2f%%\n", te24

  sum_te25 = 0
  for(i=1; i<=n25; i++) {
    diff = ret700_25[i] - ret300_25[i]
    sum_te25 += diff * diff
  }
  te25 = sqrt(sum_te25 / (n25 - 1)) * sqrt(12)
  printf "2025年 跟踪误差(年化): %.2f%%\n", te25
}

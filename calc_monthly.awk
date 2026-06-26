# 2024 monthly close prices (from Digrin)
# 2024-01: 5.26, 02: 6.07, 03: 7.15, 04: 6.67, 05: 5.81, 06: 5.25
# 2024-07: 5.87, 08: 5.73, 09: 6.80, 10: 7.05, 11: 7.45, 12: 7.02

# 2025 approximate monthly close prices (estimated from search data)
# 01: 6.91, 02: 7.50, 03: 8.20, 04: 8.00, 05: 7.85, 06: 7.63
# 07: 8.00, 08: 8.50, 09: 9.80, 10: 9.90, 11: 9.85, 12: 14.38

# 2026 monthly range data (approximate closes)
# 01: 13.55, 02: 13.95, 03: 11.68, 04: 12.04, 05: 14.18, 06 (to 25th): 13.89

BEGIN {
  # 2024 month names
  months[1]="1月"; months[2]="2月"; months[3]="3月"; months[4]="4月"
  months[5]="5月"; months[6]="6月"; months[7]="7月"; months[8]="8月"
  months[9]="9月"; months[10]="10月"; months[11]="11月"; months[12]="12月"

  # 2024 closes
  close24[1]=5.26; close24[2]=6.07; close24[3]=7.15; close24[4]=6.67
  close24[5]=5.81; close24[6]=5.25; close24[7]=5.87; close24[8]=5.73
  close24[9]=6.80; close24[10]=7.05; close24[11]=7.45; close24[12]=7.02

  # 2025 closes (approximate)
  close25[1]=6.91; close25[2]=7.50; close25[3]=8.20; close25[4]=8.00
  close25[5]=7.85; close25[6]=7.63; close25[7]=8.00; close25[8]=8.50
  close25[9]=9.80; close25[10]=9.90; close25[11]=9.85; close25[12]=14.38

  # Dec 2023 close (approximate)
  prev24 = 5.80

  printf "=== 2024年月度收益率 ===\n"
  for(i=1; i<=12; i++) {
    if(i==1) prev = prev24
    else prev = close24[i-1]
    ret24[i] = (close24[i] - prev) / prev * 100
    printf "%s: %.2f%%\n", months[i], ret24[i]
  }

  printf "\n=== 2025年月度收益率 ===\n"
  for(i=1; i<=12; i++) {
    if(i==1) prev = close24[12]
    else prev = close25[i-1]
    ret25[i] = (close25[i] - prev) / prev * 100
    printf "%s: %.2f%%\n", months[i], ret25[i]
  }

  # Month-of-year average
  printf "\n=== 月份效应 (2024-2025两年均值) ===\n"
  for(m=1; m<=12; m++) {
    avg = (ret24[m] + ret25[m]) / 2
    months_avg[m] = avg
    printf "%s: 平均 %.2f%%\n", months[m], avg
  }

  # Flag best/worst months
  best_month = 1; worst_month = 1
  for(m=2; m<=12; m++) {
    if(months_avg[m] > months_avg[best_month]) best_month = m
    if(months_avg[m] < months_avg[worst_month]) worst_month = m
  }
  printf "\n最佳月份: %s (%.2f%%)\n", months[best_month], months_avg[best_month]
  printf "最差月份: %s (%.2f%%)\n", months[worst_month], months_avg[worst_month]
}

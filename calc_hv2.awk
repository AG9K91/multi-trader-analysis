{
  ret[NR] = $1
}
END {
  n = NR

  # HV20: last 20 returns
  k = 20
  idx = n - k + 1
  sum20 = 0
  for(i=idx; i<=n; i++) sum20 += ret[i]
  mean20 = sum20 / k
  ssq20 = 0
  for(i=idx; i<=n; i++) { d = ret[i] - mean20; ssq20 += d * d }
  hv20 = sqrt(ssq20 / (k-1)) * sqrt(252)

  # All rolling HV20
  printf "20日历史波动率 (近20日): %.2f%%\n\n", hv20*100
  printf "滚动HV20序列:\n"
  for(i=20; i<=n; i++) {
    sum = 0
    for(j=i-19; j<=i; j++) sum += ret[j]
    m = sum/20
    ssq = 0
    for(j=i-19; j<=i; j++) { d = ret[j] - m; ssq += d * d }
    rhv = sqrt(ssq/19) * sqrt(252)
    printf "窗口%2d: %.2f%%\n", i, rhv*100
    rolling_hv[i-19] = rhv
  }

  # Percentile of current HV20
  last_hv = rolling_hv[n-19]
  num_rolling = n - 19
  count_lower = 0
  for(i=1; i<=num_rolling; i++) {
    if(rolling_hv[i] < last_hv) count_lower++
  }
  pct = count_lower / num_rolling * 100

  printf "\n当前HV20分位数: %.1f%% (在%d个滚动窗口中排第%d高)\n", pct, num_rolling, num_rolling - count_lower

  # Min/Max HV20
  min_hv = rolling_hv[1]
  max_hv = rolling_hv[1]
  for(i=2; i<=num_rolling; i++) {
    if(rolling_hv[i] < min_hv) min_hv = rolling_hv[i]
    if(rolling_hv[i] > max_hv) max_hv = rolling_hv[i]
  }
  printf "HV20最低: %.2f%%, 最高: %.2f%%\n", min_hv*100, max_hv*100
}

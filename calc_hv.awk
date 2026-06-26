{
  ret[NR] = $1
}
END {
  n = NR
  # HV20: last 20 returns annualized
  k = 20
  idx = n - k + 1
  sum20 = 0
  for(i=idx; i<=n; i++) {
    sum20 += ret[i]
  }
  mean20 = sum20 / k
  ssq20 = 0
  for(i=idx; i<=n; i++) {
    diff = ret[i] - mean20
    ssq20 += diff * diff
  }
  hv20 = sqrt(ssq20 / (k-1)) * sqrt(252)

  # HV30 (if data available)
  k30 = 30
  idx30 = n - k30 + 1
  if(idx30 > 0) {
    sum30 = 0
    for(i=idx30; i<=n; i++) sum30 += ret[i]
    mean30 = sum30 / k30
    ssq30 = 0
    for(i=idx30; i<=n; i++) {
      diff = ret[i] - mean30
      ssq30 += diff * diff
    }
    hv30 = sqrt(ssq30 / (k30-1)) * sqrt(252)
  }

  # HV50 (all data)
  sum50 = 0
  for(i=1; i<=n; i++) sum50 += ret[i]
  mean50 = sum50 / n
  ssq50 = 0
  for(i=1; i<=n; i++) {
    diff = ret[i] - mean50
    ssq50 += diff * diff
  }
  hv50 = sqrt(ssq50 / (n-1)) * sqrt(252)

  printf "HV20 (近20日年化): %.2f%%\n", hv20*100
  printf "HV30 (近30日年化): %.2f%%\n", hv30*100
  printf "HV50 (近50日年化): %.2f%%\n", hv50*100

  # Compute all rolling HV20
  printf "\n滚动HV20序列:\n"
  for(i=20; i<=n; i++) {
    sum = 0
    for(j=i-19; j<=i; j++) sum += ret[j]
    m = sum/20
    ssq = 0
    for(j=i-19; j<=i; j++) {
      d = ret[j] - m
      ssq += d * d
    }
    rhv = sqrt(ssq/19) * sqrt(252)
    printf "  点%d: %.2f%%\n", i, rhv*100
  }

  # Last HV20 position among all rolling HV20s
  last_hv = 0
  count_lower = 0
  count = 0
  for(i=20; i<=n; i++) {
    sum = 0
    for(j=i-19; j<=i; j++) sum += ret[j]
    m = sum/20
    ssq = 0
    for(j=i-19; j<=i; j++) {
      d = ret[j] - m
      ssq += d * d
    }
    rhv = sqrt(ssq/19) * sqrt(252)
    count++
    if(i == n) last_hv = rhv
    else if(rhv < last_hv) count_lower++
  }
  # Wait, need to compute last_hv first then compare

  # Simpler: just print all and let me compute manually
}

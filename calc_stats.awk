{
  ret[NR] = $1
  sum += $1
  sumsq += $1 * $1
  n = NR
}
END {
  mean = sum / n

  # Variance and std
  for(i=1; i<=n; i++) {
    diff = ret[i] - mean
    sum_sq_diff += diff * diff
    sum_cubed += diff * diff * diff
    sum_quartic += diff * diff * diff * diff
  }

  var = sum_sq_diff / (n - 1)
  std = sqrt(var)
  ann_vol = std * sqrt(252)

  # Skewness
  s3 = sum_cubed / n
  skew = s3 / (std * std * std) * n * n / ((n-1) * (n-2))

  # Kurtosis (excess)
  s4 = sum_quartic / n
  kurt = (s4 / (var * var)) * n * (n+1) / ((n-1)*(n-2)*(n-3)) - 3 * (n-1)*(n-1) / ((n-2)*(n-3))

  # Min, Max
  min_ret = ret[1]
  max_ret = ret[1]
  for(i=2; i<=n; i++) {
    if(ret[i] < min_ret) min_ret = ret[i]
    if(ret[i] > max_ret) max_ret = ret[i]
  }

  printf "样本量: %d\n", n
  printf "日均收益率: %.6f (%.4f%%)\n", mean, mean*100
  printf "日波动率: %.6f (%.4f%%)\n", std, std*100
  printf "年化波动率: %.6f (%.2f%%)\n", ann_vol, ann_vol*100
  printf "偏度: %.4f\n", skew
  printf "超额峰度: %.4f\n", kurt
  printf "最小日收益: %.6f (%.4f%%)\n", min_ret, min_ret*100
  printf "最大日收益: %.6f (%.4f%%)\n", max_ret, max_ret*100
  printf "年化收益率: %.4f (%.2f%%)\n", mean*252, mean*252*100
}

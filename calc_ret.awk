NR==1 { prev=$1; next }
{ ret=log($1/prev); printf "%.6f\n", ret; prev=$1 }

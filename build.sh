#!/bin/bash

# Simplified from:
#   https://github.com/dapphub/dapp/blob/master/libexec/dapp/dapp-build

export DAPP_SRC="src"
export DAPP_OUT="out"

rm -rf out
find "${DAPP_SRC}" -name '*.sol' | while read -r x; do
  dir=${x%\/*}
  dir=${dir#$DAPP_SRC}
  dir=${dir#/}
  mkdir -p "$DAPP_OUT/$dir"
  (set -x; solc --overwrite --abi --bin --bin-runtime = -o "$DAPP_OUT" "$x")
done

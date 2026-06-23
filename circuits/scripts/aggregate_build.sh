#!/usr/bin/env bash
# Prism — build aggregation circuits for K in {2,4,8}: compile, size the Hermez ptau to
# the largest (K=8) constraint count, trusted setup, prove, and emit fixtures per K.
set -euo pipefail
cd "$(dirname "$0")/.."   # circuits/
mkdir -p build fixtures
KS=(1 2 4 8)

MAX=0
for K in "${KS[@]}"; do
  entry="build/agg_k${K}.circom"
  cat > "$entry" <<EOF
pragma circom 2.1.6;
include "../src/aggregation.circom";
component main { public [root, externalNullifier] } = Aggregation(${K}, 20);
EOF
  echo "== compile K=$K =="
  mkdir -p "build/agg_k${K}"
  circom "$entry" --r1cs --wasm --sym -o "build/agg_k${K}" -l node_modules >/dev/null
  echo '{ "type": "commonjs" }' > "build/agg_k${K}/agg_k${K}_js/package.json"
  c=$(snarkjs r1cs info "build/agg_k${K}/agg_k${K}.r1cs" 2>&1 | sed -E 's/\x1b\[[0-9;]*m//g' \
        | grep -i "of Constraints" | grep -oE '[0-9]+' | tail -1)
  echo "K=$K constraints=$c"
  [ "$c" -gt "$MAX" ] && MAX=$c
done
POWER=13; while [ $((1 << POWER)) -lt "$MAX" ]; do POWER=$((POWER + 1)); done
echo "== max constraints=$MAX -> ptau power=$POWER (2^$POWER) =="
PTAU="build/powersOfTau28_hez_final_${POWER}.ptau"
if [ ! -f "$PTAU" ] || [ "$(wc -c < "$PTAU")" -lt 100000 ]; then
  curl -fSL "https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_${POWER}.ptau" -o "$PTAU"
fi
ls -la "$PTAU"

for K in "${KS[@]}"; do
  d="build/agg_k${K}"
  echo "== setup K=$K =="
  snarkjs groth16 setup "$d/agg_k${K}.r1cs" "$PTAU" "$d/agg_0000.zkey" >/dev/null
  snarkjs zkey contribute "$d/agg_0000.zkey" "$d/agg_final.zkey" \
    --name="prism-agg-k${K}" -e="prism agg $K $(date +%s%N)" >/dev/null
  mkdir -p "fixtures/agg_k${K}"
  snarkjs zkey export verificationkey "$d/agg_final.zkey" "fixtures/agg_k${K}/verification_key.json" >/dev/null
  echo "== witness + prove K=$K =="
  node scripts/gen_agg_input.mjs "$K"
  node "$d/agg_k${K}_js/generate_witness.js" "$d/agg_k${K}_js/agg_k${K}.wasm" "$d/input.json" "$d/witness.wtns"
  snarkjs groth16 prove "$d/agg_final.zkey" "$d/witness.wtns" \
    "fixtures/agg_k${K}/proof.json" "fixtures/agg_k${K}/public.json" >/dev/null
  echo -n "== verify K=$K == "; snarkjs groth16 verify "fixtures/agg_k${K}/verification_key.json" \
    "fixtures/agg_k${K}/public.json" "fixtures/agg_k${K}/proof.json" 2>&1 | grep -iE 'OK|invalid'
  node -e '
    const fs=require("fs"); const K='"$K"';
    const pub=JSON.parse(fs.readFileSync(`fixtures/agg_k${K}/public.json`));
    const meta=JSON.parse(fs.readFileSync(`fixtures/agg_k${K}/meta.json`));
    const ok = pub.length===3 && pub[0]===meta.H && pub[1]===meta.root && pub[2]===meta.externalNullifier;
    console.log(`K=${K}: nPublic=${pub.length} public=[H,root,extN] matches meta: ${ok}`);
    if(!ok){console.error("MISMATCH",{pub,meta:{H:meta.H,root:meta.root,extN:meta.externalNullifier}});process.exit(1);}
  '
done
echo "== ALL AGGREGATION FIXTURES BUILT =="
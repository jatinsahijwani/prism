#!/usr/bin/env bash
# Prism — compile disclosure.circom, trusted setup, prove, emit fixtures.
set -euo pipefail
cd "$(dirname "$0")/.."   # circuits/
mkdir -p build/disclosure fixtures/disclosure

echo "== compile =="
circom src/disclosure.circom --r1cs --wasm --sym -o build/disclosure -l node_modules
echo '{ "type": "commonjs" }' > build/disclosure/disclosure_js/package.json

echo "== r1cs info =="
snarkjs r1cs info build/disclosure/disclosure.r1cs 2>&1 | sed -E 's/\x1b\[[0-9;]*m//g' | tee build/disclosure/info.txt
C=$(grep -i "of Constraints" build/disclosure/info.txt | grep -oE '[0-9]+' | tail -1)
POWER=13; while [ $((1 << POWER)) -lt "$C" ]; do POWER=$((POWER + 1)); done
echo "constraints=$C -> ptau power=$POWER"
PTAU="build/powersOfTau28_hez_final_${POWER}.ptau"
if [ ! -f "$PTAU" ] || [ "$(wc -c < "$PTAU")" -lt 100000 ]; then
  curl -fSL "https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_${POWER}.ptau" -o "$PTAU"
fi

echo "== setup + prove =="
snarkjs groth16 setup build/disclosure/disclosure.r1cs "$PTAU" build/disclosure/d_0000.zkey >/dev/null
snarkjs zkey contribute build/disclosure/d_0000.zkey build/disclosure/d_final.zkey \
  --name="prism-disclosure" -e="prism disclosure $(date +%s%N)" >/dev/null
snarkjs zkey export verificationkey build/disclosure/d_final.zkey fixtures/disclosure/verification_key.json >/dev/null

node scripts/gen_disclosure_input.mjs
node build/disclosure/disclosure_js/generate_witness.js \
  build/disclosure/disclosure_js/disclosure.wasm build/disclosure/input.json build/disclosure/witness.wtns
snarkjs groth16 prove build/disclosure/d_final.zkey build/disclosure/witness.wtns \
  fixtures/disclosure/proof.json fixtures/disclosure/public.json >/dev/null

echo -n "== verify == "; snarkjs groth16 verify fixtures/disclosure/verification_key.json \
  fixtures/disclosure/public.json fixtures/disclosure/proof.json 2>&1 | grep -iE 'OK|invalid'

node -e '
  const fs=require("fs");
  const pub=JSON.parse(fs.readFileSync("fixtures/disclosure/public.json"));
  const meta=JSON.parse(fs.readFileSync("fixtures/disclosure/meta.json"));
  const ok = pub.length===6 && pub[0]===meta.commitment && pub[1]===meta.Ax && pub[5]===meta.c;
  console.log(`nPublic=${pub.length} public=[commitment,Ax,Ay,Rx,Ry,c] matches meta: ${ok}`);
  if(!ok){console.error("MISMATCH",{pub,meta});process.exit(1);}
'
echo "== DISCLOSURE FIXTURES BUILT =="
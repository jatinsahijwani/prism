#!/usr/bin/env bash
# Prism — compile membership.circom, run Groth16/BN254 trusted setup with a
# right-sized Hermez Powers-of-Tau, and emit proof/VK/public-input fixtures.
set -euo pipefail

cd "$(dirname "$0")/.."   # circuits/
mkdir -p build fixtures

CIRCUIT=src/membership.circom
echo "== [1/6] compile circuit =="
circom "$CIRCUIT" --r1cs --wasm --sym -o build -l node_modules
# circom emits CommonJS witness helpers; mark the dir so node doesn't treat them
# as ESM (this package.json has "type":"module").
echo '{ "type": "commonjs" }' > build/membership_js/package.json

echo "== [2/6] r1cs info =="
# Strip ANSI colour codes before parsing (they contain digits like "[32;22m").
snarkjs r1cs info build/membership.r1cs 2>&1 | sed -E 's/\x1b\[[0-9;]*m//g' | tee build/r1cs_info.txt

# Pick the smallest Hermez ptau power that covers the constraint count (min 13, i.e. > 2^12).
CONSTRAINTS=$(grep -i "of Constraints" build/r1cs_info.txt | grep -oE '[0-9]+' | tail -1)
POWER=13
while [ $((1 << POWER)) -lt "$CONSTRAINTS" ]; do POWER=$((POWER + 1)); done
echo "constraints=$CONSTRAINTS -> ptau power=$POWER (2^$POWER = $((1 << POWER)))"

# Hermez powersOfTau28 ceremony, served from the zkevm Google Storage mirror
# (the old hermez.s3 bucket is now access-denied).
PTAU="build/powersOfTau28_hez_final_${POWER}.ptau"
if [ ! -f "$PTAU" ] || [ "$(wc -c < "$PTAU")" -lt 100000 ]; then
  echo "== [3/6] download Hermez ptau (2^$POWER) =="
  curl -fSL "https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_${POWER}.ptau" -o "$PTAU"
else
  echo "== [3/6] ptau cached =="
fi
ls -la "$PTAU"

echo "== [4/6] groth16 setup + phase-2 contribution =="
snarkjs groth16 setup build/membership.r1cs "$PTAU" build/membership_0000.zkey
snarkjs zkey contribute build/membership_0000.zkey build/membership_final.zkey \
  --name="prism-day1" -v -e="prism phase2 entropy $(date +%s%N)"
snarkjs zkey export verificationkey build/membership_final.zkey fixtures/verification_key.json

echo "== [5/6] witness + proof =="
node scripts/gen_input.mjs build/input.json
node build/membership_js/generate_witness.js build/membership_js/membership.wasm build/input.json build/witness.wtns
snarkjs groth16 prove build/membership_final.zkey build/witness.wtns fixtures/proof.json fixtures/public.json

echo "== [6/6] local verify (must say OK) =="
snarkjs groth16 verify fixtures/verification_key.json fixtures/public.json fixtures/proof.json

echo "fixtures written:"; ls -la fixtures/

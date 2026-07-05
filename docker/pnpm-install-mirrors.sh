#!/bin/sh
# pnpm install --frozen-lockfile with registry failover (Iran / slow networks).
# Env:
#   NPM_REGISTRY      — tried first (.env / docker-compose build args)
#   NPM_REGISTRIES    — extra space-separated mirrors (optional)
# Args: passed to pnpm install (e.g. --ignore-scripts)

set -e

configure_pnpm_network() {
  pnpm config set fetch-timeout 600000
  pnpm config set fetch-retry-mintimeout 10000
  pnpm config set fetch-retry-maxtimeout 60000
  pnpm config set strict-ssl false
}

default_registries="
https://registry.npmmirror.com/
https://mirror.kargadan.ir/repository/npm-group/
https://repo.nugetiran.ir/repository/npm/
https://package-mirror.liara.ir/repository/npm/
https://mirror-npm.runflare.com/
https://npm.iranserver.com/repository/npm/
https://mirrors.cloud.tencent.com/npm/
https://registry.npmjs.org/
"

regs=""
add_reg() {
  url="$1"
  [ -z "$url" ] && return
  case " $regs " in
    *" $url "*) ;;
    *) regs="$regs $url" ;;
  esac
}

[ -n "$NPM_REGISTRY" ] && add_reg "$NPM_REGISTRY"
if [ -n "$NPM_REGISTRIES" ]; then
  for r in $NPM_REGISTRIES; do add_reg "$r"; done
fi
for r in $default_registries; do add_reg "$r"; done

configure_pnpm_network

unset PNPM_REGISTRY NPM_CONFIG_REGISTRY 2>/dev/null || true

lockflag="--frozen-lockfile"

for reg in $regs; do
  echo ">>> pnpm install $lockflag $* (registry: $reg)"
  pnpm config set registry "$reg"
  npm config set registry "$reg" 2>/dev/null || true
  pnpm config set fetch-retries 3
  if pnpm install $lockflag "$@"; then
    echo ">>> install OK via $reg"
    exit 0
  fi
  echo ">>> install failed on $reg, trying next mirror..."
  sleep 3
done

echo ">>> pnpm install failed on all registries"
exit 1

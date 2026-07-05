#!/bin/sh
# Validate production .env for docker compose (special chars, required keys).
# Usage: sh docker/check-vps-env.sh [/path/to/.env]

ENV_FILE="${1:-.env}"
fail=0

err() {
  echo "[FAIL] $*"
  fail=1
}

ok() {
  echo "[OK]   $*"
}

if [ ! -f "$ENV_FILE" ]; then
  err "Missing $ENV_FILE"
  exit 1
fi

# Normalize Windows line endings (common when editing from Windows).
sed -i 's/\r$//' "$ENV_FILE" 2>/dev/null || true

get_line() {
  key=$1
  grep -E "^${key}=" "$ENV_FILE" 2>/dev/null | tail -1
}

get_val() {
  key=$1
  line=$(get_line "$key")
  if [ -z "$line" ]; then
    printf ''
    return
  fi
  val=${line#*=}
  # strip surrounding double quotes
  case "$val" in
    \"*\") val=${val#\"}; val=${val%\"} ;;
  esac
  # strip any trailing CR
  val=$(printf '%s' "$val" | tr -d '\r')
  printf '%s' "$val"
}

has_unquoted_hash() {
  key=$1
  line=$(get_line "$key")
  [ -z "$line" ] && return 1
  echo "$line" | grep -qE "^${key}=[^\"]*#"
}

is_placeholder() {
  val=$1
  case "$val" in
    change-me*|CHANGE_ME*|CHANGEME*|your-*|replace-with-*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

check_secret() {
  key=$1
  min_len=${2:-8}

  line=$(get_line "$key")
  if [ -z "$line" ]; then
    err "Missing ${key}= (add to $ENV_FILE)"
    return
  fi

  if has_unquoted_hash "$key"; then
    err "${key} contains # outside quotes - use ${key}=\"...\""
    return
  fi

  val=$(get_val "$key")
  if [ -z "$val" ]; then
    err "${key} is empty"
    return
  fi

  if [ "${#val}" -lt "$min_len" ]; then
    err "${key} is too short (${#val} chars, need ${min_len}+)"
    return
  fi

  if is_placeholder "$val"; then
    err "${key} still uses a placeholder value"
    return
  fi

  ok "$key is set (${#val} chars)"
}

check_secret POSTGRES_PASSWORD 8
check_secret AUTH_SECRET 32
check_secret ADMIN_PASSWORD 8

if [ "$fail" -ne 0 ]; then
  echo ""
  echo "Fix $ENV_FILE on the VPS, then rerun repair-expenses-on-vps.ps1"
  echo 'Wrap secrets in double quotes when they contain # % ! < or spaces.'
  exit 1
fi

echo ""
echo "All required secrets OK."
exit 0

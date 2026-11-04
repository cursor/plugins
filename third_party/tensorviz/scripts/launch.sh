#!/bin/sh
# Public integration only. Core code arrives as a version-pinned binary archive.
set -eu
umask 077
fail() { echo "TensorViz: $*" >&2; exit 1; }
plugin=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd -P)
if [ "$(uname -s)-$(uname -m)" != Darwin-arm64 ]; then
  fail 'This preview supports macOS Apple Silicon. No runtime was downloaded.'
fi
lock="$plugin/runtime-lock.json"
version=$(/usr/bin/plutil -extract version raw -o - "$lock")
sha=$(/usr/bin/plutil -extract sha256 raw -o - "$lock")
url=$(/usr/bin/plutil -extract url raw -o - "$lock")
bytes=$(/usr/bin/plutil -extract bytes raw -o - "$lock")
case "$sha" in *[!a-f0-9]*|'') fail 'Invalid runtime digest.';; esac
[ "${#sha}" -eq 64 ] || fail 'Invalid runtime digest.'
case "$bytes" in *[!0-9]*|'') fail 'Invalid runtime size.';; esac
case "$url" in https://*) ;; *) fail 'Runtime downloads require HTTPS.';; esac
cache="${HOME:?}/Library/Caches/dev.tensorviz/runtime"
mkdir -p "$cache"
[ ! -L "$cache" ] || fail 'The runtime cache must not be a symbolic link.'
archive="$cache/$sha.tar.gz"
download=''
session=''
child=''
cleanup() {
  if [ -n "$child" ]; then kill "$child" 2>/dev/null || true; wait "$child" 2>/dev/null || true; fi
  [ -z "$download" ] || rm -f -- "$download"
  [ -z "$session" ] || rm -rf -- "$session"
}
trap cleanup 0
trap 'exit 130' INT
trap 'exit 143' TERM HUP
if [ ! -f "$archive" ]; then
  download=$(mktemp "$cache/.download.XXXXXX")
  echo "TensorViz: downloading runtime $version for reuse by later connections." >&2
  /usr/bin/curl --fail --silent --show-error --location --proto '=https' --proto-redir '=https' \
    --connect-timeout 15 --max-time 300 --max-filesize "$bytes" --output "$download" "$url" < /dev/null &
  child=$!
  wait "$child" || fail 'Runtime download failed. Retry the plugin connection.'
  child=''
  [ "$(/usr/bin/shasum -a 256 "$download" | cut -d ' ' -f 1)" = "$sha" ] \
    || fail 'Runtime checksum mismatch. Nothing was executed.'
  mv -f -- "$download" "$archive"
  download=''
fi
[ ! -L "$archive" ] || fail 'The cached archive must not be a symbolic link.'
[ "$(/usr/bin/shasum -a 256 "$archive" | cut -d ' ' -f 1)" = "$sha" ] \
  || fail "Cached runtime is damaged. Remove $archive and reconnect. Nothing was executed."
# Extract anew from the verified archive, so modified unpacked caches cannot run.
session=$(mktemp -d "${TMPDIR:-/tmp}/tensorviz-native.XXXXXX")
/usr/bin/tar -xzf "$archive" -C "$session"
[ -x "$session/tensorviz-host" ] || fail 'Runtime archive has no executable host.'
"$session/tensorviz-host" "$@" <&0 &
child=$!
set +e
wait "$child"
status=$?
child=''
exit "$status"

#!/bin/sh
# Runs Next.js and nginx; exits (so the Supervisor watchdog restarts the
# add-on) as soon as either process dies, and forwards stop signals.
set -eu

node /app/server.js &
NEXT_PID=$!
nginx -g 'daemon off;' &
NGINX_PID=$!

stop() {
	kill -TERM "$NEXT_PID" "$NGINX_PID" 2>/dev/null || true
	wait
	exit 0
}
trap stop TERM INT

while kill -0 "$NEXT_PID" 2>/dev/null && kill -0 "$NGINX_PID" 2>/dev/null; do
	sleep 2
done

echo "[alexa-ha-config] A service stopped unexpectedly, exiting" >&2
kill -TERM "$NEXT_PID" "$NGINX_PID" 2>/dev/null || true
exit 1

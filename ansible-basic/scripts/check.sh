#!/usr/bin/env bash
# check.sh - snapshot the state of the Pi. Run before and after a deploy.
IP=100.94.232.78
USER=jamen
PORT=3000
DB=webapp

echo "================ FROM THE LAPTOP ================"
curl -s -o /dev/null -m 5 -w "http://$IP:$PORT/          -> HTTP %{http_code}\n" \
     "http://$IP:$PORT/" || echo "http://$IP:$PORT/          -> no answer"
curl -s -o /dev/null -m 5 -w "http://$IP:$PORT/logo.png  -> HTTP %{http_code} (%{content_type}, %{size_download} bytes)\n" \
     "http://$IP:$PORT/logo.png" || echo "http://$IP:$PORT/logo.png  -> no answer"

echo -n "page contains marker text  -> "
curl -s -m 5 "http://$IP:$PORT/" | grep -q "handled by Ansible" && echo "YES" || echo "no"

echo
echo "================ ON THE PI ======================"
ssh -o ConnectTimeout=5 "$USER@$IP" 'bash -s' <<'EOF'
pkg() { dpkg-query -W -f='${Status}' "$1" 2>/dev/null | grep -q "^install ok installed" \
        && echo "installed" || echo "ABSENT"; }

echo "nginx package       : $(pkg nginx)"
echo "postgresql package  : $(pkg postgresql)"
echo "nginx service       : $(systemctl is-active nginx 2>/dev/null || echo inactive)"
echo "postgres service    : $(systemctl is-active postgresql 2>/dev/null || echo inactive)"
echo "listening ports     : $(ss -tln 2>/dev/null | awk 'NR>1{print $4}' | grep -oE '[0-9]+$' | sort -un | tr '\n' ' ')"
echo "index.html          : $(test -f /var/www/html/index.html && echo present || echo ABSENT)"
echo "logo.png            : $(test -f /var/www/html/logo.png && echo "present ($(stat -c%s /var/www/html/logo.png) bytes)" || echo ABSENT)"

if sudo -n true 2>/dev/null; then
  echo "database webapp     : $(sudo -u postgres psql -tAqc "SELECT 1 FROM pg_database WHERE datname='webapp'" 2>/dev/null | grep -q 1 && echo exists || echo ABSENT)"
  echo "rows in images      : $(sudo -u postgres psql -d webapp -tAqc 'SELECT count(*) FROM images' 2>/dev/null || echo n/a)"
else
  echo "database checks     : skipped (needs passwordless sudo)"
fi
EOF


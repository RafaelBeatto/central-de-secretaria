#!/bin/bash
# =====================================================================
# Instala/atualiza a Central da Secretaria APAE no servidor BrasilCloud.
# Rodar como ubuntu (usa sudo). Espera os arquivos em /tmp/apae-deploy:
#   central-secretaria.jar, front.tar.gz, apae.sql, apae-backend.service, nginx-apae.conf
# Pode ser rodado de novo: não recria banco, usuário nem segredos que já existam.
# NÃO mexe em System Car, GT06, nos sites existentes do nginx nem nas regras do ufw.
# =====================================================================
set -euo pipefail
ORIGEM=/tmp/apae-deploy
cd "$ORIGEM"

echo "== 1. usuário de sistema e pastas =="
id apae >/dev/null 2>&1 || sudo useradd --system --home-dir /opt/apae --shell /usr/sbin/nologin apae
sudo install -d -m 755 -o root -g root /opt/apae /opt/apae/front
sudo install -d -m 750 -o apae -g apae /opt/apae/back
sudo install -d -m 750 -o root -g root /etc/apae

echo "== 2. segredos (/etc/apae/apae.env, 600) =="
if ! sudo test -f /etc/apae/apae.env; then
  SENHA_DB=$(openssl rand -hex 24)
  SEGREDO_JWT=$(openssl rand -hex 48)
  printf 'SPRING_PROFILES_ACTIVE=prod\nAPAE_DB_USUARIO=apae\nAPAE_DB_SENHA=%s\nAPAE_JWT_SEGREDO=%s\n' "$SENHA_DB" "$SEGREDO_JWT" \
    | sudo tee /etc/apae/apae.env >/dev/null
  sudo chmod 600 /etc/apae/apae.env
  echo "criado"
else
  echo "já existe (mantido)"
fi
# Chaves da AWS: o instalador só deixa as linhas vazias; quem preenche é o Fabio (sudo nano).
for VARIAVEL in AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY; do
  sudo grep -q "^$VARIAVEL=" /etc/apae/apae.env || echo "$VARIAVEL=" | sudo tee -a /etc/apae/apae.env >/dev/null
done
SENHA_DB=$(sudo grep '^APAE_DB_SENHA=' /etc/apae/apae.env | cut -d= -f2-)

echo "== 3. banco e usuário próprios do APAE =="
if [ -z "$(sudo -u postgres psql -Atc "select 1 from pg_roles where rolname='apae'")" ]; then
  echo "CREATE ROLE apae LOGIN PASSWORD '$SENHA_DB';" | sudo -u postgres psql -q -v ON_ERROR_STOP=1
  echo "usuário apae criado"
fi
if [ -z "$(sudo -u postgres psql -Atc "select 1 from pg_database where datname='apae'")" ]; then
  sudo -u postgres psql -q -v ON_ERROR_STOP=1 -c "CREATE DATABASE apae OWNER apae ENCODING 'UTF8' TEMPLATE template0;"
  sudo -u postgres psql -q -v ON_ERROR_STOP=1 -c "REVOKE ALL ON DATABASE apae FROM PUBLIC;"
  echo "banco apae criado"
fi
if [ -z "$(sudo -u postgres psql -d apae -Atc "select 1 from pg_namespace where nspname='acesso'")" ]; then
  sudo cp apae.sql /tmp/apae-schema.sql && sudo chown postgres /tmp/apae-schema.sql
  sudo -u postgres psql -q -v ON_ERROR_STOP=1 -d apae -c "SET ROLE apae;" -f /tmp/apae-schema.sql
  sudo rm -f /tmp/apae-schema.sql
  echo "schema aplicado"
else
  echo "schema já existe (mantido)"
fi

echo "== 4. arquivos da aplicação =="
sudo install -m 640 -o apae -g apae central-secretaria.jar /opt/apae/back/central-secretaria.jar
sudo find /opt/apae/front -mindepth 1 -delete
sudo tar -xzf front.tar.gz -C /opt/apae/front
sudo chown -R root:root /opt/apae/front
sudo find /opt/apae/front -type d -exec chmod 755 {} + && sudo find /opt/apae/front -type f -exec chmod 644 {} +

echo "== 5. serviço systemd =="
sudo install -m 644 apae-backend.service /etc/systemd/system/apae-backend.service
sudo systemctl daemon-reload
sudo systemctl enable apae-backend >/dev/null 2>&1
sudo systemctl restart apae-backend

echo "== 6. nginx (arquivo próprio; valida antes de recarregar) =="
sudo install -m 644 nginx-apae.conf /etc/nginx/sites-available/apae
sudo ln -sfn /etc/nginx/sites-available/apae /etc/nginx/sites-enabled/apae
if sudo nginx -t; then
  sudo systemctl reload nginx
else
  sudo rm -f /etc/nginx/sites-enabled/apae
  echo "ERRO: nginx -t falhou; site apae desligado, nada recarregado." >&2
  exit 1
fi

echo "== 7. firewall =="
sudo ufw allow 8090/tcp >/dev/null && sudo ufw status | grep -E "^8090"

echo "== 8. aguardando o back subir =="
for i in $(seq 1 60); do
  CODIGO=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8082/api/autenticacao/eu || true)
  [ "$CODIGO" = "401" ] && break
  sleep 2
done
echo "back 127.0.0.1:8082 /api/autenticacao/eu -> $CODIGO (401 = no ar, pedindo login)"
sudo systemctl is-active apae-backend

#!/bin/bash
# =====================================================================
# Atualiza o APAE em produção (servidor BrasilCloud). Rodar como ubuntu.
# Espera em /tmp/apae-deploy:
#   central-secretaria.jar, front.tar.gz, apae.sql (NOVO), apae-backend.service,
#   nginx-apae.conf, instalar.sh, VERSAO (hash do commit publicado)
#   e, só se o apae.sql mudou desde a versão em produção:
#   apae-antigo.sql (apae.sql do commit que está em /opt/apae/VERSAO) + migracoes/*.sql
# Passos: testa as migrações em bancos temporários (estrutura e permissões têm de
# ficar iguais ao apae.sql novo) → backup do banco → guarda a versão atual →
# aplica as migrações → instalar.sh → se não subir, volta a versão anterior.
# =====================================================================
set -euo pipefail
cd /tmp/apae-deploy
PSQL="sudo -u postgres psql -q -X -v ON_ERROR_STOP=1"
MIGRACOES=$(ls migracoes/*.sql 2>/dev/null | sort || true)

if [ -n "$MIGRACOES" ]; then
  echo "== 1. teste das migrações em bancos temporários =="
  [ -f apae-antigo.sql ] || { echo "ABORTADO: falta apae-antigo.sql"; exit 1; }
  sudo rm -rf /var/lib/postgresql/apae-deploy && sudo cp -r /tmp/apae-deploy /var/lib/postgresql/apae-deploy
  sudo chown -R postgres /var/lib/postgresql/apae-deploy
  B=/var/lib/postgresql/apae-deploy
  $PSQL -c "DROP DATABASE IF EXISTS apae_teste_antigo" -c "DROP DATABASE IF EXISTS apae_teste_novo" 2>/dev/null
  $PSQL -c "CREATE DATABASE apae_teste_antigo" -c "CREATE DATABASE apae_teste_novo"
  $PSQL -d apae_teste_antigo -f $B/apae-antigo.sql >/dev/null
  for m in $MIGRACOES; do $PSQL -d apae_teste_antigo -f $B/$m >/dev/null; done
  $PSQL -d apae_teste_novo -f $B/apae.sql >/dev/null
  # pg_dump do PG 16 põe "\restrict <chave aleatória>" em cada dump: ignorar essas linhas
  esquema() { sudo -u postgres pg_dump -s -O -x "$1" | grep -vE '^(--|\\(un)?restrict )'; }
  Q="select c.codigo||':'||p.codigo from acesso.cargo_permissao cp join acesso.cargo c on c.id=cp.cargo_id join acesso.permissao p on p.id=cp.permissao_id order by 1"
  diff <(esquema apae_teste_antigo) <(esquema apae_teste_novo) > /tmp/apae-diff-esquema.txt && ESQ=igual || ESQ=DIFERENTE
  diff <(sudo -u postgres psql -AtX -d apae_teste_antigo -c "$Q") <(sudo -u postgres psql -AtX -d apae_teste_novo -c "$Q") >/dev/null && PERM=igual || PERM=DIFERENTE
  $PSQL -c "DROP DATABASE apae_teste_antigo" -c "DROP DATABASE apae_teste_novo"
  echo "estrutura migrada x nova: $ESQ | permissões por cargo: $PERM"
  if [ "$ESQ" != igual ] || [ "$PERM" != igual ]; then
    head -40 /tmp/apae-diff-esquema.txt
    echo "ABORTADO: migração não reproduz o apae.sql novo. Produção não foi tocada."
    exit 1
  fi
  rm -f /tmp/apae-diff-esquema.txt
else
  echo "== 1. sem migrações (apae.sql não mudou) =="
fi

echo "== 2. backup do banco de produção =="
sudo install -d -m 700 -o postgres -g postgres /opt/apae/backups
ARQ=/opt/apae/backups/apae-$(date +%Y%m%d-%H%M).sql.gz
sudo -u postgres bash -c "pg_dump apae | gzip > $ARQ"
sudo ls -l "$ARQ"

echo "== 3. guardar versão atual (para voltar atrás) =="
sudo cp -a /opt/apae/back/central-secretaria.jar /opt/apae/back/central-secretaria.jar.anterior
sudo tar -czf /opt/apae/front-anterior.tar.gz -C /opt/apae/front .
sudo cp -a /opt/apae/VERSAO /opt/apae/VERSAO.anterior 2>/dev/null || true

if [ -n "$MIGRACOES" ]; then
  echo "== 4. migrações no banco apae =="
  for m in $MIGRACOES; do echo "-> $m"; $PSQL -d apae -c "SET ROLE apae;" -f /var/lib/postgresql/apae-deploy/$m; done
  sudo rm -rf /var/lib/postgresql/apae-deploy
fi

echo "== 5. publicação =="
if ! bash /tmp/apae-deploy/instalar.sh || [ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8082/api/autenticacao/eu)" != "401" ]; then
  echo "!! versão nova não subiu: voltando a anterior (o banco migrado continua; migrações só acrescentam)"
  sudo journalctl -u apae-backend --no-pager -n 60 | grep -iE "error|exception|caused" | tail -10
  sudo install -m 640 -o apae -g apae /opt/apae/back/central-secretaria.jar.anterior /opt/apae/back/central-secretaria.jar
  sudo find /opt/apae/front -mindepth 1 -delete && sudo tar -xzf /opt/apae/front-anterior.tar.gz -C /opt/apae/front
  sudo systemctl restart apae-backend
  exit 1
fi
sudo install -m 644 VERSAO /opt/apae/VERSAO
echo "versão em produção: $(cat /opt/apae/VERSAO)"

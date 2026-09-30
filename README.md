# Central da Secretaria — APAE

| Pasta | Conteúdo |
|---|---|
| `back/` | API em Java 25 + Spring Boot 4 (Maven, gera um `.jar`) |
| `front/` | React + TypeScript + MUI (estrutura do template em `basefront/`) |
| `old/` | Sistema antigo (HTML + JS + localStorage), só para consulta — não alterar |
| `basefront/` | Template de referência do front — não alterar |

## 1. Banco de dados (PostgreSQL local)

```bash
psql -U postgres -c "CREATE DATABASE apae ENCODING 'UTF8'"
psql -U postgres -d apae -f back/src/main/resources/db/apae.sql
```

O script é único, em ordem, e separa as tabelas em schemas por domínio
(`acesso`, `sistema`, `chat`, `secretaria`, `agenda`, `documentos`, `empresas`,
`projetos`, `gerador`, `atendimentos`). A aplicação só valida o schema, nunca o altera.

**Primeiro acesso:** usuário `admin`, senha provisória `Apae@2026` (a troca é obrigatória).

## 2. Back

Variáveis em `back/.env` (copie de `back/.env.exemplo`; o arquivo não é versionado) ou
como variáveis de ambiente — as de ambiente têm prioridade. Os padrões servem para a máquina local:

| Variável | Padrão |
|---|---|
| `APAE_DB_USUARIO` / `APAE_DB_SENHA` | `postgres` / `postgres` |
| `APAE_JWT_SEGREDO` | segredo local (troque em produção, mín. 32 caracteres) |
| `APAE_S3_BUCKET` / `APAE_S3_REGIAO` | `apae-central-secretaria-local` / `sa-east-1` |
| `APAE_S3_ENDPOINT` | vazio (preencha só para S3 compatível local, ex.: MinIO) |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | chaves do usuário IAM; vazias, vale a cadeia padrão do SDK (`~/.aws`) |

O `.env` é lido da pasta de onde o back é iniciado — rode os comandos dentro de `back/`.

```bash
cd back
./mvnw spring-boot:run          # desenvolvimento (mvnw.cmd no Windows)
./mvnw -DskipTests package      # gera target/central-secretaria-1.0.0.jar
java -jar target/central-secretaria-1.0.0.jar
```

## 3. Front

```bash
cd front
npm install
npm run dev      # http://localhost:5173 (proxy de /api e /ws para o back)
npm run build    # gera dist/
```

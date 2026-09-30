-- =====================================================================
-- CENTRAL DA SECRETARIA APAE — SCHEMA ÚNICO
-- Executar na ordem, uma única vez, no banco "apae":
--   psql -U postgres -c "CREATE DATABASE apae ENCODING 'UTF8'"
--   psql -U postgres -d apae -f apae.sql
-- A aplicação NÃO cria tabelas (spring.jpa.hibernate.ddl-auto=validate).
-- Os tamanhos de coluna são espelhados em Limites.java (back) e
-- limites.ts (front): alterou aqui, altere lá.
-- Nenhum arquivo é guardado no banco: só a chave do objeto na AWS S3.
-- =====================================================================

BEGIN;

-- Um schema por domínio (nada no public)
CREATE SCHEMA IF NOT EXISTS acesso;
CREATE SCHEMA IF NOT EXISTS sistema;
CREATE SCHEMA IF NOT EXISTS chat;
CREATE SCHEMA IF NOT EXISTS secretaria;
CREATE SCHEMA IF NOT EXISTS agenda;
CREATE SCHEMA IF NOT EXISTS documentos;
CREATE SCHEMA IF NOT EXISTS empresas;
CREATE SCHEMA IF NOT EXISTS projetos;
CREATE SCHEMA IF NOT EXISTS gerador;
CREATE SCHEMA IF NOT EXISTS atendimentos;

-- ---------------------------------------------------------------------
-- 1. ORGANIZAÇÃO: unidades (Nacional → Estadual → Municipal)
-- ---------------------------------------------------------------------
CREATE TABLE acesso.unidade (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo                    VARCHAR(10)  NOT NULL CHECK (tipo IN ('NACIONAL','ESTADUAL','MUNICIPAL')),
    unidade_pai_id          BIGINT       REFERENCES acesso.unidade (id),
    -- Caminho materializado ("/1/4/17/"): busca de subordinadas por prefixo, sem recursão.
    caminho                 VARCHAR(255) NOT NULL DEFAULT '/',
    nome                    VARCHAR(150) NOT NULL,
    uf                      CHAR(2),
    municipio               VARCHAR(100),
    -- Dados institucionais usados no cabeçalho/rodapé dos documentos e PDFs
    cnpj                    VARCHAR(18),
    endereco                VARCHAR(200),
    telefone                VARCHAR(20),
    email                   VARCHAR(120),
    cidade_uf               VARCHAR(100),
    site                    VARCHAR(150),
    presidente              VARCHAR(120),
    cpf_presidente          VARCHAR(14),
    rodape_texto            VARCHAR(500),
    rodape_endereco         BOOLEAN      NOT NULL DEFAULT FALSE,
    rodape_telefone         BOOLEAN      NOT NULL DEFAULT FALSE,
    rodape_email            BOOLEAN      NOT NULL DEFAULT FALSE,
    rodape_site             BOOLEAN      NOT NULL DEFAULT FALSE,
    rodape_mostrar_pagina   BOOLEAN      NOT NULL DEFAULT FALSE,
    logo_arquivo_id         BIGINT,      -- FK criada depois da tabela arquivo
    ativo                   BOOLEAN      NOT NULL DEFAULT TRUE,
    criado_em               TIMESTAMPTZ  NOT NULL DEFAULT now(),
    atualizado_em           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_unidade_pai CHECK ((tipo = 'NACIONAL') = (unidade_pai_id IS NULL))
);
CREATE INDEX ix_unidade_pai ON acesso.unidade (unidade_pai_id);
CREATE INDEX ix_unidade_caminho ON acesso.unidade (caminho varchar_pattern_ops);

-- ---------------------------------------------------------------------
-- 2. ACESSO: cargos, permissões, matriz global e ajuste por unidade
-- ---------------------------------------------------------------------
CREATE TABLE acesso.cargo (
    id      SMALLINT    PRIMARY KEY,
    codigo  VARCHAR(40) NOT NULL UNIQUE,
    nome    VARCHAR(60) NOT NULL,
    -- Quanto menor, mais alto na hierarquia. Só se cria/gerencia cargo de nível maior.
    nivel   SMALLINT    NOT NULL
);

CREATE TABLE acesso.permissao (
    id        SMALLINT     PRIMARY KEY,
    codigo    VARCHAR(60)  NOT NULL UNIQUE,
    modulo    VARCHAR(40)  NOT NULL,
    descricao VARCHAR(150) NOT NULL
);

-- Matriz padrão, válida para todas as unidades.
CREATE TABLE acesso.cargo_permissao (
    cargo_id     SMALLINT NOT NULL REFERENCES acesso.cargo (id),
    permissao_id SMALLINT NOT NULL REFERENCES acesso.permissao (id),
    PRIMARY KEY (cargo_id, permissao_id)
);

-- Ajuste da matriz feito por uma unidade para os seus cargos.
-- concedida = TRUE acrescenta, FALSE retira; sem linha, vale a matriz padrão.
CREATE TABLE acesso.unidade_cargo_permissao (
    unidade_id   BIGINT   NOT NULL REFERENCES acesso.unidade (id),
    cargo_id     SMALLINT NOT NULL REFERENCES acesso.cargo (id),
    permissao_id SMALLINT NOT NULL REFERENCES acesso.permissao (id),
    concedida    BOOLEAN  NOT NULL,
    PRIMARY KEY (unidade_id, cargo_id, permissao_id)
);

CREATE TABLE acesso.usuario (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    login            VARCHAR(50)  NOT NULL,
    senha_hash       VARCHAR(100) NOT NULL,
    nome             VARCHAR(60)  NOT NULL,
    sobrenome        VARCHAR(100) NOT NULL,
    telefone         VARCHAR(20),
    email            VARCHAR(120),
    data_nascimento  DATE,
    cargo_id         SMALLINT     NOT NULL REFERENCES acesso.cargo (id),
    unidade_id       BIGINT       NOT NULL REFERENCES acesso.unidade (id),
    ativo            BOOLEAN      NOT NULL DEFAULT TRUE,
    trocar_senha     BOOLEAN      NOT NULL DEFAULT TRUE,
    criado_por_id    BIGINT       REFERENCES acesso.usuario (id),
    ultimo_acesso_em TIMESTAMPTZ,
    criado_em        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    atualizado_em    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_usuario_login ON acesso.usuario (lower(login));
CREATE INDEX ix_usuario_unidade ON acesso.usuario (unidade_id);

CREATE TABLE acesso.token_renovacao (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id  BIGINT      NOT NULL REFERENCES acesso.usuario (id) ON DELETE CASCADE,
    token_hash  CHAR(64)    NOT NULL UNIQUE,
    expira_em   TIMESTAMPTZ NOT NULL,
    revogado    BOOLEAN     NOT NULL DEFAULT FALSE,
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_token_renovacao_usuario ON acesso.token_renovacao (usuario_id);

-- ---------------------------------------------------------------------
-- 3. INFRAESTRUTURA: arquivos (S3), histórico, numeração
-- ---------------------------------------------------------------------
CREATE TABLE sistema.arquivo (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    unidade_id      BIGINT       NOT NULL REFERENCES acesso.unidade (id),
    chave_s3        VARCHAR(300) NOT NULL UNIQUE,
    nome_original   VARCHAR(255) NOT NULL,
    tipo_conteudo   VARCHAR(100) NOT NULL,
    tamanho_bytes   BIGINT       NOT NULL CHECK (tamanho_bytes > 0),
    categoria       VARCHAR(40)  NOT NULL,
    enviado_por_id  BIGINT       REFERENCES acesso.usuario (id),
    criado_em       TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ix_arquivo_unidade ON sistema.arquivo (unidade_id);

ALTER TABLE acesso.unidade
    ADD CONSTRAINT fk_unidade_logo FOREIGN KEY (logo_arquivo_id) REFERENCES sistema.arquivo (id) ON DELETE SET NULL;

-- Tudo o que foi feito no sistema (auditoria exibida na tela Histórico).
CREATE TABLE sistema.historico (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    unidade_id  BIGINT       NOT NULL REFERENCES acesso.unidade (id),
    usuario_id  BIGINT       REFERENCES acesso.usuario (id),
    modulo      VARCHAR(30)  NOT NULL,
    acao        VARCHAR(30)  NOT NULL,
    descricao   VARCHAR(500) NOT NULL,
    ref_tipo    VARCHAR(30),
    ref_id      BIGINT,
    criado_em   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ix_historico_unidade_data ON sistema.historico (unidade_id, criado_em DESC);
CREATE INDEX ix_historico_ref ON sistema.historico (ref_tipo, ref_id);

-- Sequências por unidade: códigos (TAR-0001, REC-0001…) usam ano = 0;
-- a numeração do Gerador (Ofício nº 001/2026) usa o ano.
CREATE TABLE sistema.numeracao (
    unidade_id     BIGINT      NOT NULL REFERENCES acesso.unidade (id),
    serie          VARCHAR(60) NOT NULL,
    ano            SMALLINT    NOT NULL,
    ultimo_numero  INTEGER     NOT NULL DEFAULT 0,
    PRIMARY KEY (unidade_id, serie, ano)
);

-- Vínculos livres entre registros (tarefa ↔ execução ↔ documento ↔ empresa).
-- O par é gravado sempre na mesma ordem (menor tipo/id primeiro) para não duplicar.
CREATE TABLE sistema.vinculo_registro (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    unidade_id    BIGINT      NOT NULL REFERENCES acesso.unidade (id),
    origem_tipo   VARCHAR(15) NOT NULL CHECK (origem_tipo IN ('EXECUCAO','EMPRESA','DOCUMENTO','TAREFA')),
    origem_id     BIGINT      NOT NULL,
    destino_tipo  VARCHAR(15) NOT NULL CHECK (destino_tipo IN ('EXECUCAO','EMPRESA','DOCUMENTO','TAREFA')),
    destino_id    BIGINT      NOT NULL,
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_vinculo UNIQUE (origem_tipo, origem_id, destino_tipo, destino_id)
);
CREATE INDEX ix_vinculo_origem ON sistema.vinculo_registro (origem_tipo, origem_id);
CREATE INDEX ix_vinculo_destino ON sistema.vinculo_registro (destino_tipo, destino_id);

-- ---------------------------------------------------------------------
-- 4. CHAT (sempre entre duas pessoas da mesma unidade)
-- ---------------------------------------------------------------------
CREATE TABLE chat.conversa (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    unidade_id          BIGINT      NOT NULL REFERENCES acesso.unidade (id),
    usuario_a_id        BIGINT      NOT NULL REFERENCES acesso.usuario (id),
    usuario_b_id        BIGINT      NOT NULL REFERENCES acesso.usuario (id),
    ultima_mensagem_em  TIMESTAMPTZ,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_conversa_par CHECK (usuario_a_id < usuario_b_id),
    CONSTRAINT uq_conversa_par UNIQUE (usuario_a_id, usuario_b_id)
);
CREATE INDEX ix_conversa_usuario_b ON chat.conversa (usuario_b_id);

CREATE TABLE chat.mensagem (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    conversa_id   BIGINT        NOT NULL REFERENCES chat.conversa (id) ON DELETE CASCADE,
    remetente_id  BIGINT        NOT NULL REFERENCES acesso.usuario (id),
    texto         VARCHAR(2000) NOT NULL,
    enviada_em    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    lida_em       TIMESTAMPTZ
);
CREATE INDEX ix_mensagem_conversa_data ON chat.mensagem (conversa_id, enviada_em DESC);

-- ---------------------------------------------------------------------
-- 5. SECRETARIA: tarefas e rotinas
-- ---------------------------------------------------------------------
CREATE TABLE secretaria.tarefa (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    unidade_id              BIGINT        NOT NULL REFERENCES acesso.unidade (id),
    codigo                  VARCHAR(12)   NOT NULL,
    titulo                  VARCHAR(200)  NOT NULL,
    descricao               VARCHAR(2000),
    responsavel             VARCHAR(120),
    categoria               VARCHAR(60),
    prioridade              VARCHAR(10)   NOT NULL DEFAULT 'MEDIA' CHECK (prioridade IN ('BAIXA','MEDIA','ALTA','URGENTE')),
    status                  VARCHAR(15)   NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE','EM_ANDAMENTO','AGUARDANDO','CONCLUIDA','CANCELADA')),
    prazo                   DATE,
    horario                 TIME,
    data_conclusao          DATE,
    -- Rotina: frequência NULL = tarefa de uma vez só
    recorrencia_frequencia  VARCHAR(10)   CHECK (recorrencia_frequencia IN ('DIARIA','SEMANAL','MENSAL','ANUAL')),
    recorrencia_dia_semana  SMALLINT      CHECK (recorrencia_dia_semana BETWEEN 0 AND 6),
    recorrencia_dia_mes     SMALLINT      CHECK (recorrencia_dia_mes BETWEEN 1 AND 31),
    recorrencia_proxima     DATE,
    ultima_ocorrencia       DATE,
    ultima_conclusao        DATE,
    criado_por_id           BIGINT        REFERENCES acesso.usuario (id),
    criado_em               TIMESTAMPTZ   NOT NULL DEFAULT now(),
    atualizado_em           TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT uq_tarefa_codigo UNIQUE (unidade_id, codigo)
);
CREATE INDEX ix_tarefa_unidade_status ON secretaria.tarefa (unidade_id, status);
CREATE INDEX ix_tarefa_unidade_prazo ON secretaria.tarefa (unidade_id, prazo);

CREATE TABLE secretaria.subtarefa (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tarefa_id  BIGINT       NOT NULL REFERENCES secretaria.tarefa (id) ON DELETE CASCADE,
    texto      VARCHAR(200) NOT NULL,
    feita      BOOLEAN      NOT NULL DEFAULT FALSE,
    ordem      SMALLINT     NOT NULL DEFAULT 0
);
CREATE INDEX ix_subtarefa_tarefa ON secretaria.subtarefa (tarefa_id);

-- ---------------------------------------------------------------------
-- 6. AGENDA
-- ---------------------------------------------------------------------
CREATE TABLE agenda.evento_serie (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    unidade_id   BIGINT      NOT NULL REFERENCES acesso.unidade (id),
    frequencia   VARCHAR(10) NOT NULL CHECK (frequencia IN ('DIARIA','SEMANAL','MENSAL','ANUAL')),
    repetir_ate  DATE        NOT NULL
);

CREATE TABLE agenda.evento (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    unidade_id       BIGINT        NOT NULL REFERENCES acesso.unidade (id),
    titulo           VARCHAR(200)  NOT NULL,
    tipo             VARCHAR(15)   NOT NULL DEFAULT 'COMPROMISSO' CHECK (tipo IN ('REUNIAO','ATENDIMENTO','COMPROMISSO','EVENTO','VISITA','OUTRO')),
    prioridade       VARCHAR(10)   NOT NULL DEFAULT 'MEDIA' CHECK (prioridade IN ('BAIXA','MEDIA','ALTA','URGENTE')),
    data             DATE          NOT NULL,
    horario_inicio   TIME,
    horario_fim      TIME,
    local            VARCHAR(150),
    responsavel      VARCHAR(120),
    participantes    VARCHAR(500),
    descricao        VARCHAR(2000),
    concluido        BOOLEAN       NOT NULL DEFAULT FALSE,
    concluido_em     TIMESTAMPTZ,
    tarefa_id        BIGINT        REFERENCES secretaria.tarefa (id) ON DELETE SET NULL,
    serie_id         BIGINT        REFERENCES agenda.evento_serie (id) ON DELETE SET NULL,
    criado_por_id    BIGINT        REFERENCES acesso.usuario (id),
    criado_em        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    atualizado_em    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT ck_evento_horario CHECK (horario_fim IS NULL OR horario_inicio IS NULL OR horario_fim >= horario_inicio)
);
CREATE INDEX ix_evento_unidade_data ON agenda.evento (unidade_id, data);
CREATE INDEX ix_evento_serie ON agenda.evento (serie_id);

-- ---------------------------------------------------------------------
-- 7. DOCUMENTOS DA INSTITUIÇÃO (com validade e versões)
-- ---------------------------------------------------------------------
CREATE TABLE documentos.documento (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    unidade_id       BIGINT        NOT NULL REFERENCES acesso.unidade (id),
    codigo           VARCHAR(12)   NOT NULL,
    nome             VARCHAR(200)  NOT NULL,
    categoria        VARCHAR(40)   NOT NULL DEFAULT 'Certidão',
    -- Exigência documental dos projetos que este documento atende (CNPJ, Estatuto, FGTS…)
    exigencia_apae   VARCHAR(40),
    numero           VARCHAR(60),
    orgao            VARCHAR(150),
    responsavel      VARCHAR(120),
    data_emissao     DATE,
    data_validade    DATE,
    local_guardado   VARCHAR(200),
    tags             VARCHAR(200),
    descricao        VARCHAR(2000),
    observacoes      VARCHAR(2000),
    arquivo_id       BIGINT        REFERENCES sistema.arquivo (id) ON DELETE SET NULL,
    criado_por_id    BIGINT        REFERENCES acesso.usuario (id),
    criado_em        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    atualizado_em    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT uq_documento_codigo UNIQUE (unidade_id, codigo),
    CONSTRAINT ck_documento_datas CHECK (data_validade IS NULL OR data_emissao IS NULL OR data_validade >= data_emissao)
);
CREATE INDEX ix_documento_unidade_validade ON documentos.documento (unidade_id, data_validade);
CREATE INDEX ix_documento_exigencia ON documentos.documento (unidade_id, exigencia_apae) WHERE exigencia_apae IS NOT NULL;

-- Versão anterior guardada ao renovar.
CREATE TABLE documentos.documento_versao (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    documento_id     BIGINT      NOT NULL REFERENCES documentos.documento (id) ON DELETE CASCADE,
    numero           VARCHAR(60),
    data_emissao     DATE,
    data_validade    DATE,
    arquivo_id       BIGINT      REFERENCES sistema.arquivo (id) ON DELETE SET NULL,
    substituida_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_documento_versao_documento ON documentos.documento_versao (documento_id);

-- ---------------------------------------------------------------------
-- 8. EMPRESAS (fornecedores), cadastro único por unidade
-- ---------------------------------------------------------------------
CREATE TABLE empresas.empresa (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    unidade_id         BIGINT        NOT NULL REFERENCES acesso.unidade (id),
    razao_social       VARCHAR(200)  NOT NULL,
    nome_fantasia      VARCHAR(200),
    cnpj               VARCHAR(18),
    telefone           VARCHAR(40),
    email              VARCHAR(120),
    endereco           VARCHAR(250),
    municipio          VARCHAR(100),
    uf                 CHAR(2),
    representante      VARCHAR(120),
    cpf_representante  VARCHAR(14),
    observacao         VARCHAR(1000),
    criado_em          TIMESTAMPTZ   NOT NULL DEFAULT now(),
    atualizado_em      TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_empresa_cnpj ON empresas.empresa (unidade_id, cnpj) WHERE cnpj IS NOT NULL;
CREATE UNIQUE INDEX ux_empresa_razao ON empresas.empresa (unidade_id, lower(razao_social));

CREATE TABLE empresas.empresa_documento (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    empresa_id      BIGINT       NOT NULL REFERENCES empresas.empresa (id) ON DELETE CASCADE,
    nome            VARCHAR(60)  NOT NULL,
    data_validade   DATE,
    observacao      VARCHAR(500),
    arquivo_id      BIGINT       NOT NULL REFERENCES sistema.arquivo (id),
    criado_em       TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ix_empresa_documento_empresa ON empresas.empresa_documento (empresa_id);

-- ---------------------------------------------------------------------
-- 9. PROJETOS: recurso (dinheiro que entrou) → execuções (onde foi aplicado)
-- ---------------------------------------------------------------------
CREATE TABLE projetos.recurso (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    unidade_id        BIGINT         NOT NULL REFERENCES acesso.unidade (id),
    codigo            VARCHAR(12)    NOT NULL,
    nome              VARCHAR(150)   NOT NULL,
    fonte_recurso     VARCHAR(120)   NOT NULL,
    orgao_repassador  VARCHAR(150),
    convenio          VARCHAR(100),
    data_recebimento  DATE,
    data_inicio       DATE           NOT NULL,
    data_fim          DATE           NOT NULL,
    valor_recebido    NUMERIC(14,2)  NOT NULL CHECK (valor_recebido >= 0),
    conta_bancaria    VARCHAR(100),
    responsavel       VARCHAR(120),
    status            VARCHAR(25)    NOT NULL DEFAULT 'AGUARDANDO_EXECUCAO'
                      CHECK (status IN ('AGUARDANDO_EXECUCAO','EM_EXECUCAO','PARCIALMENTE_DISTRIBUIDO','COM_PENDENCIAS','ENCERRADO')),
    finalidade        VARCHAR(2000),
    observacoes       VARCHAR(2000),
    arquivado         BOOLEAN        NOT NULL DEFAULT FALSE,
    criado_por_id     BIGINT         REFERENCES acesso.usuario (id),
    criado_em         TIMESTAMPTZ    NOT NULL DEFAULT now(),
    atualizado_em     TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT uq_recurso_codigo UNIQUE (unidade_id, codigo),
    CONSTRAINT ck_recurso_periodo CHECK (data_fim >= data_inicio)
);
CREATE INDEX ix_recurso_unidade ON projetos.recurso (unidade_id, arquivado);

CREATE TABLE projetos.recurso_documento (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    recurso_id   BIGINT       NOT NULL REFERENCES projetos.recurso (id) ON DELETE CASCADE,
    nome         VARCHAR(60)  NOT NULL,
    observacao   VARCHAR(500),
    data         DATE         NOT NULL DEFAULT CURRENT_DATE,
    arquivo_id   BIGINT       NOT NULL REFERENCES sistema.arquivo (id)
);
CREATE INDEX ix_recurso_documento_recurso ON projetos.recurso_documento (recurso_id);

CREATE TABLE projetos.execucao (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    unidade_id         BIGINT         NOT NULL REFERENCES acesso.unidade (id),
    recurso_id         BIGINT         NOT NULL REFERENCES projetos.recurso (id),
    codigo             VARCHAR(12)    NOT NULL,
    nome               VARCHAR(150)   NOT NULL,
    fonte_recurso      VARCHAR(120)   NOT NULL,
    convenio           VARCHAR(100),
    data_inicio        DATE           NOT NULL,
    data_fim           DATE           NOT NULL,
    valor_planejado    NUMERIC(14,2)  NOT NULL CHECK (valor_planejado >= 0),
    responsavel        VARCHAR(120),
    status             VARCHAR(15)    NOT NULL DEFAULT 'PLANEJAMENTO'
                       CHECK (status IN ('PLANEJAMENTO','EM_EXECUCAO','CONCLUIDO','SUSPENSO','CANCELADO')),
    objetivo           VARCHAR(2000),
    observacoes        VARCHAR(2000),
    plano_descricao    VARCHAR(4000),
    plano_arquivo_id   BIGINT         REFERENCES sistema.arquivo (id) ON DELETE SET NULL,
    criado_por_id      BIGINT         REFERENCES acesso.usuario (id),
    criado_em          TIMESTAMPTZ    NOT NULL DEFAULT now(),
    atualizado_em      TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT uq_execucao_codigo UNIQUE (unidade_id, codigo),
    CONSTRAINT ck_execucao_periodo CHECK (data_fim >= data_inicio)
);
CREATE INDEX ix_execucao_recurso ON projetos.execucao (recurso_id);
CREATE INDEX ix_execucao_unidade_status ON projetos.execucao (unidade_id, status);

-- Histórico financeiro do recurso: nunca é alterado, só acrescentado.
CREATE TABLE projetos.movimentacao_recurso (
    id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    recurso_id            BIGINT         NOT NULL REFERENCES projetos.recurso (id) ON DELETE CASCADE,
    tipo                  VARCHAR(15)    NOT NULL CHECK (tipo IN ('ENTRADA','DISTRIBUICAO','PAGAMENTO','TRANSFERENCIA','AJUSTE')),
    valor                 NUMERIC(14,2)  NOT NULL,
    descricao             VARCHAR(500),
    execucao_origem_id    BIGINT         REFERENCES projetos.execucao (id) ON DELETE SET NULL,
    execucao_destino_id   BIGINT         REFERENCES projetos.execucao (id) ON DELETE SET NULL,
    data                  DATE           NOT NULL DEFAULT CURRENT_DATE,
    usuario_id            BIGINT         REFERENCES acesso.usuario (id),
    criado_em             TIMESTAMPTZ    NOT NULL DEFAULT now()
);
CREATE INDEX ix_movimentacao_recurso ON projetos.movimentacao_recurso (recurso_id, criado_em DESC);

CREATE TABLE projetos.execucao_empresa (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    execucao_id   BIGINT      NOT NULL REFERENCES projetos.execucao (id) ON DELETE CASCADE,
    empresa_id    BIGINT      NOT NULL REFERENCES empresas.empresa (id),
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_execucao_empresa UNIQUE (execucao_id, empresa_id)
);
CREATE INDEX ix_execucao_empresa_empresa ON projetos.execucao_empresa (empresa_id);

CREATE TABLE projetos.cotacao (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    execucao_id   BIGINT         NOT NULL REFERENCES projetos.execucao (id) ON DELETE CASCADE,
    empresa_id    BIGINT         NOT NULL REFERENCES empresas.empresa (id),
    data          DATE,
    valor_total   NUMERIC(14,2)  NOT NULL CHECK (valor_total >= 0),
    observacao    VARCHAR(500),
    vencedora     BOOLEAN        NOT NULL DEFAULT FALSE,
    arquivo_id    BIGINT         NOT NULL REFERENCES sistema.arquivo (id),
    criado_em     TIMESTAMPTZ    NOT NULL DEFAULT now()
);
CREATE INDEX ix_cotacao_execucao ON projetos.cotacao (execucao_id);
CREATE UNIQUE INDEX ux_cotacao_vencedora ON projetos.cotacao (execucao_id) WHERE vencedora;

CREATE TABLE projetos.cotacao_item (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cotacao_id       BIGINT         NOT NULL REFERENCES projetos.cotacao (id) ON DELETE CASCADE,
    descricao        VARCHAR(200)   NOT NULL,
    quantidade       INTEGER        NOT NULL CHECK (quantidade > 0),
    valor_unitario   NUMERIC(14,2)  NOT NULL CHECK (valor_unitario >= 0)
);
CREATE INDEX ix_cotacao_item_cotacao ON projetos.cotacao_item (cotacao_id);

CREATE TABLE projetos.ordem_compra (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    execucao_id   BIGINT         NOT NULL REFERENCES projetos.execucao (id) ON DELETE CASCADE,
    cotacao_id    BIGINT         NOT NULL REFERENCES projetos.cotacao (id),
    numero        VARCHAR(40)    NOT NULL,
    data          DATE,
    valor         NUMERIC(14,2)  NOT NULL CHECK (valor >= 0),
    status        VARCHAR(10)    NOT NULL DEFAULT 'RASCUNHO' CHECK (status IN ('RASCUNHO','EMITIDA','RECEBIDA','CANCELADA')),
    arquivo_id    BIGINT         NOT NULL REFERENCES sistema.arquivo (id),
    criado_em     TIMESTAMPTZ    NOT NULL DEFAULT now()
);
CREATE INDEX ix_ordem_compra_execucao ON projetos.ordem_compra (execucao_id);

CREATE TABLE projetos.execucao_documento (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    execucao_id   BIGINT       NOT NULL REFERENCES projetos.execucao (id) ON DELETE CASCADE,
    nome          VARCHAR(150) NOT NULL,
    categoria     VARCHAR(15)  NOT NULL DEFAULT 'OUTRO' CHECK (categoria IN ('NOTA_FISCAL','COMPROVANTE','RELATORIO','DECLARACAO','OUTRO')),
    data          DATE,
    arquivo_id    BIGINT       NOT NULL REFERENCES sistema.arquivo (id),
    criado_em     TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ix_execucao_documento_execucao ON projetos.execucao_documento (execucao_id);

CREATE TABLE projetos.pagamento (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    execucao_id   BIGINT         NOT NULL REFERENCES projetos.execucao (id) ON DELETE CASCADE,
    empresa_id    BIGINT         REFERENCES empresas.empresa (id) ON DELETE SET NULL,
    fornecedor    VARCHAR(200),
    data          DATE,
    valor         NUMERIC(14,2)  NOT NULL CHECK (valor > 0),
    forma         VARCHAR(30),
    arquivo_id    BIGINT         NOT NULL REFERENCES sistema.arquivo (id),
    criado_em     TIMESTAMPTZ    NOT NULL DEFAULT now()
);
CREATE INDEX ix_pagamento_execucao ON projetos.pagamento (execucao_id);

CREATE TABLE projetos.execucao_pendencia (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    execucao_id   BIGINT        NOT NULL REFERENCES projetos.execucao (id) ON DELETE CASCADE,
    titulo        VARCHAR(200)  NOT NULL,
    prioridade    VARCHAR(10)   NOT NULL DEFAULT 'MEDIA' CHECK (prioridade IN ('BAIXA','MEDIA','ALTA','URGENTE')),
    descricao     VARCHAR(1000),
    concluida     BOOLEAN       NOT NULL DEFAULT FALSE,
    criado_em     TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX ix_execucao_pendencia_execucao ON projetos.execucao_pendencia (execucao_id);

-- ---------------------------------------------------------------------
-- 10. GERADOR DE DOCUMENTOS
-- ---------------------------------------------------------------------
-- unidade_id NULL = modelo padrão do sistema, visível a todas as unidades.
CREATE TABLE gerador.modelo_documento (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    unidade_id     BIGINT          REFERENCES acesso.unidade (id),
    nome           VARCHAR(100)    NOT NULL,
    titulo         VARCHAR(150),
    serie          VARCHAR(60),
    texto          VARCHAR(100000) NOT NULL,
    formato        VARCHAR(5)      NOT NULL DEFAULT 'HTML' CHECK (formato IN ('HTML','TEXTO')),
    espacamento    VARCHAR(4),
    criado_em      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    atualizado_em  TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX ix_modelo_documento_unidade ON gerador.modelo_documento (unidade_id);

CREATE TABLE gerador.documento_gerado (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    unidade_id       BIGINT          NOT NULL REFERENCES acesso.unidade (id),
    modelo_id        BIGINT          REFERENCES gerador.modelo_documento (id) ON DELETE SET NULL,
    modelo_nome      VARCHAR(100)    NOT NULL,
    serie            VARCHAR(60),
    titulo           VARCHAR(150),
    numero           VARCHAR(20),
    -- Cópia do texto do modelo no momento da geração: editar/excluir o modelo não muda o documento.
    texto_snapshot   VARCHAR(100000) NOT NULL,
    formato          VARCHAR(5)      NOT NULL CHECK (formato IN ('HTML','TEXTO')),
    espacamento      VARCHAR(4),
    data_geracao     DATE            NOT NULL DEFAULT CURRENT_DATE,
    versao           INTEGER         NOT NULL DEFAULT 1,
    vinculo_tipo     VARCHAR(15)     CHECK (vinculo_tipo IN ('EMPRESA','EXECUCAO','ALUNO','ATENDIMENTO','DOCUMENTO','TAREFA')),
    vinculo_id       BIGINT,
    vinculo_rotulo   VARCHAR(200),
    -- Mapas campo → valor preenchidos no formulário (texto, nunca arquivo)
    valores          JSONB           NOT NULL DEFAULT '{}'::jsonb,
    contexto         JSONB           NOT NULL DEFAULT '{}'::jsonb,
    assinaturas      JSONB           NOT NULL DEFAULT '[]'::jsonb,
    criado_por_id    BIGINT          REFERENCES acesso.usuario (id),
    criado_em        TIMESTAMPTZ     NOT NULL DEFAULT now(),
    atualizado_em    TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX ix_documento_gerado_unidade_data ON gerador.documento_gerado (unidade_id, data_geracao DESC);

CREATE TABLE gerador.documento_gerado_versao (
    id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    documento_gerado_id   BIGINT          NOT NULL REFERENCES gerador.documento_gerado (id) ON DELETE CASCADE,
    versao                INTEGER         NOT NULL,
    valores               JSONB           NOT NULL,
    contexto              JSONB           NOT NULL,
    assinaturas           JSONB           NOT NULL,
    texto_snapshot        VARCHAR(100000) NOT NULL,
    salvo_em              TIMESTAMPTZ     NOT NULL,
    CONSTRAINT uq_documento_gerado_versao UNIQUE (documento_gerado_id, versao)
);

CREATE TABLE gerador.documento_gerado_anexo (
    documento_gerado_id  BIGINT NOT NULL REFERENCES gerador.documento_gerado (id) ON DELETE CASCADE,
    arquivo_id           BIGINT NOT NULL REFERENCES sistema.arquivo (id),
    PRIMARY KEY (documento_gerado_id, arquivo_id)
);

-- ---------------------------------------------------------------------
-- 11. ATENDIMENTOS
-- ---------------------------------------------------------------------
CREATE TABLE atendimentos.aluno (
    id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    unidade_id           BIGINT       NOT NULL REFERENCES acesso.unidade (id),
    nome                 VARCHAR(150) NOT NULL,
    -- Data da última falta já tratada com a família (o aviso só volta com falta nova)
    faltas_contato_ate   DATE,
    criado_em            TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_aluno_nome ON atendimentos.aluno (unidade_id, lower(nome));

CREATE TABLE atendimentos.profissional (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    unidade_id   BIGINT       NOT NULL REFERENCES acesso.unidade (id),
    nome         VARCHAR(150) NOT NULL,
    usuario_id   BIGINT       REFERENCES acesso.usuario (id) ON DELETE SET NULL,
    criado_em    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_profissional_nome ON atendimentos.profissional (unidade_id, lower(nome));

CREATE TABLE atendimentos.atendimento (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    unidade_id          BIGINT       NOT NULL REFERENCES acesso.unidade (id),
    aluno_id            BIGINT       NOT NULL REFERENCES atendimentos.aluno (id),
    profissional_id     BIGINT       NOT NULL REFERENCES atendimentos.profissional (id),
    data                DATE         NOT NULL,
    horario             TIME         NOT NULL,
    observacao          VARCHAR(500),
    presenca            VARCHAR(15)  NOT NULL DEFAULT 'NAO_INFORMADO' CHECK (presenca IN ('NAO_INFORMADO','VEIO','FALTOU')),
    falta_motivo        VARCHAR(30),
    falta_observacao    VARCHAR(500),
    -- Original remarcado: fica no histórico e não conta nos totais; a cópia aponta para ele.
    remarcado           BOOLEAN      NOT NULL DEFAULT FALSE,
    remarcado_motivo    VARCHAR(200),
    remarcado_de_id     BIGINT       REFERENCES atendimentos.atendimento (id) ON DELETE SET NULL,
    serie_id            UUID,
    criado_por_id       BIGINT       REFERENCES acesso.usuario (id),
    criado_em           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    atualizado_em       TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ix_atendimento_unidade_data ON atendimentos.atendimento (unidade_id, data);
CREATE INDEX ix_atendimento_aluno ON atendimentos.atendimento (aluno_id, data);
CREATE INDEX ix_atendimento_profissional ON atendimentos.atendimento (profissional_id, data);
CREATE INDEX ix_atendimento_serie ON atendimentos.atendimento (serie_id) WHERE serie_id IS NOT NULL;
CREATE UNIQUE INDEX ux_atendimento_remarcado_de ON atendimentos.atendimento (remarcado_de_id) WHERE remarcado_de_id IS NOT NULL;

-- =====================================================================
-- DADOS INICIAIS
-- =====================================================================

-- Cargos (nível: menor = mais alto)
INSERT INTO acesso.cargo (id, codigo, nome, nivel) VALUES
    (1, 'ADMINISTRADOR_SISTEMA', 'Administrador do sistema', 0),
    (2, 'PRESIDENTE',            'Presidente',               1),
    (3, 'DIRETOR',               'Diretor',                  2),
    (4, 'ADMINISTRADOR',         'Administrador',            3),
    (5, 'SECRETARIO',            'Secretário',               4),
    (6, 'TESOUREIRO',            'Tesoureiro',               5),
    (7, 'PROFESSOR',             'Professor',                6),
    (8, 'PROFISSIONAL',          'Profissional',             6);

-- Permissões (ESCREVER = criar, editar e excluir)
INSERT INTO acesso.permissao (id, codigo, modulo, descricao) VALUES
    ( 1, 'AGENDA_LER',            'AGENDA',       'Ver a agenda'),
    ( 2, 'AGENDA_ESCREVER',       'AGENDA',       'Criar, editar e excluir eventos'),
    ( 3, 'TAREFA_LER',            'SECRETARIA',   'Ver tarefas e o Kanban'),
    ( 4, 'TAREFA_ESCREVER',       'SECRETARIA',   'Criar, editar, concluir e excluir tarefas'),
    ( 5, 'ATENDIMENTO_LER',       'ATENDIMENTOS', 'Ver atendimentos, alunos e profissionais'),
    ( 6, 'ATENDIMENTO_ESCREVER',  'ATENDIMENTOS', 'Registrar atendimentos e presenças'),
    ( 7, 'PROJETO_LER',           'PROJETOS',     'Ver recursos e execuções'),
    ( 8, 'PROJETO_ESCREVER',      'PROJETOS',     'Gerir recursos, execuções, compras e pagamentos'),
    ( 9, 'DOCUMENTO_LER',         'DOCUMENTOS',   'Ver documentos da instituição'),
    (10, 'DOCUMENTO_ESCREVER',    'DOCUMENTOS',   'Cadastrar, renovar e excluir documentos'),
    (11, 'GERADOR_LER',           'GERADOR',      'Ver documentos gerados e modelos'),
    (12, 'GERADOR_ESCREVER',      'GERADOR',      'Gerar documentos e editar modelos'),
    (13, 'EMPRESA_LER',           'EMPRESAS',     'Ver empresas'),
    (14, 'EMPRESA_ESCREVER',      'EMPRESAS',     'Cadastrar e editar empresas'),
    (15, 'HISTORICO_LER',         'HISTORICO',    'Ver o histórico do sistema'),
    (16, 'RELATORIO_LER',         'RELATORIOS',   'Gerar relatórios'),
    (17, 'USUARIO_LER',           'USUARIOS',     'Ver usuários'),
    (18, 'USUARIO_ESCREVER',      'USUARIOS',     'Criar e editar usuários de cargo inferior'),
    (19, 'UNIDADE_LER',           'UNIDADES',     'Ver unidades subordinadas'),
    (20, 'UNIDADE_ESCREVER',      'UNIDADES',     'Criar e editar unidades subordinadas'),
    (21, 'PERMISSAO_LER',         'PERMISSOES',   'Ver a matriz de permissões da unidade'),
    (22, 'PERMISSAO_ESCREVER',    'PERMISSOES',   'Ajustar a matriz de permissões da unidade'),
    (23, 'INSTITUICAO_ESCREVER',  'UNIDADES',     'Editar os dados institucionais (cabeçalho) da própria unidade'),
    (24, 'CHAT_USAR',             'CHAT',         'Conversar pelo chat');

-- Matriz padrão (aprovada). O administrador do sistema tem todas as permissões pelo código.
INSERT INTO acesso.cargo_permissao (cargo_id, permissao_id)
SELECT c.id, p.id
  FROM acesso.cargo c
  JOIN acesso.permissao p ON p.codigo = ANY (CASE c.codigo
    WHEN 'PRESIDENTE' THEN ARRAY['AGENDA_LER','AGENDA_ESCREVER','TAREFA_LER','TAREFA_ESCREVER','ATENDIMENTO_LER','ATENDIMENTO_ESCREVER',
                                 'PROJETO_LER','PROJETO_ESCREVER','DOCUMENTO_LER','DOCUMENTO_ESCREVER','GERADOR_LER','GERADOR_ESCREVER',
                                 'EMPRESA_LER','EMPRESA_ESCREVER','HISTORICO_LER','RELATORIO_LER','USUARIO_LER','USUARIO_ESCREVER',
                                 'UNIDADE_LER','UNIDADE_ESCREVER','PERMISSAO_LER','PERMISSAO_ESCREVER','INSTITUICAO_ESCREVER','CHAT_USAR']
    WHEN 'DIRETOR' THEN ARRAY['AGENDA_LER','AGENDA_ESCREVER','TAREFA_LER','TAREFA_ESCREVER','ATENDIMENTO_LER','ATENDIMENTO_ESCREVER',
                              'PROJETO_LER','PROJETO_ESCREVER','DOCUMENTO_LER','DOCUMENTO_ESCREVER','GERADOR_LER','GERADOR_ESCREVER',
                              'EMPRESA_LER','EMPRESA_ESCREVER','HISTORICO_LER','RELATORIO_LER','USUARIO_LER','USUARIO_ESCREVER',
                              'UNIDADE_LER','INSTITUICAO_ESCREVER','CHAT_USAR']
    WHEN 'ADMINISTRADOR' THEN ARRAY['AGENDA_LER','AGENDA_ESCREVER','TAREFA_LER','TAREFA_ESCREVER','ATENDIMENTO_LER','ATENDIMENTO_ESCREVER',
                                    'PROJETO_LER','DOCUMENTO_LER','DOCUMENTO_ESCREVER','GERADOR_LER','GERADOR_ESCREVER',
                                    'EMPRESA_LER','EMPRESA_ESCREVER','HISTORICO_LER','RELATORIO_LER','USUARIO_LER','USUARIO_ESCREVER',
                                    'UNIDADE_LER','UNIDADE_ESCREVER','PERMISSAO_LER','PERMISSAO_ESCREVER','INSTITUICAO_ESCREVER','CHAT_USAR']
    WHEN 'SECRETARIO' THEN ARRAY['AGENDA_LER','AGENDA_ESCREVER','TAREFA_LER','TAREFA_ESCREVER','ATENDIMENTO_LER','ATENDIMENTO_ESCREVER',
                                 'PROJETO_LER','DOCUMENTO_LER','DOCUMENTO_ESCREVER','GERADOR_LER','GERADOR_ESCREVER',
                                 'EMPRESA_LER','EMPRESA_ESCREVER','HISTORICO_LER','RELATORIO_LER','CHAT_USAR']
    WHEN 'TESOUREIRO' THEN ARRAY['AGENDA_LER','AGENDA_ESCREVER','TAREFA_LER','PROJETO_LER','PROJETO_ESCREVER',
                                 'DOCUMENTO_LER','GERADOR_LER','EMPRESA_LER','EMPRESA_ESCREVER','HISTORICO_LER','RELATORIO_LER','CHAT_USAR']
    WHEN 'PROFESSOR' THEN ARRAY['AGENDA_LER','ATENDIMENTO_LER','ATENDIMENTO_ESCREVER','CHAT_USAR']
    WHEN 'PROFISSIONAL' THEN ARRAY['AGENDA_LER','ATENDIMENTO_LER','ATENDIMENTO_ESCREVER','CHAT_USAR']
    ELSE ARRAY[]::varchar[]
  END);

-- Unidade raiz
INSERT INTO acesso.unidade (tipo, nome) VALUES ('NACIONAL', 'Federação Nacional das APAEs');
UPDATE acesso.unidade SET caminho = '/' || id || '/' WHERE unidade_pai_id IS NULL;

-- Primeiro acesso: login "admin", senha provisória "Apae@2026" (troca obrigatória no primeiro login).
INSERT INTO acesso.usuario (login, senha_hash, nome, sobrenome, cargo_id, unidade_id, trocar_senha)
SELECT 'admin', '$2a$10$TuR1/aBQwlRzoYagkYriruhTVwEz/nn0xe6KSdrQAw3jQ34WgSxhK', 'Administrador', 'do Sistema', 1, id, TRUE
  FROM acesso.unidade WHERE unidade_pai_id IS NULL;

-- Modelos prontos do Gerador (os mesmos do sistema antigo), visíveis a todas as unidades.
-- {CAMPO} = preenchido pelo sistema · [CAMPO] = preenchido na hora de gerar
INSERT INTO gerador.modelo_documento (unidade_id, nome, titulo, serie, formato, texto) VALUES
(NULL, 'Termo de Apadrinhamento', 'TERMO DE APADRINHAMENTO', NULL, 'TEXTO',
 E'Pelo presente instrumento, a instituição declara que [NOME], portador(a) do CPF [CPF], realizou um apadrinhamento no valor de [VALOR], na data de [DATA].\n\nPor ser verdade, firma-se o presente documento.\n\n[DATA].'),
(NULL, 'Ofício', 'OFÍCIO', 'Ofício', 'TEXTO',
 E'Ofício nº {NUMERO}\n\nAo(À) Senhor(a) [DESTINATARIO]\n[CARGO_DESTINATARIO]\n[ORGAO_DESTINATARIO]\n\nAssunto: [ASSUNTO]\n\nSenhor(a) [DESTINATARIO],\n\n[TEXTO]\n\nSem mais para o momento, colocamo-nos à disposição para os esclarecimentos que se fizerem necessários.\n\nAtenciosamente,\n\n{DATA}'),
(NULL, 'Declaração', 'DECLARAÇÃO', 'Declaração', 'TEXTO',
 E'{NOME_APAE}, inscrita no CNPJ sob o nº {CNPJ_APAE}, com sede em {ENDERECO_APAE}, DECLARA para os devidos fins que [NOME], portador(a) do CPF nº [CPF], [TEXTO].\n\nPor ser expressão da verdade, firmamos a presente declaração.\n\n{DATA}'),
(NULL, 'Memorando', 'MEMORANDO', 'Memorando', 'TEXTO',
 E'Memorando nº {NUMERO}\n\nDe: [SETOR_ORIGEM]\nPara: [SETOR_DESTINO]\nAssunto: [ASSUNTO]\n\n[TEXTO]\n\n{DATA}'),
(NULL, 'Convocação', 'CONVOCAÇÃO', 'Convocação', 'TEXTO',
 E'Convocação nº {NUMERO}\n\n{NOME_APAE}, inscrita no CNPJ sob o nº {CNPJ_APAE}, convoca [CONVOCADOS] para [FINALIDADE], a realizar-se no dia [DATA_EVENTO], às [HORARIO], no(a) [LOCAL].\n\nPauta:\n[PAUTA]\n\nContamos com a presença de todos.\n\n{DATA}'),
(NULL, 'Solicitação', 'SOLICITAÇÃO', 'Solicitação', 'TEXTO',
 E'Solicitação nº {NUMERO}\n\nAo(À) [DESTINATARIO]\n\nAssunto: [ASSUNTO]\n\n{NOME_APAE}, inscrita no CNPJ sob o nº {CNPJ_APAE}, vem por meio deste solicitar [OBJETO].\n\nJustificativa:\n[JUSTIFICATIVA]\n\nNo aguardo de retorno, agradecemos antecipadamente.\n\n{DATA}'),
(NULL, 'Ata', 'ATA DE REUNIÃO', 'Ata', 'TEXTO',
 E'Ata nº {NUMERO}\n\nAos [DIA] dias do mês de [MES] do ano de {ANO}, às [HORARIO], no(a) [LOCAL], reuniram-se os membros de {NOME_APAE} para tratar de [FINALIDADE].\n\nPresentes:\n[PRESENTES]\n\nOrdem do dia:\n[PAUTA]\n\nDeliberações:\n[DELIBERACOES]\n\nNada mais havendo a tratar, foi encerrada a reunião e lavrada a presente ata, que segue assinada pelos presentes.\n\n{DATA}'),
(NULL, 'Termo', 'TERMO', 'Termo', 'TEXTO',
 E'Termo nº {NUMERO}\n\nPelo presente termo, {NOME_APAE}, inscrita no CNPJ sob o nº {CNPJ_APAE}, com sede em {ENDERECO_APAE}, neste ato representada por {PRESIDENTE}, portador(a) do CPF nº {CPF_PRESIDENTE}, e [NOME], portador(a) do CPF nº [CPF], firmam o presente termo de [OBJETO], nos seguintes termos:\n\n[CLAUSULAS]\n\nE por estarem de pleno acordo, firmam o presente termo.\n\n{DATA}'),
(NULL, 'Comunicado', 'COMUNICADO', 'Comunicado', 'TEXTO',
 E'Comunicado nº {NUMERO}\n\n{NOME_APAE} comunica a [DESTINATARIOS] que:\n\n[TEXTO]\n\nPara mais informações, entre em contato pelo telefone {TELEFONE_APAE}.\n\n{DATA}'),
(NULL, 'Recibo', 'RECIBO', 'Recibo', 'TEXTO',
 E'Recibo nº {NUMERO}\n\nRecebemos de [NOME], portador(a) do CPF/CNPJ nº [CPF_CNPJ], a importância de {VALOR} ([VALOR_POR_EXTENSO]), referente a [REFERENTE].\n\nPara clareza, firmamos o presente recibo.\n\n{DATA}'),
(NULL, 'Relatório', 'RELATÓRIO', 'Relatório', 'TEXTO',
 E'Relatório nº {NUMERO}\n\nPeríodo: [PERIODO]\nResponsável: [RESPONSAVEL]\n\n1. OBJETIVO\n[OBJETIVO]\n\n2. ATIVIDADES REALIZADAS\n[ATIVIDADES]\n\n3. RESULTADOS\n[RESULTADOS]\n\n4. CONSIDERAÇÕES FINAIS\n[CONSIDERACOES]\n\n{DATA}'),
(NULL, 'Carta', 'CARTA', NULL, 'TEXTO',
 E'{CIDADE_UF}, {DATA}\n\n[DESTINATARIO]\n[ENDERECO_DESTINATARIO]\n\nPrezado(a) [TRATAMENTO],\n\n[TEXTO]\n\nAtenciosamente,');

COMMIT;

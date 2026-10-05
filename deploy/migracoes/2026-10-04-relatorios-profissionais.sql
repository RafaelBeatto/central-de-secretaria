-- =====================================================================
-- Migração de produção: Relatórios de professores/profissionais (Central de Relatórios).
-- Leva um banco criado com o apae.sql anterior ao commit 03aff71 ao estado atual.
-- Só acrescenta; pode rodar de novo sem duplicar nada.
-- Rodar como dono do banco:  psql -d apae -c "SET ROLE apae;" -f este-arquivo.sql
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS relatorios;

CREATE TABLE IF NOT EXISTS relatorios.relatorio_profissional (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    unidade_id      BIGINT       NOT NULL REFERENCES acesso.unidade (id),
    usuario_id      BIGINT       NOT NULL REFERENCES acesso.usuario (id),
    nome_usuario    VARCHAR(160) NOT NULL,
    cargo_nome      VARCHAR(60)  NOT NULL,
    nome            VARCHAR(150) NOT NULL,
    tipo            VARCHAR(10)  NOT NULL CHECK (tipo IN ('PESSOAL','GERAL')),
    nome_aluno      VARCHAR(150),
    periodo_inicio  DATE         NOT NULL,
    periodo_fim     DATE         NOT NULL,
    arquivo_id      BIGINT       REFERENCES sistema.arquivo (id),
    complemento     VARCHAR(1000),
    status          VARCHAR(10)  NOT NULL DEFAULT 'ENTREGUE' CHECK (status IN ('PENDENTE','ENTREGUE')),
    solicitado_por_id BIGINT     REFERENCES acesso.usuario (id),
    solicitado_em   TIMESTAMPTZ,
    enviado_em      TIMESTAMPTZ,
    CONSTRAINT ck_relatorio_prof_aluno CHECK (tipo <> 'PESSOAL' OR nome_aluno IS NOT NULL),
    CONSTRAINT ck_relatorio_prof_periodo CHECK (periodo_fim >= periodo_inicio),
    CONSTRAINT ck_relatorio_prof_arquivo CHECK (status = 'PENDENTE' OR arquivo_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS ix_relatorio_prof_usuario ON relatorios.relatorio_profissional (usuario_id, periodo_inicio DESC);
CREATE INDEX IF NOT EXISTS ix_relatorio_prof_unidade ON relatorios.relatorio_profissional (unidade_id, periodo_inicio DESC);

INSERT INTO acesso.permissao (id, codigo, modulo, descricao) VALUES
    (25, 'RELATORIO_PROF_ENVIAR', 'RELATORIOS', 'Enviar os próprios relatórios em PDF e ver os que enviou'),
    (26, 'RELATORIO_PROF_LER',    'RELATORIOS', 'Central de Relatórios: ver os relatórios enviados por professores e profissionais'),
    (27, 'RELATORIO_PROF_COBRAR', 'RELATORIOS', 'Central de Relatórios: cobrar um relatório de um professor ou profissional')
ON CONFLICT DO NOTHING;

-- Mesma matriz padrão do apae.sql para as três permissões novas
INSERT INTO acesso.cargo_permissao (cargo_id, permissao_id)
SELECT c.id, p.id
  FROM acesso.cargo c
  JOIN acesso.permissao p ON p.codigo = ANY (CASE c.codigo
    WHEN 'PRESIDENTE'   THEN ARRAY['RELATORIO_PROF_LER','RELATORIO_PROF_COBRAR']
    WHEN 'DIRETOR'      THEN ARRAY['RELATORIO_PROF_LER','RELATORIO_PROF_COBRAR']
    WHEN 'PROFESSOR'    THEN ARRAY['RELATORIO_PROF_ENVIAR']
    WHEN 'PROFISSIONAL' THEN ARRAY['RELATORIO_PROF_ENVIAR']
    ELSE ARRAY[]::varchar[]
  END)
ON CONFLICT DO NOTHING;

COMMIT;

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Button, FormControlLabel, LinearProgress, MenuItem, Stack, Switch, TextField } from '@mui/material';
import { IconPlus } from '@tabler/icons-react';
import Pagina from 'src/components/container/Pagina';
import ListaRecursos from 'src/components/apps/projetos/ListaRecursos';
import TelaRecurso from 'src/components/apps/projetos/TelaRecurso';
import TelaExecucao from 'src/components/apps/projetos/TelaExecucao';
import { FormularioExecucao, FormularioRecurso } from 'src/components/apps/projetos/FormulariosProjeto';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import { useConsulta } from 'src/hooks/useConsulta';
import { usePermissao } from 'src/hooks/usePermissao';
import { PERMISSOES } from 'src/constantes/permissoes';
import { servicoProjetos } from 'src/servicos/projetos';
import { ExecucaoDetalhe, RecursoDetalhe, RecursoResumo, ROTULO_STATUS_EXECUCAO, ROTULO_STATUS_RECURSO, SecaoExecucao } from 'src/types/projetos';
import { mensagemDeErro } from 'src/utils/erroApi';
import { normalizar } from 'src/utils/formatacao';
import { useSelector } from 'src/store/Store';

const ROTULOS_STATUS: Record<string, string> = { ...ROTULO_STATUS_RECURSO, ...ROTULO_STATUS_EXECUCAO };

/**
 * Projetos (old/js/04-projetos.js, 04b-projetos-telas.js): Lista de recursos → Recurso → Execução.
 * O nível aberto fica na URL (?recurso=ID ou ?execucao=ID&secao=…), então "voltar" do navegador funciona
 * e outras telas (Agenda, Kanban, Empresas) abrem direto o registro.
 */
const Projetos = () => {
  const { podeAlterar } = usePermissao();
  const { notificar } = useInteracao();
  const alterar = podeAlterar(PERMISSOES.PROJETO_ESCREVER);
  const [parametros, setParametros] = useSearchParams();
  const recursoId = Number(parametros.get('recurso')) || null;
  const execucaoId = Number(parametros.get('execucao')) || null;
  const secao = (parametros.get('secao') as SecaoExecucao) || 'resumo';

  const [filtro, setFiltro] = useState({ busca: '', status: '', arquivados: false });
  const lista = useConsulta(() => servicoProjetos.recursos(filtro.arquivados), [filtro.arquivados]);
  const [recurso, setRecurso] = useState<RecursoDetalhe | null>(null);
  const [execucao, setExecucao] = useState<ExecucaoDetalhe | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [novoRecurso, setNovoRecurso] = useState(false);
  const [novaExecucaoEm, setNovaExecucaoEm] = useState<RecursoResumo | null>(null);

  const ir = useCallback(
    (destino: { recurso?: number; execucao?: number; secao?: SecaoExecucao } | null) => {
      const p: Record<string, string> = {};
      if (destino?.recurso) p.recurso = String(destino.recurso);
      if (destino?.execucao) p.execucao = String(destino.execucao);
      if (destino?.secao && destino.secao !== 'resumo') p.secao = destino.secao;
      setParametros(p);
      window.scrollTo({ top: 0 });
    },
    [setParametros],
  );

  // Outra unidade em consulta: o registro aberto não vale mais, volta para a lista.
  const unidadeVisualizadaId = useSelector((st) => st.autenticacao.unidadeVisualizadaId);
  const unidadeAnterior = useRef(unidadeVisualizadaId);
  useEffect(() => {
    if (unidadeAnterior.current !== unidadeVisualizadaId) ir(null);
    unidadeAnterior.current = unidadeVisualizadaId;
  }, [unidadeVisualizadaId, ir]);

  // Carrega o nível aberto; ao voltar para a lista, atualiza os totais (a 1ª carga já é do useConsulta).
  const primeiraVez = useRef(true);
  useEffect(() => {
    let ativo = true;
    setErro(null);
    const carregar = execucaoId ? servicoProjetos.execucao(execucaoId) : recursoId ? servicoProjetos.recurso(recursoId) : null;
    if (!carregar) {
      setRecurso(null);
      setExecucao(null);
      if (!primeiraVez.current) lista.recarregar();
      primeiraVez.current = false;
      return;
    }
    primeiraVez.current = false;
    carregar
      .then((d) => {
        if (!ativo) return;
        if (execucaoId) setExecucao(d as ExecucaoDetalhe);
        else setRecurso(d as RecursoDetalhe);
      })
      .catch((x) => ativo && setErro(mensagemDeErro(x)));
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recursoId, execucaoId]);

  const recursos = useMemo(() => lista.dados ?? [], [lista.dados]);
  const statuses = useMemo(
    () => [...new Set(recursos.flatMap((r) => [r.status, ...r.execucoes.map((e) => e.status)]))].sort((a, b) => ROTULOS_STATUS[a].localeCompare(ROTULOS_STATUS[b], 'pt-BR')),
    [recursos],
  );
  const filtrados = useMemo(() => {
    const q = normalizar(filtro.busca);
    const bate = (...t: (string | null)[]) => !q || normalizar(t.join(' ')).includes(q);
    return recursos
      .map((r) => {
        const recursoBate = bate(r.nome, r.codigo, r.fonteRecurso, r.orgaoRepassador);
        let execucoes = filtro.status ? r.execucoes.filter((e) => e.status === filtro.status) : r.execucoes;
        if (!recursoBate) execucoes = execucoes.filter((e) => bate(e.nome, e.codigo));
        return { r: { ...r, execucoes }, recursoBate };
      })
      .filter(({ r, recursoBate }) => (recursoBate && (!filtro.status || r.status === filtro.status)) || r.execucoes.length)
      .map(({ r }) => r);
  }, [recursos, filtro]);

  let conteudo;
  if (erro) conteudo = <Alert severity="error">{erro}</Alert>;
  else if (execucaoId) {
    conteudo = execucao?.id === execucaoId ? (
      <TelaExecucao
        execucao={execucao}
        secao={secao}
        podeAlterar={alterar}
        podeRenovarDocumentos={podeAlterar(PERMISSOES.DOCUMENTO_ESCREVER)}
        aoTrocarSecao={(s) => ir({ execucao: execucaoId, secao: s })}
        aoAtualizar={setExecucao}
        aoIrPara={ir}
      />
    ) : (
      <LinearProgress />
    );
  } else if (recursoId) {
    conteudo = recurso?.id === recursoId ? (
      <TelaRecurso
        recurso={recurso}
        podeAlterar={alterar}
        aoAtualizar={setRecurso}
        aoAbrirExecucao={(id) => ir({ execucao: id })}
        aoExecucaoCriada={(e) => {
          setExecucao(e);
          ir({ execucao: e.id });
        }}
        aoVoltar={() => ir(null)}
      />
    ) : (
      <LinearProgress />
    );
  } else {
    conteudo = (
      <>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} mb={3} alignItems={{ md: 'center' }}>
          <TextField
            type="search"
            size="small"
            placeholder="Buscar recurso, execução ou código…"
            value={filtro.busca}
            onChange={(x) => setFiltro({ ...filtro, busca: x.target.value })}
            inputProps={{ 'aria-label': 'Buscar' }}
            sx={{ flexGrow: 1 }}
          />
          <TextField select size="small" value={filtro.status} onChange={(x) => setFiltro({ ...filtro, status: x.target.value })} sx={{ minWidth: 220 }} SelectProps={{ displayEmpty: true }} inputProps={{ 'aria-label': 'Filtrar por status' }}>
            <MenuItem value="">Todos os status</MenuItem>
            {statuses.map((s) => (
              <MenuItem key={s} value={s}>
                {ROTULOS_STATUS[s]}
              </MenuItem>
            ))}
          </TextField>
          <FormControlLabel control={<Switch checked={filtro.arquivados} onChange={(_, v) => setFiltro({ ...filtro, arquivados: v })} />} label="Arquivados" />
          {alterar ? (
            <Button variant="contained" startIcon={<IconPlus size={16} />} onClick={() => setNovoRecurso(true)} sx={{ flexShrink: 0 }}>
              Novo recurso
            </Button>
          ) : null}
        </Stack>
        {lista.carregando && !lista.dados ? <LinearProgress /> : null}
        {lista.erro ? <Alert severity="error">{lista.erro}</Alert> : null}
        {lista.dados ? (
          <ListaRecursos
            recursos={filtrados}
            total={recursos.length}
            podeAlterar={alterar}
            aoAbrirRecurso={(id) => ir({ recurso: id })}
            aoAbrirExecucao={(id) => ir({ execucao: id })}
            aoNovoRecurso={() => setNovoRecurso(true)}
            aoNovaExecucao={setNovaExecucaoEm}
          />
        ) : null}
      </>
    );
  }

  return (
    <Pagina>
      {conteudo}
      <FormularioRecurso
        aberto={novoRecurso}
        recurso={null}
        aoFechar={() => setNovoRecurso(false)}
        aoSalvar={(r) => {
          notificar('Recurso cadastrado.');
          setRecurso(r);
          ir({ recurso: r.id });
        }}
      />
      <FormularioExecucao
        aberto={!!novaExecucaoEm}
        execucao={null}
        recurso={novaExecucaoEm ? { id: novaExecucaoEm.id, nome: novaExecucaoEm.nome, fonteRecurso: novaExecucaoEm.fonteRecurso, responsavel: null, livre: novaExecucaoEm.financeiro.naoDistribuido } : null}
        aoFechar={() => setNovaExecucaoEm(null)}
        aoSalvar={(e) => {
          notificar('Execução cadastrada.');
          setExecucao(e);
          ir({ execucao: e.id });
        }}
      />
    </Pagina>
  );
};

export default Projetos;
